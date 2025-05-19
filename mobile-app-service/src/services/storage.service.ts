import { Preferences } from "@capacitor/preferences";
import { PhotoData } from "./camera.service";
import { getAuthToken } from "./auth.service";
import { API_URL, API_ENDPOINTS } from "../config";

// Keys for storage
const PHOTOS_STORAGE_KEY = "photos";
const PENDING_UPLOADS_KEY = "pending_photo_uploads";
const PENDING_DELETIONS_KEY = "pending_photo_deletions";

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Save a photo to storage
 * @param photo Photo data to save
 */
export const savePhoto = async (photo: PhotoData): Promise<void> => {
  try {
    // Get existing photos
    const photos = await getPhotos();

    // Add new photo at the beginning of the array
    photos.unshift(photo);

    // Save updated photos array
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify(photos),
    });

    // If photo doesn't have a serverUrl, add to pending uploads for later sync
    if (!photo.serverUrl && photo.type !== "story") {
      await addToPendingUploads(photo);
    }
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

      // Filter out expired stories
      const now = Date.now();
      return photos.filter((photo: PhotoData) => {
        // Keep regular photos or stories that haven't expired
        return photo.type !== "story" || (photo.expireAt && photo.expireAt > now);
      });
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

    // Find the photo to delete
    const photoToDelete = photos.find((photo) => photo.id === photoId);
    if (!photoToDelete) {
      throw new Error(`Photo with ID ${photoId} not found`);
    }

    // Filter out the photo to delete
    const updatedPhotos = photos.filter((photo) => photo.id !== photoId);

    // Save updated photos array
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify(updatedPhotos),
    });

    // If photo has a server URL, mark for deletion on the server
    if (photoToDelete.serverUrl && isOnline()) {
      try {
        await deletePhotoFromServer(photoToDelete.serverUrl);
      } catch (error) {
        console.error("Error deleting photo from server:", error);
        // If failed to delete from server, add to pending deletions
        await addToPendingDeletions(photoToDelete.serverUrl);
      }
    } else if (photoToDelete.serverUrl) {
      // If offline, add to pending deletions
      await addToPendingDeletions(photoToDelete.serverUrl);
    }
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw error;
  }
};

/**
 * Add a photo to pending uploads queue
 * @param photo Photo data to add to queue
 */
const addToPendingUploads = async (photo: PhotoData): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_UPLOADS_KEY });
    const pendingUploads = result.value ? JSON.parse(result.value) : [];

    // Check if photo is already in queue
    if (!pendingUploads.some((p: PhotoData) => p.id === photo.id)) {
      pendingUploads.push(photo);
      await Preferences.set({
        key: PENDING_UPLOADS_KEY,
        value: JSON.stringify(pendingUploads),
      });
    }
  } catch (error) {
    console.error("Error adding photo to pending uploads:", error);
  }
};

/**
 * Add a server URL to pending deletions queue
 * @param serverUrl Server URL to add to queue
 */
const addToPendingDeletions = async (serverUrl: string): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_DELETIONS_KEY });
    const pendingDeletions = result.value ? JSON.parse(result.value) : [];

    // Check if URL is already in queue
    if (!pendingDeletions.includes(serverUrl)) {
      pendingDeletions.push(serverUrl);
      await Preferences.set({
        key: PENDING_DELETIONS_KEY,
        value: JSON.stringify(pendingDeletions),
      });
    }
  } catch (error) {
    console.error("Error adding URL to pending deletions:", error);
  }
};

/**
 * Delete all photos from storage
 */
export const deleteAllPhotos = async (): Promise<void> => {
  try {
    // Get existing photos to find those with server URLs
    const photos = await getPhotos();
    const serverUrls = photos.filter((photo) => photo.serverUrl).map((photo) => photo.serverUrl as string);

    // Delete from storage
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify([]),
    });

    // Clear pending uploads
    await Preferences.set({
      key: PENDING_UPLOADS_KEY,
      value: JSON.stringify([]),
    });

    // Try to delete from server if online
    if (isOnline() && serverUrls.length > 0) {
      try {
        await Promise.all(serverUrls.map((url) => deletePhotoFromServer(url)));
      } catch (error) {
        console.error("Error deleting photos from server:", error);
        // Add failed deletions to pending
        await Preferences.set({
          key: PENDING_DELETIONS_KEY,
          value: JSON.stringify(serverUrls),
        });
      }
    } else if (serverUrls.length > 0) {
      // If offline, add all to pending deletions
      const result = await Preferences.get({ key: PENDING_DELETIONS_KEY });
      const pendingDeletions = result.value ? JSON.parse(result.value) : [];

      // Merge and deduplicate
      const newPendingDeletions = [...new Set([...pendingDeletions, ...serverUrls])];

      await Preferences.set({
        key: PENDING_DELETIONS_KEY,
        value: JSON.stringify(newPendingDeletions),
      });
    }
  } catch (error) {
    console.error("Error deleting all photos:", error);
    throw error;
  }
};

/**
 * Delete a photo from the server
 * @param serverUrl URL of the photo on the server
 */
