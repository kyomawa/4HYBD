import { getAuthToken } from "./auth.service";
import { Preferences } from "@capacitor/preferences";
import { API_URL } from "../config";

// Clés pour le stockage en cache
const MEDIA_CACHE_KEY = "media_cache";
const PENDING_UPLOADS_KEY = "pending_media_uploads";

/**
 * Interface représentant un média dans l'application
 */
export interface Media {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  duration?: number; // Pour les vidéos (en secondes)
  size: number; // En octets
  createdAt: number;
  userId: string;
  local?: boolean; // Indique si le média est stocké localement (non synchronisé)
  localPath?: string; // Chemin local du fichier en attendant la synchronisation
}

/**
 * Interface pour un média en attente d'upload
 */
interface PendingUpload {
  id: string;
  path: string;
  type: "image" | "video";
  timestamp: number;
}

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Télécharge un média vers le backend
 * @param path Chemin ou URI du média à télécharger
 * @param type Type du média (image ou vidéo)
 * @returns ID du média téléchargé
 */
export const uploadMedia = async (path: string, type: "image" | "video"): Promise<string> => {
  // Si on est en ligne, on essaie d'uploader directement
  if (isOnline()) {
    try {
      const token = await getAuthToken();

      // Convertir le chemin en Blob si c'est une URL web
      let mediaBlob;
      if (path.startsWith("http") || path.startsWith("blob:")) {
        const response = await fetch(path);
        mediaBlob = await response.blob();
      } else {
        // Pour les chemins natifs, on devrait utiliser des plugins spéciaux
        // comme Capacitor FileSystem pour lire les fichiers natifs
        // Cette partie sera à adapter selon l'environnement
        // Pour l'instant, on fait un fetch simple qui fonctionnera pour les URLs web
        const response = await fetch(path);
        mediaBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append("file", mediaBlob, `media.${type === "image" ? "jpg" : "mp4"}`);
      formData.append("type", type);

      const response = await fetch(`${API_URL}/api/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload media");
      }

      const data = await response.json();

      // Stocker le média dans le cache pour référence locale
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

      return data.id;
    } catch (error) {
      console.error("Error uploading media:", error);

      // En cas d'erreur, on stocke le média en attente pour upload ultérieur
      await addPendingUpload(path, type);

      // Générer un ID temporaire pour usage local
      return `temp_${Date.now()}`;
    }
  } else {
    // Si on est hors ligne, on stocke le média en attente
    await addPendingUpload(path, type);

    // Générer un ID temporaire pour usage local
    return `temp_${Date.now()}`;
  }
};

/**
 * Ajoute un média à la liste des uploads en attente
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
 * Synchronise les médias en attente avec le backend
 * À appeler quand l'appareil se reconnecte
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

    // Supprimer les uploads réussis de la liste
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
 * Stocke un média dans le cache local
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
 * Récupère un média depuis le cache ou le backend
 * @param mediaId ID du média à récupérer
 * @returns Données du média
 */
export const getMedia = async (mediaId: string): Promise<Media | null> => {
  try {
    // Vérifier d'abord dans le cache local
    const result = await Preferences.get({ key: MEDIA_CACHE_KEY });
    const cachedMedia = result.value ? JSON.parse(result.value) : {};

    if (cachedMedia[mediaId]) {
      return cachedMedia[mediaId];
    }

    // Si le média n'est pas en cache et qu'on est en ligne, essayer de le récupérer du backend
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/media/${mediaId}`, {
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

        // Mettre en cache pour les prochaines utilisations
        await cacheMedia(media);

        return media;
      } catch (error) {
        console.error(`Error fetching media ${mediaId}:`, error);
        return null;
      }
    }

    // Si on est hors ligne et que le média n'est pas en cache, on ne peut pas le récupérer
    return null;
  } catch (error) {
    console.error(`Error getting media ${mediaId}:`, error);
    return null;
  }
};

/**
 * Supprime un média du backend
 * @param mediaId ID du média à supprimer
 * @returns Statut de suppression
 */
export const deleteMedia = async (mediaId: string): Promise<boolean> => {
  try {
    // Si on est en ligne, essayer de supprimer du backend
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/media/${mediaId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Supprimer également du cache local
          await removeFromCache(mediaId);
          return true;
        }

        // Si l'API a échoué, on essaie quand même de supprimer localement
        await removeFromCache(mediaId);
        return false;
      } catch (error) {
        console.error(`Error deleting media ${mediaId}:`, error);
        // En cas d'erreur, supprimer du cache local quand même
        await removeFromCache(mediaId);
        return false;
      }
    } else {
      // Si on est hors ligne, on supprime seulement du cache local
      await removeFromCache(mediaId);
      // Marquer pour suppression ultérieure quand on sera en ligne
      await markForDeletion(mediaId);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting media ${mediaId}:`, error);
    return false;
  }
};

/**
 * Supprime un média du cache local
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
 * Marque un média pour suppression ultérieure quand on sera en ligne
 */
const markForDeletion = async (mediaId: string): Promise<void> => {
  try {
    const PENDING_DELETIONS_KEY = "pending_media_deletions";

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
 * Synchronise les suppressions de médias en attente avec le backend
 * À appeler quand l'appareil se reconnecte
 */
export const syncPendingDeletions = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const PENDING_DELETIONS_KEY = "pending_media_deletions";

    const result = await Preferences.get({ key: PENDING_DELETIONS_KEY });
    if (!result.value) return;

    const pendingDeletions: string[] = JSON.parse(result.value);
    if (pendingDeletions.length === 0) return;

    const successfulDeletions: string[] = [];

    for (const mediaId of pendingDeletions) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/media/${mediaId}`, {
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

    // Supprimer les suppressions réussies de la liste
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
 * Met en place les écouteurs d'événements pour la connectivité réseau
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing media uploads and deletions...");
    await syncPendingUploads();
    await syncPendingDeletions();
  });
};

// Initialiser les écouteurs de connectivité au démarrage
setupConnectivityListeners();
