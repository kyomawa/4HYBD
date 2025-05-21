import { getAuthToken } from "./auth.service";
import { Preferences } from "@capacitor/preferences";
import { API_URL, API_ENDPOINTS } from "../config";

// Keys for storage
const MEDIA_CACHE_KEY = "media_cache";
const PENDING_UPLOADS_KEY = "pending_media_uploads";
const PENDING_DELETIONS_KEY = "pending_media_deletions";

/**
 * Interface representing media in the application
 */
export interface Media {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  duration?: number; // For videos (in seconds)
  size: number; // In bytes
  createdAt: number;
  userId: string;
  local?: boolean; // Indicates if the media is stored locally (not synced)
  localPath?: string; // Local path of the file waiting for sync
}

/**
 * Interface for a pending upload
 */
interface PendingUpload {
  id: string;
  path: string;
  type: "image" | "video";
  timestamp: number;
}

/**
 * Checks if the device is currently online
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Uploads media to the backend
 * @param path Path or URI of the media to upload
 * @param type Type of media (image or video)
 * @returns ID of the uploaded media
 */
export const uploadMedia = async (path: string, type: "image" | "video"): Promise<string> => {
  // If online, try to upload directly
  if (isOnline()) {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Convert path to Blob if it's a web URL
      let mediaBlob: Blob;
      if (path.startsWith("http") || path.startsWith("blob:")) {
        const response = await fetch(path);
        mediaBlob = await response.blob();
      } else {
        // For native paths, we would normally use plugins like Capacitor FileSystem
        // For now, a simple fetch which will work for web URLs
        const response = await fetch(path);
        mediaBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append("file", mediaBlob, `media.${type === "image" ? "jpg" : "mp4"}`);

      // Upload to the API
      const response = await fetch(`${API_URL}${API_ENDPOINTS.MEDIA.UPLOAD}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload media");
      }

      const data = await response.json();

      // Store the media in cache for local reference
      await cacheMedia({
        id: data.id,
        type: data.type,
        url: data.url,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration,
        size: data.size,
        createdAt: Date.now(),
        userId: data.user_id,
      });

      return data.url; // Return the URL of the uploaded media
    } catch (error) {
      console.error("Error uploading media:", error);

      // In case of error, store the media for later upload
      await addPendingUpload(path, type);

      // Generate a temporary URL for local use
      return path;
    }
  } else {
    // If offline, store the media for later upload
    await addPendingUpload(path, type);

    // Return the local path as URL for now
    return path;
  }
};

/**
 * Adds media to the list of pending uploads
 */
const addPendingUpload = async (path: string, type: "image" | "video"): Promise<void> => {
  try {
    const id = `pending_${Date.now()}`;
    const pendingUpload: PendingUpload = {
      id,
      path,
      type,
      timestamp: Date.now(),
    };

    const result = await Preferences.get({ key: PENDING_UPLOADS_KEY });
    const pendingUploads = result.value ? JSON.parse(result.value) : [];

    pendingUploads.push(pendingUpload);

    await Preferences.set({
      key: PENDING_UPLOADS_KEY,
      value: JSON.stringify(pendingUploads),
    });
  } catch (error) {
    console.error("Error adding pending upload:", error);
  }
};

/**
 * Synchronizes pending media uploads with the backend
 * Called when the device comes back online
 */
export const syncPendingUploads = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_UPLOADS_KEY });
    if (!result.value) return;

    const pendingUploads: PendingUpload[] = JSON.parse(result.value);
    if (pendingUploads.length === 0) return;

    const successfulUploads: string[] = [];

    for (const upload of pendingUploads) {
      try {
        await uploadMedia(upload.path, upload.type);
        successfulUploads.push(upload.id);
      } catch (error) {
        console.error(`Error syncing media ${upload.id}:`, error);
      }
    }

    // Remove successful uploads from pending
    if (successfulUploads.length > 0) {
      const remainingUploads = pendingUploads.filter((upload) => !successfulUploads.includes(upload.id));

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
 * Stores a media in the local cache
 */
const cacheMedia = async (media: Media): Promise<void> => {
  try {
    const result = await Preferences.get({ key: MEDIA_CACHE_KEY });
    const cachedMedia = result.value ? JSON.parse(result.value) : {};

    cachedMedia[media.id] = media;

    await Preferences.set({
      key: MEDIA_CACHE_KEY,
      value: JSON.stringify(cachedMedia),
    });
  } catch (error) {
    console.error("Error caching media:", error);
  }
};

/**
 * Retrieves media from the cache or backend
 * @param mediaId ID of the media to retrieve
 * @returns Media data or null if not found
 */
export const getMedia = async (mediaId: string): Promise<Media | null> => {
  try {
    // First check local cache
    const result = await Preferences.get({ key: MEDIA_CACHE_KEY });
    const cachedMedia = result.value ? JSON.parse(result.value) : {};

    if (cachedMedia[mediaId]) {
      return cachedMedia[mediaId];
    }

    // If not in cache and online, try to retrieve from backend
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.MEDIA.BY_ID(mediaId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch media: ${mediaId}`);
        }

        const data = await response.json();

        const media: Media = {
          id: data._id || data.id,
          type: data.type,
          url: data.url,
          thumbnailUrl: data.thumbnail_url,
          duration: data.duration,
          size: data.size,
          createdAt: new Date(data.created_at).getTime(),
          userId: data.user_id,
        };

        // Cache for future use
        await cacheMedia(media);

        return media;
      } catch (error) {
        console.error(`Error fetching media ${mediaId}:`, error);
        return null;
      }
    }

    // If offline and not in cache, we can't retrieve it
    return null;
  } catch (error) {
    console.error(`Error getting media ${mediaId}:`, error);
    return null;
  }
};

