import { Preferences } from "@capacitor/preferences";
import { PhotoData } from "./camera.service";
import { getCurrentUser, User, getAuthToken } from "./auth.service";
import { getCurrentLocation } from "./location.service";
import { uploadMedia } from "./media.service";
import { API_URL } from "../config";

// Key for stories in storage
const STORIES_STORAGE_KEY = "stories";
const VIEWED_STORIES_KEY = "viewed_stories";
const PENDING_STORIES_KEY = "pending_stories";

export interface Story {
  id: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  views?: string[]; // IDs des utilisateurs qui ont vu la story
  createdAt: number;
  expiresAt: number; // 24 heures après création
  userId: string;
  mediaId: string;
  photoData?: PhotoData; // Pour le mode offline uniquement
  locationName?: string;
}

export interface StoryWithUser extends Story {
  user: User;
  viewed: boolean;
}

/**
 * Ce service gère les stories avec une approche hybride :
 * - En mode online : Utilise l'API backend
 * - En mode offline : Stocke temporairement en local
 */

// Variable pour simuler le mode online/offline (à remplacer par une vérification réelle)
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Ajoute un ID aux stories vues par l'utilisateur
 * @param storyId ID de la story vue
 */
export const markStoryAsViewed = async (storyId: string): Promise<void> => {
  try {
    if (isOnline()) {
      // Version API
      const token = await getAuthToken();
      await fetch(`${API_URL}/api/stories/${storyId}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    }

    // Garder aussi en local pour la cohérence de l'UI
    const viewedStories = await getViewedStories();
    if (!viewedStories.includes(storyId)) {
      viewedStories.push(storyId);
      await Preferences.set({
        key: VIEWED_STORIES_KEY,
        value: JSON.stringify(viewedStories),
      });
    }
  } catch (error) {
    console.error("Error marking story as viewed:", error);
    throw error;
  }
};

/**
 * Récupère les IDs des stories vues par l'utilisateur
 */
export const getViewedStories = async (): Promise<string[]> => {
  try {
    const result = await Preferences.get({ key: VIEWED_STORIES_KEY });
    if (result.value) {
      return JSON.parse(result.value);
    }
    return [];
  } catch (error) {
    console.error("Error getting viewed stories:", error);
    return [];
  }
};

/**
 * Crée une nouvelle story
 * @param photoData Données de la photo pour la story
 * @param caption Légende optionnelle
 */
export const createStory = async (photoData: PhotoData, caption?: string): Promise<Story> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 heures après création

    // Récupérer les coordonnées si disponibles
    let coordinates;
    if (photoData.location) {
      coordinates = {
        latitude: photoData.location.latitude,
        longitude: photoData.location.longitude,
      };
    }

    if (isOnline()) {
      try {
        // 1. Upload the media to the server
        const mediaId = await uploadMedia(photoData.webPath, "image");

        // 2. Create story via API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/stories`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_id: mediaId,
            caption: caption || "",
            location: coordinates
              ? {
                  coordinates: [coordinates.longitude, coordinates.latitude],
                  type: "Point",
                }
              : undefined,
            expiry: 86400, // 24 heures en secondes
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to create story");
        }

        // Convertir la réponse API au format local
        return {
          id: data.id,
          caption: data.caption,
          location: data.location
            ? {
                latitude: data.location.coordinates[1],
                longitude: data.location.coordinates[0],
              }
            : undefined,
          views: data.views || [],
          createdAt: new Date(data.created_at).getTime(),
          expiresAt: new Date(data.expires_at).getTime(),
          userId: data.user_id,
          mediaId: data.media_id,
        };
      } catch (error) {
        console.error("Error creating story online:", error);
        // Si l'API échoue, on continue en mode offline
        return await createOfflineStory(photoData, caption, currentUser.id, now, expiresAt, coordinates);
      }
    } else {
      // Mode offline : stocker en local en attendant de pouvoir synchroniser
      return await createOfflineStory(photoData, caption, currentUser.id, now, expiresAt, coordinates);
    }
  } catch (error) {
    console.error("Error creating story:", error);
    throw error;
  }
};

/**
 * Crée une story en mode offline pour synchronisation ultérieure
 */
