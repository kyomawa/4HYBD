import { Camera, CameraResultType, CameraSource, Photo, CameraOptions } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { getCurrentLocation } from "./location.service";

// Clé pour stocker les photos simulées en mode web
const WEB_MOCK_PHOTOS_KEY = "web_mock_photos";

export interface PhotoOptions extends Partial<CameraOptions> {
  source?: CameraSource;
  withLocation?: boolean;
}

export interface PhotoData {
  id: string;
  webPath: string;
  timestamp: number;
  dataUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  type: "photo" | "story";
  expireAt?: number; // Pour les stories
  serverUrl?: string; // URL sur le serveur après upload
}

/**
 * Vérifie si l'application s'exécute sur le web
 */
const isRunningOnWeb = (): boolean => {
  return Capacitor.getPlatform() === "web";
};

/**
 * Génère un ID unique
 */
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Retourne une image simulée pour les tests sur le web
 */
const getMockWebPhoto = async (): Promise<Photo> => {
  // Utiliser une image de placeholder
  const mockPhotoUrl = "https://picsum.photos/800/600";

  try {
    // Télécharger l'image
    const response = await fetch(mockPhotoUrl);
    const blob = await response.blob();

    // Convertir en dataURL
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
    });

    reader.readAsDataURL(blob);
    const dataUrl = await dataUrlPromise;

    // Créer un objet URL pour le webPath
    const webPath = URL.createObjectURL(blob);

    return {
      webPath,
      dataUrl,
      format: "jpeg",
      saved: false,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'image simulée:", error);
    throw new Error("Impossible de simuler une photo sur le web");
  }
};

/**
 * Sauvegarde une photo simulée pour le web
 */
const saveWebMockPhoto = async (photo: PhotoData): Promise<void> => {
  try {
    const result = await Preferences.get({ key: WEB_MOCK_PHOTOS_KEY });
    const photos = result.value ? JSON.parse(result.value) : [];

    photos.push(photo);

    await Preferences.set({
      key: WEB_MOCK_PHOTOS_KEY,
      value: JSON.stringify(photos),
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la photo simulée:", error);
  }
};

/**
 * Take a picture using the device camera
 * @param options Camera options
 * @returns Promise with the photo data
 */
export const takePicture = async (options: PhotoOptions = {}): Promise<Photo> => {
  // Set default options
  const defaultOptions: CameraOptions = {
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    saveToGallery: false,
    correctOrientation: true,
    width: 1200,
    height: 1600,
    presentationStyle: "fullscreen",
    source: CameraSource.Camera,
    // Désactiver l'interface de prévisualisation
    promptLabelHeader: "",
    promptLabelCancel: "",
    promptLabelPhoto: "",
    promptLabelPicture: "",
  };

  // Merge default options with provided options
  const cameraOptions: CameraOptions = { ...defaultOptions, ...options };

  try {
    // Si nous sommes sur le web, utiliser l'approche de simulation
    if (isRunningOnWeb()) {
      console.log("Exécution sur le Web - utilisation d'une photo simulée");
      return await getMockWebPhoto();
    }

    // Request camera permissions
    const permissionStatus = await Camera.checkPermissions();

    if (permissionStatus.camera !== "granted") {
      await Camera.requestPermissions();
    }

    // Take the picture using native camera
    const photo = await Camera.getPhoto({
      ...cameraOptions,
      // Forcer l'utilisation de la caméra native
      source: CameraSource.Camera,
    });

    // If we're on the web platform, we need to get a dataUrl for storage
    if (Capacitor.getPlatform() === "web") {
      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const reader = new FileReader();

        const dataUrlPromise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            photo.dataUrl = reader.result as string;
            resolve(photo.dataUrl);
          };
        });

        reader.readAsDataURL(blob);
        await dataUrlPromise;
      }
    }

    return photo;
  } catch (error) {
    console.error("Error taking picture:", error);

    // Si nous sommes sur le web et qu'il y a une erreur, essayer de simuler une photo
    if (isRunningOnWeb()) {
      console.log("Tentative de simulation d'une photo sur le web après erreur");
      return await getMockWebPhoto();
    }

    throw error;
  }
};

/**
 * Create a photo with location data
 * @param photo The photo taken with the camera
 * @param withLocation Whether to include location data
 * @param type The type of photo (regular or story)
 * @returns Promise with the photo data
 */
export const createPhotoWithLocation = async (
  photo: Photo,
  withLocation: boolean = false,
  type: "photo" | "story" = "photo"
): Promise<PhotoData> => {
  try {
    let locationData = undefined;

    // Get location if requested
    if (withLocation) {
      try {
        const location = await getCurrentLocation();
        if (location) {
          locationData = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          };
        }
      } catch (locationError) {
        console.error("Error getting location:", locationError);
        // Continue without location if there was an error
      }
    }

    // Create photo data object
    const now = Date.now();
    const photoData: PhotoData = {
      id: generateUUID(),
      webPath: photo.webPath || "",
      timestamp: now,
      dataUrl: photo.dataUrl,
      location: locationData,
      type,
      // Stories expire after 24 hours
      expireAt: type === "story" ? now + 24 * 60 * 60 * 1000 : undefined,
    };

    // Si nous sommes sur le web, sauvegarder dans les photos simulées
    if (isRunningOnWeb()) {
      await saveWebMockPhoto(photoData);
    } else {
      // Save photo to storage si non-web (implémenté dans savePhoto du service storage)
      const { savePhoto } = await import("./storage.service");
      await savePhoto(photoData);
    }

    return photoData;
  } catch (error) {
    console.error("Error creating photo with location:", error);
    throw error;
  }
};

/**
 * Convert a dataUrl to a blob
 * @param dataUrl The dataUrl to convert
 * @returns Blob object
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

/**
 * Simuler un téléchargement de photo vers le serveur
 */
export const uploadPhotoToServer = async (photoData: PhotoData): Promise<string | null> => {
  try {
    // Simuler un délai réseau
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Créer une URL de serveur simulée
    const serverUrl = `http://localhost:9000/snapshoot-media/media_${photoData.id}.jpg`;

    // Mettre à jour la photo avec l'URL du serveur
    const photos = await getPhotos();
    const photoIndex = photos.findIndex((p) => p.id === photoData.id);

    if (photoIndex !== -1) {
      photos[photoIndex].serverUrl = serverUrl;

      // Sauvegarder les photos mises à jour
      await savePhotos(photos);
    }

    return serverUrl;
  } catch (error) {
    console.error("Erreur lors du téléchargement de la photo vers le serveur:", error);
    return null;
  }
};

/**
 * Obtenir toutes les photos stockées
 */
export const getPhotos = async (): Promise<PhotoData[]> => {
  try {
    if (isRunningOnWeb()) {
      // Obtenir les photos simulées sur le web
      const result = await Preferences.get({ key: WEB_MOCK_PHOTOS_KEY });
      return result.value ? JSON.parse(result.value) : [];
    } else {
      // Utiliser le service de stockage normal
      const { getPhotos: getStoragePhotos } = await import("./storage.service");
      return await getStoragePhotos();
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des photos:", error);
    return [];
  }
};

/**
 * Sauvegarder toutes les photos
 */
export const savePhotos = async (photos: PhotoData[]): Promise<void> => {
  try {
    if (isRunningOnWeb()) {
      // Sauvegarder les photos simulées sur le web
      await Preferences.set({
        key: WEB_MOCK_PHOTOS_KEY,
        value: JSON.stringify(photos),
      });
    } else {
      // Implémenter si nécessaire pour les plateformes natives
      // Cette fonction est généralement traitée par le storage.service
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des photos:", error);
  }
};