/**
 * Deletes media from the backend
 * @param mediaId ID of the media to delete
 * @returns Status of the deletion
 */
export const deleteMedia = async (mediaId: string): Promise<boolean> => {
  try {
    // If online, try to delete from backend
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.MEDIA.BY_ID(mediaId)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Also remove from local cache
          await removeFromCache(mediaId);
          return true;
        }

        // If API failed, still try to remove locally
        await removeFromCache(mediaId);
        return false;
      } catch (error) {
        console.error(`Error deleting media ${mediaId}:`, error);
        // In case of error, remove from local cache anyway
        await removeFromCache(mediaId);
        return false;
      }
    } else {
      // If offline, remove from local cache
      await removeFromCache(mediaId);
      // Mark for deletion when back online
      await markForDeletion(mediaId);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting media ${mediaId}:`, error);
    return false;
  }
};

/**
 * Removes media from local cache
 */
const removeFromCache = async (mediaId: string): Promise<void> => {
  try {
    const result = await Preferences.get({ key: MEDIA_CACHE_KEY });
    if (!result.value) return;

    const cachedMedia = JSON.parse(result.value);

    if (cachedMedia[mediaId]) {
      delete cachedMedia[mediaId];

      await Preferences.set({
        key: MEDIA_CACHE_KEY,
        value: JSON.stringify(cachedMedia),
      });
    }
  } catch (error) {
    console.error(`Error removing media ${mediaId} from cache:`, error);
  }
};

/**
 * Marks media for deletion when back online
 */
const markForDeletion = async (mediaId: string): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_DELETIONS_KEY });
    const pendingDeletions = result.value ? JSON.parse(result.value) : [];

    if (!pendingDeletions.includes(mediaId)) {
      pendingDeletions.push(mediaId);

      await Preferences.set({
        key: PENDING_DELETIONS_KEY,
        value: JSON.stringify(pendingDeletions),
      });
    }
  } catch (error) {
    console.error(`Error marking media ${mediaId} for deletion:`, error);
  }
};

/**
 * Synchronizes pending media deletions with the backend
 * Called when the device comes back online
 */
export const syncPendingDeletions = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_DELETIONS_KEY });
    if (!result.value) return;

    const pendingDeletions: string[] = JSON.parse(result.value);
    if (pendingDeletions.length === 0) return;

    const successfulDeletions: string[] = [];

    for (const mediaId of pendingDeletions) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.MEDIA.BY_ID(mediaId)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          successfulDeletions.push(mediaId);
        }
      } catch (error) {
        console.error(`Error syncing deletion for media ${mediaId}:`, error);
      }
    }

    // Remove successful deletions from pending
    if (successfulDeletions.length > 0) {
      const remainingDeletions = pendingDeletions.filter((mediaId) => !successfulDeletions.includes(mediaId));

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
 * Helper function to extract media ID from URL
 * @param url Media URL
 * @returns Media ID or null if not found
 */
export const extractMediaIdFromUrl = (url: string): string | null => {
  // Example pattern: http://localhost:9000/snapshoot-media/media_12345.jpg
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const filename = pathParts[pathParts.length - 1];

    // Try to extract ID from filename
    const match = filename.match(/([a-zA-Z0-9-_]+)\.[a-zA-Z0-9]+/);
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
 * Helper to convert a data URL to a Blob
 * @param dataUrl Data URL to convert
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
 * Gets all cached media
 * @returns Object with media IDs as keys and media objects as values
 */
export const getAllCachedMedia = async (): Promise<Record<string, Media>> => {
  try {
    const result = await Preferences.get({ key: MEDIA_CACHE_KEY });
    return result.value ? JSON.parse(result.value) : {};
  } catch (error) {
    console.error("Error getting all cached media:", error);
    return {};
  }
};

/**
 * Clears the media cache
 */
export const clearMediaCache = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: MEDIA_CACHE_KEY });
  } catch (error) {
    console.error("Error clearing media cache:", error);
  }
};

/**
 * Checks if a media ID exists in the cache
 * @param mediaId Media ID to check
 * @returns True if the media exists in cache, false otherwise
 */
export const mediaExistsInCache = async (mediaId: string): Promise<boolean> => {
  try {
    const result = await Preferences.get({ key: MEDIA_CACHE_KEY });
    const cachedMedia = result.value ? JSON.parse(result.value) : {};
    return !!cachedMedia[mediaId];
  } catch (error) {
    console.error(`Error checking if media ${mediaId} exists in cache:`, error);
    return false;
  }
};

/**
 * Set up event listeners for connectivity changes
 */
const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing media uploads and deletions...");
    await syncPendingUploads();
    await syncPendingDeletions();
  });
};

// Initialize connectivity listeners
setupConnectivityListeners();