const createOfflineStory = async (
  photoData: PhotoData,
  caption: string | undefined,
  userId: string,
  now: number,
  expiresAt: number,
  coordinates?: { latitude: number; longitude: number }
): Promise<Story> => {
  const newStory: Story = {
    id: `story_${now}`,
    caption,
    location: coordinates,
    views: [],
    createdAt: now,
    expiresAt,
    userId: userId,
    mediaId: `temp_media_${now}`,
    photoData, // Stocker temporairement les données de la photo
  };

  // Récupérer les stories existantes
  const stories = await getOfflineStories();
  stories.push(newStory);

  // Sauvegarder les stories mises à jour
  await Preferences.set({
    key: STORIES_STORAGE_KEY,
    value: JSON.stringify(stories),
  });

  // Ajouter également aux stories en attente pour synchronisation
  await addPendingStory(newStory);

  return newStory;
};

/**
 * Ajoute une story à la liste des stories en attente de synchronisation
 */
const addPendingStory = async (story: Story): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_STORIES_KEY });
    const pendingStories = result.value ? JSON.parse(result.value) : [];
    pendingStories.push(story);
    await Preferences.set({
      key: PENDING_STORIES_KEY,
      value: JSON.stringify(pendingStories),
    });
  } catch (error) {
    console.error("Error adding pending story:", error);
  }
};

/**
 * Synchronise les stories en attente avec le backend
 * À appeler quand l'application se reconnecte
 */
export const syncPendingStories = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_STORIES_KEY });
    if (!result.value) return;

    const pendingStories: Story[] = JSON.parse(result.value);
    if (pendingStories.length === 0) return;

    const token = await getAuthToken();
    const successfullyUploaded: string[] = [];

    for (const story of pendingStories) {
      if (!story.photoData) continue;

      try {
        // Upload the media
        const mediaId = await uploadMedia(story.photoData.webPath, "image");

        // Create the story
        const response = await fetch(`${API_URL}/api/stories`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_id: mediaId,
            caption: story.caption || "",
            location: story.location
              ? {
                  coordinates: [story.location.longitude, story.location.latitude],
                  type: "Point",
                }
              : undefined,
            expiry: 86400, // 24 heures en secondes
          }),
        });

        if (response.ok) {
          successfullyUploaded.push(story.id);
        }
      } catch (error) {
        console.error(`Error syncing story ${story.id}:`, error);
      }
    }

    // Remove successfully uploaded stories from pending list
    if (successfullyUploaded.length > 0) {
      const updatedPendingStories = pendingStories.filter((story) => !successfullyUploaded.includes(story.id));
      await Preferences.set({
        key: PENDING_STORIES_KEY,
        value: JSON.stringify(updatedPendingStories),
      });
    }
  } catch (error) {
    console.error("Error syncing pending stories:", error);
  }
};

/**
 * Récupère toutes les stories actives (non expirées)
 * Mode hybride : online/offline
 */
export const getOfflineStories = async (): Promise<Story[]> => {
  try {
    const result = await Preferences.get({ key: STORIES_STORAGE_KEY });
    if (!result.value) return [];

    const stories: Story[] = JSON.parse(result.value);
    const now = Date.now();

    // Filtrer les stories expirées
    const activeStories = stories.filter((story) => story.expiresAt > now);

    // Si des stories ont été filtrées, mettre à jour le stockage
    if (activeStories.length < stories.length) {
      await Preferences.set({
        key: STORIES_STORAGE_KEY,
        value: JSON.stringify(activeStories),
      });
    }

    return activeStories;
  } catch (error) {
    console.error("Error getting offline stories:", error);
    return [];
  }
};

/**
 * Récupère les stories pour le feed (des utilisateurs suivis par l'utilisateur courant)
 */
export const getFeedStories = async (): Promise<StoryWithUser[]> => {
  try {
    const viewedStories = await getViewedStories();

    if (isOnline()) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/stories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch stories");
        }

        const data = await response.json();

        // Convertir la réponse API au format local
        return data.map((item: any) => ({
          id: item._id || item.id,
          caption: item.caption,
          location: item.location
            ? {
                latitude: item.location.coordinates[1],
                longitude: item.location.coordinates[0],
              }
            : undefined,
          locationName: item.locationName,
          views: item.views || [],
          createdAt: new Date(item.created_at).getTime(),
          expiresAt: new Date(item.expires_at).getTime(),
          userId: item.user_id,
          mediaId: item.media_id,
          user: {
            id: item.user._id,
            username: item.user.username,
            profilePicture: item.user.avatar,
            bio: item.user.bio,
          },
          viewed: viewedStories.includes(item._id || item.id),
        }));
      } catch (error) {
        console.error("Error fetching online stories, falling back to offline:", error);
        // Fallback to offline stories if the API fails
        return await getOfflineFeedStories(viewedStories);
      }
    } else {
      // Mode offline
      return await getOfflineFeedStories(viewedStories);
    }
  } catch (error) {
    console.error("Error getting feed stories:", error);
    return [];
  }
};

