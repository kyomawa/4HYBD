import { Preferences } from "@capacitor/preferences";
import { PhotoData } from "./camera.service";

// Keys for storage
const PHOTOS_STORAGE_KEY = "photos";
const STORIES_STORAGE_KEY = "stories";

/**
 * Save a photo to storage
 * @param photo Photo data to save
 */
export const savePhoto = async (photo: PhotoData): Promise<void> => {
  try {
    if (photo.type === "story") {
      // Save as story - handled by story service
      return;
    }

    // Get existing photos
    const photos = await getPhotos();

    // Add new photo at the beginning of the array
    photos.unshift(photo);

    // Save updated photos array
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify(photos),
    });
  } catch (error) {
    console.error("Error saving photo:", error);
    throw error;
  }
};

/**
 * Get all photos from storage
 * @returns Array of photo data
 */
export const getPhotos = async (): Promise<PhotoData[]> => {
  try {
    const result = await Preferences.get({ key: PHOTOS_STORAGE_KEY });

    if (result.value) {
      const photos = JSON.parse(result.value);

      // Filter out stories if they were saved as photos
      return photos.filter((photo: PhotoData) => photo.type !== "story");
    }

    return [];
  } catch (error) {
    console.error("Error getting photos:", error);
    return [];
  }
};

/**
 * Delete a photo from storage
 * @param photoId ID of the photo to delete
 */
export const deletePhoto = async (photoId: string): Promise<void> => {
  try {
    // Get existing photos
    const photos = await getPhotos();

    // Filter out the photo to delete
    const updatedPhotos = photos.filter((photo) => photo.id !== photoId);

    // Save updated photos array
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify(updatedPhotos),
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw error;
  }
};

/**
 * Delete all photos from storage
 */
export const deleteAllPhotos = async (): Promise<void> => {
  try {
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify([]),
    });
  } catch (error) {
    console.error("Error deleting all photos:", error);
    throw error;
  }
};

/**
 * Get a single photo by ID
 * @param photoId ID of the photo to get
 * @returns Photo data or null if not found
 */
export const getPhotoById = async (photoId: string): Promise<PhotoData | null> => {
  try {
    const photos = await getPhotos();
    const photo = photos.find((p) => p.id === photoId);

    return photo || null;
  } catch (error) {
    console.error("Error getting photo by ID:", error);
    return null;
  }
};

/**
 * Get all photos with location data
 * @returns Array of photos with location data
 */
export const getPhotosWithLocation = async (): Promise<PhotoData[]> => {
  try {
    const photos = await getPhotos();
    return photos.filter((photo) => photo.location !== undefined);
  } catch (error) {
    console.error("Error getting photos with location:", error);
    return [];
  }
};

/**
 * Save app storage data to a file (for backup)
 * @returns JSON string with all app data
 */
export const exportAppData = async (): Promise<string> => {
  try {
    // Get all data from preferences
    const keys = [PHOTOS_STORAGE_KEY, STORIES_STORAGE_KEY, "users", "posts", "conversations", "messages"];

    const data: Record<string, any> = {};

    for (const key of keys) {
      const result = await Preferences.get({ key });
      if (result.value) {
        data[key] = JSON.parse(result.value);
      }
    }

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Error exporting app data:", error);
    throw error;
  }
};

/**
 * Import app data from a backup file
 * @param jsonData JSON string with app data
 */
export const importAppData = async (jsonData: string): Promise<void> => {
  try {
    const data = JSON.parse(jsonData);

    // Validate data
    if (!data) {
      throw new Error("Invalid backup data");
    }

    // Import data to preferences
    for (const [key, value] of Object.entries(data)) {
      await Preferences.set({
        key,
        value: JSON.stringify(value),
      });
    }
  } catch (error) {
    console.error("Error importing app data:", error);
    throw error;
  }
};

/**
 * Calculate total storage used by the app
 * @returns Storage usage in bytes
 */
export const getStorageUsage = async (): Promise<number> => {
  try {
    let totalSize = 0;

    // Get all photos
    const photos = await getPhotos();

    // Estimate size based on dataUrl
    for (const photo of photos) {
      if (photo.dataUrl) {
        // Rough estimate: Base64 string length * 0.75 gives byte size
        totalSize += photo.dataUrl.length * 0.75;
      } else {
        // If no dataUrl, estimate based on typical size
        totalSize += 500 * 1024; // 500 KB
      }
    }

    return totalSize;
  } catch (error) {
    console.error("Error getting storage usage:", error);
    return 0;
  }
};
