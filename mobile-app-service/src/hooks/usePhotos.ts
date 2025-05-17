import { useState, useEffect } from "react";
import { getPhotos, deletePhoto, deleteAllPhotos } from "../services/storage.service";
import { PhotoData } from "../services/camera.service";

export const usePhotos = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load photos from storage
  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      const storedPhotos = await getPhotos();
      setPhotos(storedPhotos);
    } catch (err) {
      console.error("Error loading photos:", err);
      setError("Failed to load photos");
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

  // Load photos on component mount
  useEffect(() => {
    loadPhotos();
  }, []);

  return {
    photos,
    loading,
    error,
    refreshPhotos: loadPhotos,
    removePhoto,
    clearAllPhotos,
  };
};

export default usePhotos;