/**
 * Récupère les stories en mode hors ligne
 */
const getOfflineFeedStories = async (viewedStories: string[]): Promise<StoryWithUser[]> => {
  const offlineStories = await getOfflineStories();
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  // En mode offline, on ne peut montrer que ses propres stories
  const storiesWithUsers = offlineStories
    .filter((story) => story.userId === currentUser.id)
    .map((story) => ({
      ...story,
      user: currentUser,
      viewed: viewedStories.includes(story.id),
    }));

  return storiesWithUsers;
};

/**
 * Récupère les stories des utilisateurs à proximité
 * @param maxDistance Distance maximale en kilomètres
 */
export const getNearbyStories = async (maxDistance: number = 20): Promise<StoryWithUser[]> => {
  try {
    const viewedStories = await getViewedStories();

    if (isOnline()) {
      try {
        // Obtenir la localisation actuelle
        const location = await getCurrentLocation();

        if (!location) {
          return []; // Pas de localisation disponible
        }

        const token = await getAuthToken();
        const response = await fetch(
          `${API_URL}/api/stories/nearby?latitude=${location.latitude}&longitude=${location.longitude}&radius=${
            maxDistance * 1000
          }`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch nearby stories");
        }

        const data = await response.json();

        // Convertir la réponse API au format local
        return data.map((item: any) => ({
          id: item._id || item.id,
          caption: item.caption,
          location: item.location
            ? {
                latitude: item.location.coordinates[1],
                longitude: item.location.coordinates[0],
              }
            : undefined,
          locationName: item.locationName,
          views: item.views || [],
          createdAt: new Date(item.created_at).getTime(),
          expiresAt: new Date(item.expires_at).getTime(),
          userId: item.user_id,
          mediaId: item.media_id,
          user: {
            id: item.user._id,
            username: item.user.username,
            profilePicture: item.user.avatar,
            bio: item.user.bio,
          },
          viewed: viewedStories.includes(item._id || item.id),
        }));
      } catch (error) {
        console.error("Error fetching nearby stories:", error);
        return [];
      }
    } else {
      // En mode offline, on ne peut pas vraiment implémenter cette fonctionnalité
      return [];
    }
  } catch (error) {
    console.error("Error getting nearby stories:", error);
    return [];
  }
};

/**
 * Supprime une story
 * @param storyId ID de la story à supprimer
 */
export const deleteStory = async (storyId: string): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    if (isOnline()) {
      try {
        // Supprimer via API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/stories/${storyId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Également supprimer la version locale si elle existe
          await deleteOfflineStory(storyId);
          return true;
        }

        // Si l'API échoue, on tente de supprimer en local
        const success = await deleteOfflineStory(storyId);
        return success;
      } catch (error) {
        console.error("Error deleting story online:", error);
        // Si l'API échoue, on tente de supprimer en local
        const success = await deleteOfflineStory(storyId);
        return success;
      }
    } else {
      // Mode offline
      const success = await deleteOfflineStory(storyId);
      return success;
    }
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
};

/**
 * Supprime une story en mode hors ligne
 */
const deleteOfflineStory = async (storyId: string): Promise<boolean> => {
  try {
    // Récupérer les stories existantes
    const result = await Preferences.get({ key: STORIES_STORAGE_KEY });
    if (!result.value) return false;

    const stories: Story[] = JSON.parse(result.value);
    const currentUser = await getCurrentUser();

    if (!currentUser) return false;

    // Trouver l'index de la story
    const storyIndex = stories.findIndex((story) => story.id === storyId);

    if (storyIndex === -1) return false;

    // Vérifier que l'utilisateur est le propriétaire
    if (stories[storyIndex].userId !== currentUser.id) {
      throw new Error("Not authorized to delete this story");
    }

    // Supprimer la story
    stories.splice(storyIndex, 1);

    // Sauvegarder les stories mises à jour
    await Preferences.set({
      key: STORIES_STORAGE_KEY,
      value: JSON.stringify(stories),
    });

    // Supprimer également des stories en attente
    await removePendingStory(storyId);

    return true;
  } catch (error) {
    console.error("Error deleting offline story:", error);
    return false;
  }
};