const deletePhotoFromServer = async (serverUrl: string): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Extract the media ID from the URL
    const mediaId = extractMediaIdFromUrl(serverUrl);
    if (!mediaId) {
      throw new Error("Invalid server URL");
    }

    // Delete from server
    const response = await fetch(`${API_URL}${API_ENDPOINTS.MEDIA.BY_ID(mediaId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete photo from server");
    }
  } catch (error) {
    console.error("Error deleting photo from server:", error);
    throw error;
  }
};

/**
 * Extract the media ID from a server URL
 * @param url Server URL
 * @returns Media ID or null if not found
 */
const extractMediaIdFromUrl = (url: string): string | null => {
  // Example pattern: http://localhost:9000/snapshoot-media/media_12345.jpg
  // or http://localhost/minio/api/snapshoot-media/media_12345.jpg
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const filename = pathParts[pathParts.length - 1];

    // Try to extract ID from filename
    const match = filename.match(/media_([a-zA-Z0-9-_]+)\.[a-zA-Z0-9]+/);
    if (match && match[1]) {
      return match[1];
    }

    // Fallback: return the whole filename minus the extension
    return filename.split(".")[0];
  } catch (error) {
    console.error("Error extracting media ID:", error);
    return null;
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
 * Sync pending photo uploads with the server
 */
export const syncPendingUploads = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_UPLOADS_KEY });
    if (!result.value) return;

    const pendingUploads: PhotoData[] = JSON.parse(result.value);
    if (pendingUploads.length === 0) return;

    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const successfulUploads: string[] = [];
    const allPhotos = await getPhotos();

    for (const photoToUpload of pendingUploads) {
      try {
        // Check if photo still exists in storage
        const photoInStorage = allPhotos.find((p) => p.id === photoToUpload.id);
        if (!photoInStorage) {
          // Photo was deleted, mark as successful to remove from queue
          successfulUploads.push(photoToUpload.id);
          continue;
        }

        // Upload photo to server
        let photoBlob: Blob;
        if (photoToUpload.dataUrl) {
          // Import the function dynamically to avoid circular dependencies
          const { dataUrlToBlob } = await import("./camera.service");
          photoBlob = dataUrlToBlob(photoToUpload.dataUrl);
        } else if (photoToUpload.webPath) {
          const response = await fetch(photoToUpload.webPath);
          photoBlob = await response.blob();
        } else {
          // Skip if no photo data
          successfulUploads.push(photoToUpload.id);
          continue;
        }

        // Create form data
        const formData = new FormData();
        formData.append("file", photoBlob, `photo_${photoToUpload.id}.jpg`);

        // Add location if available
        if (photoToUpload.location) {
          formData.append("type", "Point");
          formData.append(
            "coordinates",
            JSON.stringify([photoToUpload.location.longitude, photoToUpload.location.latitude])
          );
        }

        // Upload
        const response = await fetch(`${API_URL}${API_ENDPOINTS.MEDIA.UPLOAD}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload photo");
        }

        const data = await response.json();

        // Update photo in storage with server URL
        const photoIndex = allPhotos.findIndex((p) => p.id === photoToUpload.id);
        if (photoIndex !== -1) {
          allPhotos[photoIndex].serverUrl = data.url;

          // Save updated photos
          await Preferences.set({
            key: PHOTOS_STORAGE_KEY,
            value: JSON.stringify(allPhotos),
          });
        }

        // Mark as successful
        successfulUploads.push(photoToUpload.id);
      } catch (error) {
        console.error(`Error uploading photo ${photoToUpload.id}:`, error);
      }
    }

    // Remove successful uploads from pending
    if (successfulUploads.length > 0) {
      const remainingUploads = pendingUploads.filter((photo) => !successfulUploads.includes(photo.id));

      await Preferences.set({
        key: PENDING_UPLOADS_KEY,
        value: JSON.stringify(remainingUploads),
      });
    }
  } catch (error) {
    console.error("Error syncing pending uploads:", error);
  }
};

/**
 * Sync pending photo deletions with the server
 */
export const syncPendingDeletions = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_DELETIONS_KEY });
    if (!result.value) return;

    const pendingDeletions: string[] = JSON.parse(result.value);
    if (pendingDeletions.length === 0) return;

    const successfulDeletions: string[] = [];

    for (const serverUrl of pendingDeletions) {
      try {
        await deletePhotoFromServer(serverUrl);
        successfulDeletions.push(serverUrl);
      } catch (error) {
        console.error(`Error deleting photo ${serverUrl} from server:`, error);
      }
    }

    // Remove successful deletions from pending
    if (successfulDeletions.length > 0) {
      const remainingDeletions = pendingDeletions.filter((url) => !successfulDeletions.includes(url));

      await Preferences.set({
        key: PENDING_DELETIONS_KEY,
        value: JSON.stringify(remainingDeletions),
      });
    }
  } catch (error) {
    console.error("Error syncing pending deletions:", error);
  }
};

/**
 * Set up connectivity listeners for auto-syncing
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing photos...");
    await syncPendingUploads();
    await syncPendingDeletions();
  });
};

// Initialize connectivity listeners
setupConnectivityListeners();
