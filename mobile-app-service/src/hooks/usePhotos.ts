import { useState, useEffect } from "react";
import { getPhotos, deletePhoto, deleteAllPhotos } from "../services/storage.service";
import { PhotoData } from "../services/camera.service";
import { syncPendingUploads, syncPendingDeletions } from "../services/storage.service";

export const usePhotos = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "complete" | "error">("idle");

  // Load photos from storage and try to sync with server
  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get photos from storage
      const storedPhotos = await getPhotos();
      setPhotos(storedPhotos);

      // Try to sync with server if online
      if (navigator.onLine) {
        setSyncStatus("syncing");
        await syncPendingUploads();
        await syncPendingDeletions();

        // Refresh photos after sync
        const updatedPhotos = await getPhotos();
        setPhotos(updatedPhotos);
        setSyncStatus("complete");
      }
    } catch (err) {
      console.error("Error loading photos:", err);
      setError("Failed to load photos");
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Delete a single photo
  const removePhoto = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
      // Update the local state
      setPhotos((prevPhotos) => prevPhotos.filter((photo) => photo.id !== photoId));
      return true;
    } catch (err) {
      console.error("Error removing photo:", err);
      setError("Failed to delete photo");
      return false;
    }
  };

  // Clear all photos
  const clearAllPhotos = async () => {
    try {
      await deleteAllPhotos();
      setPhotos([]);
      return true;
    } catch (err) {
      console.error("Error clearing photos:", err);
      setError("Failed to clear photos");
      return false;
    }
  };

  // Attempt to sync photos when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      console.log("Device is back online, syncing photos...");
      setSyncStatus("syncing");
      try {
        await syncPendingUploads();
        await syncPendingDeletions();

        // Refresh photos after sync
        const updatedPhotos = await getPhotos();
        setPhotos(updatedPhotos);
        setSyncStatus("complete");
      } catch (err) {
        console.error("Error syncing photos:", err);
        setSyncStatus("error");
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Load photos on component mount
  useEffect(() => {
    loadPhotos();
  }, []);

  return {
    photos,
    loading,
    error,
    syncStatus,
    refreshPhotos: loadPhotos,
    removePhoto,
    clearAllPhotos,
  };
};

export default usePhotos;