/**
 * Supprime une story de la liste des stories en attente
 */
const removePendingStory = async (storyId: string): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_STORIES_KEY });
    if (!result.value) return;

    const pendingStories: Story[] = JSON.parse(result.value);
    const updatedPendingStories = pendingStories.filter((story) => story.id !== storyId);

    await Preferences.set({
      key: PENDING_STORIES_KEY,
      value: JSON.stringify(updatedPendingStories),
    });
  } catch (error) {
    console.error("Error removing pending story:", error);
  }
};

/**
 * Ajoute un like à une story
 * @param storyId ID de la story
 * @returns Promise avec le résultat de l'opération
 */
export const likeStory = async (storyId: string): Promise<boolean> => {
  try {
    console.debug("likeStory", { storyId });

    if (isOnline()) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/stories/${storyId}/like`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.ok;
      } catch (error) {
        console.error("Error liking story online:", error);
        return await likeOfflineStory(storyId);
      }
    } else {
      return await likeOfflineStory(storyId);
    }
  } catch (error) {
    console.error("Error liking story", { storyId, error });
    throw error;
  }
};

/**
 * Ajoute un like à une story en mode hors ligne
 */
const likeOfflineStory = async (storyId: string): Promise<boolean> => {
  try {
    const stories = await getOfflineStories();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Trouver la story à liker
    const storyIndex = stories.findIndex((s) => s.id === storyId);
    if (storyIndex === -1) {
      throw new Error("Story not found");
    }

    // Ajouter le like s'il n'existe pas déjà
    const story = stories[storyIndex];
    const views = story.views || [];

    if (!views.includes(currentUser.id)) {
      views.push(currentUser.id);
      story.views = views;

      // Mettre à jour la story dans le stockage
      stories[storyIndex] = story;
      await Preferences.set({
        key: STORIES_STORAGE_KEY,
        value: JSON.stringify(stories),
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error liking offline story", { storyId, error });
    return false;
  }
};

/**
 * Retire un like d'une story
 * @param storyId ID de la story
 * @returns Promise avec le résultat de l'opération
 */
export const unlikeStory = async (storyId: string): Promise<boolean> => {
  try {
    console.debug("unlikeStory", { storyId });

    if (isOnline()) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/stories/${storyId}/unlike`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.ok;
      } catch (error) {
        console.error("Error unliking story online:", error);
        return await unlikeOfflineStory(storyId);
      }
    } else {
      return await unlikeOfflineStory(storyId);
    }
  } catch (error) {
    console.error("Error unliking story", { storyId, error });
    throw error;
  }
};

/**
 * Retire un like d'une story en mode hors ligne
 */
const unlikeOfflineStory = async (storyId: string): Promise<boolean> => {
  try {
    const stories = await getOfflineStories();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Trouver la story
    const storyIndex = stories.findIndex((s) => s.id === storyId);
    if (storyIndex === -1) {
      throw new Error("Story not found");
    }

    // Retirer le like s'il existe
    const story = stories[storyIndex];
    if (!story.views) {
      return false;
    }

    const likeIndex = story.views.indexOf(currentUser.id);
    if (likeIndex !== -1) {
      story.views.splice(likeIndex, 1);

      // Mettre à jour la story dans le stockage
      stories[storyIndex] = story;
      await Preferences.set({
        key: STORIES_STORAGE_KEY,
        value: JSON.stringify(stories),
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error unliking offline story", { storyId, error });
    return false;
  }
};

/**
 * Écoute les changements de connectivité pour synchroniser les données
 */
export const setupConnectivityListener = (): void => {
  window.addEventListener("online", async () => {
    console.log("App is back online, syncing pending stories...");
    await syncPendingStories();
  });
};

// Initialiser les écouteurs de connectivité
setupConnectivityListener();
