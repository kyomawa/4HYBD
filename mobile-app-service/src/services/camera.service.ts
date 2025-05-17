import { Camera, CameraResultType, CameraSource, Photo, CameraOptions } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { v4 as uuidv4 } from "uuid";
import { savePhoto } from "./storage.service";
import { getCurrentLocation } from "./location.service";

// Use crypto.randomUUID or Math.random as a fallback for uuid
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

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
  expireAt?: number; // For stories
}

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
    let locationData = null;

    // Get location if requested
    if (withLocation) {
      try {
        // Utiliser getCurrentLocation au lieu de Geolocation directement
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
      id: generateUUID(), // Utiliser generateUUID au lieu de uuidv4
      webPath: photo.webPath || "",
      timestamp: now,
      dataUrl: photo.dataUrl,
      location: locationData || undefined,
      type,
      // Stories expire after 24 hours
      expireAt: type === "story" ? now + 24 * 60 * 60 * 1000 : undefined,
    };

    // Save photo to storage
    await savePhoto(photoData);

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
