import { Camera, CameraResultType, CameraSource, Photo, CameraOptions } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { getAuthToken } from "./auth.service";
import { savePhoto } from "./storage.service";
import { getCurrentLocation } from "./location.service";
import { API_URL, API_ENDPOINTS, APP_CONFIG } from "../config";

// Generate a UUID for photo identification
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
  serverUrl?: string; // URL on the server after upload
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
    // Disable preview interface
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
      // Force using native camera
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
 * Create a photo with location data and save it
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

    // Generate photo data
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

    // Try to upload to server if online
    if (navigator.onLine) {
      try {
        // Upload to server and get the server URL
        const serverUrl = await uploadPhotoToServer(photoData);
        if (serverUrl) {
          photoData.serverUrl = serverUrl;
        }
      } catch (error) {
        console.error("Error uploading photo to server:", error);
        // Continue with local storage only
      }
    }

    // Save photo to local storage
    await savePhoto(photoData);

    return photoData;
  } catch (error) {
    console.error("Error creating photo with location:", error);
    throw error;
  }
};

/**
 * Upload a photo to the server
 * @param photoData The photo data to upload
 * @returns Promise with the server URL of the uploaded photo
 */
export const uploadPhotoToServer = async (photoData: PhotoData): Promise<string | null> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Convert data URL or web path to Blob
    let photoBlob: Blob;
    if (photoData.dataUrl) {
      photoBlob = dataUrlToBlob(photoData.dataUrl);
    } else if (photoData.webPath) {
      const response = await fetch(photoData.webPath);
      photoBlob = await response.blob();
    } else {
      throw new Error("No photo data available for upload");
    }

    // Create form data for the upload
    const formData = new FormData();
    formData.append("file", photoBlob, `photo_${photoData.id}.jpg`);

    // Add location data if available
    if (photoData.location) {
      formData.append("type", "Point");
      formData.append("coordinates", JSON.stringify([photoData.location.longitude, photoData.location.latitude]));
    }

    // Upload to the server
    const endpoint =
      photoData.type === "story"
        ? `${API_URL}${API_ENDPOINTS.STORIES.CREATE}/media`
        : `${API_URL}${API_ENDPOINTS.MEDIA.UPLOAD}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to upload photo");
    }

    const data = await response.json();

    // Return the media URL from the response
    return photoData.type === "story" ? data.story.media.url : data.url;
  } catch (error) {
    console.error("Error uploading photo to server:", error);
    return null;
  }
};

/**
 * Convert a dataUrl to a Blob
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
 * Get image dimensions from a data URL
 * @param dataUrl The data URL of the image
 * @returns Promise with the width and height of the image
 */
export const getImageDimensions = async (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    img.src = dataUrl;
  });
};

/**
 * Resize an image to fit within the specified max width and height
 * @param dataUrl The data URL of the image
 * @param maxWidth Maximum width
 * @param maxHeight Maximum height
 * @returns Promise with the resized image as a data URL
 */
export const resizeImage = async (
  dataUrl: string,
  maxWidth: number = 1200,
  maxHeight: number = 1600
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for resizing"));
    };
    img.src = dataUrl;
  });
};

/**
 * Check if image size exceeds the maximum allowed
 * @param dataUrl The data URL of the image
 * @returns Promise with boolean indicating if the image is too large
 */
export const isImageTooLarge = async (dataUrl: string): Promise<boolean> => {
  try {
    const MAX_SIZE = APP_CONFIG.MAX_MEDIA_SIZE; // From config.ts

    // Calculate the size from the data URL
    // Base64 string is about 4/3 the size of the binary data
    const base64Data = dataUrl.split(",")[1];
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);

    return sizeInBytes > MAX_SIZE;
  } catch (error) {
    console.error("Error checking image size:", error);
    return false;
  }
};
