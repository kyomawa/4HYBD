import { Preferences } from "@capacitor/preferences";
import { API_URL, API_ENDPOINTS, fetchApi } from "../config";

// Keys for auth storage
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";
const PENDING_SOCIAL_ACTIONS_KEY = "pending_social_actions";

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  bio: string;
  display_name: string;
  following: string[];
  followers: string[];
  createdAt: number;
  role: string;
}

export interface SocialAction {
  type: "follow" | "unfollow";
  userId: string;
  timestamp: number;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
  password?: string;
  bio?: string;
  display_name?: string;
  avatar?: string | null;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
}

/**
 * Récupère le token d'authentification
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    // Essayer d'abord le localStorage
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      return token;
    }

    // Si pas dans localStorage, essayer Capacitor Storage
    const result = await Preferences.get({ key: AUTH_TOKEN_KEY });
    if (result.value) {
      // Synchroniser avec localStorage
      localStorage.setItem(AUTH_TOKEN_KEY, result.value);
      return result.value;
    }

    return null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

/**
 * Sauvegarde le token d'authentification
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    // Sauvegarder dans localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, token);

    // Sauvegarder dans Capacitor Storage
    await Preferences.set({
      key: AUTH_TOKEN_KEY,
      value: token,
    });
  } catch (error) {
    console.error("Error saving auth token:", error);
    throw error;
  }
};

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Inscription d'un nouvel utilisateur
 * @param email Email de l'utilisateur
 * @param username Nom d'utilisateur
 * @param password Mot de passe
 * @param bio Bio de l'utilisateur (optionnel)
 * @param location Localisation (optionnelle)
 * @returns Promise avec les données utilisateur
 */
export const register = async (
  email: string,
  username: string,
  password: string,
  bio?: string,
  location?: { type: "Point"; coordinates: [number, number] }
): Promise<User> => {
  try {
    if (!isOnline()) throw new Error("Impossible de s'inscrire hors-ligne");

    const body: any = {
      email,
      username,
      password,
    };
    if (bio) body.bio = bio;
    if (location) body.location = location;

    const data = await fetchApi<{ token: string }>(API_ENDPOINTS.auth.register, {
      method: "POST",
      body,
    });

    if (data.token) {
      await saveAuthToken(data.token);
    }

    // Récupérer le profil utilisateur après inscription
    const user = await getCurrentUser();
    if (!user) throw new Error("Impossible de récupérer le profil après inscription");
    return user;
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    throw error;
  }
};

/**
 * Login a user
 * @param emailOrUsername User email or username
 * @param password User password
 * @returns Promise with the user data
 */
export const login = async (emailOrUsername: string, password: string): Promise<User> => {
  try {
    if (isOnline()) {
      const data = await fetchApi<{ data: { user: any; token: string } }>(API_ENDPOINTS.auth.login, {
        method: "POST",
        body: {
          email_or_username: emailOrUsername,
          password,
        },
      });

      // Stocke le token JWT si disponible dans la réponse
      if (data.data.token) {
        await saveAuthToken(data.data.token);
      }

      // Récupérer les informations de l'utilisateur après connexion
      const userData = await getCurrentUser();

      if (!userData) {
        throw new Error("Failed to get user profile after login");
      }

      return userData;
    } else {
      // Try to use cached credentials for offline login
      const result = await Preferences.get({ key: USER_DATA_KEY });
      if (!result.value) {
        throw new Error("Cannot login while offline");
      }

      const user: User = JSON.parse(result.value);

      // Simplified check - in a real app, you would hash and compare passwords
      if (user.email === emailOrUsername || user.username === emailOrUsername) {
        return user;
      }

      throw new Error("Invalid credentials");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

/**
 * Récupère le profil complet de l'utilisateur courant
 */
const getUserProfile = async (): Promise<User> => {
  try {
    const data = await fetchApi<{ id: string; username: string; email: string; avatar?: string; bio?: string; display_name?: string; following?: string[]; followers?: string[]; created_at: string; role: string; location?: any }>(API_ENDPOINTS.users.me);
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      avatar: data.avatar || null,
      bio: data.bio || "",
      display_name: data.display_name || "",
      following: data.following || [],
      followers: data.followers || [],
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      role: data.role,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    throw error;
  }
};

/**
 * Get a user by ID
 * @param userId User ID
 * @returns Promise with the user data
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    if (isOnline()) {
      const data = await fetchApi<{ data: any }>(API_ENDPOINTS.users.byId(userId));

      // Convert API response to our format
      return {
        id: data.data._id || data.data.id,
        username: data.data.username,
        email: data.data.email,
        avatar: data.data.avatar || null,
        bio: data.data.bio || "",
        display_name: data.data.display_name || "",
        following: data.data.following || [],
        followers: data.data.followers || [],
        createdAt: new Date(data.data.created_at).getTime(),
        role: data.data.role,
      };
    } else {
      // Check local cache
      if (userId === "me") {
        return await getCurrentUser();
      }

      // Try to find in followed users cache
      const FOLLOWED_USERS_CACHE_KEY = "followed_users_cache";
      const result = await Preferences.get({ key: FOLLOWED_USERS_CACHE_KEY });

      if (result.value) {
        const cachedUsers: Record<string, User> = JSON.parse(result.value);

        if (cachedUsers[userId]) {
          return cachedUsers[userId];
        }
      }

      return null;
    }
  } catch (error) {
    console.error(`Error getting user by ID ${userId}:`, error);
    return null;
  }
};

/**
 * Déconnexion de l'utilisateur courant
 */
export const logout = async (): Promise<void> => {
  try {
    // Suppression locale du token et des données utilisateur
    await Preferences.remove({ key: AUTH_TOKEN_KEY });
    await Preferences.remove({ key: USER_DATA_KEY });
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    throw error;
  }
};

/**
 * Check if a user is authenticated
 * @returns Promise with boolean indicating if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    // Si en ligne, vérifier la validité du token
    if (isOnline()) {
      try {
        await fetchApi(API_ENDPOINTS.auth.me);
        return true;
      } catch (error) {
        // En cas d'erreur réseau, on considère que le token est valide pour permettre le mode hors ligne
        console.error("Error checking token validity:", error);
        return true;
      }
    }

    // En mode hors ligne, vérifier simplement que l'utilisateur existe localement
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};

/**
 * Get the current authenticated user
 * @returns Promise with the user data or null if not authenticated
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // D'abord essayer d'obtenir les données utilisateur locales
    const result = await Preferences.get({ key: USER_DATA_KEY });
    const localUser = result.value ? JSON.parse(result.value) : null;

    if (isOnline()) {
      try {
        const token = await getAuthToken();
        if (!token && !localUser) return null;
        const user = await getUserProfile();
        await saveCurrentUser(user);
        return user;
      } catch (error) {
        console.error("Erreur lors de la récupération du profil en ligne:", error);
        return localUser;
      }
    }
    return localUser;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return null;
  }
};

/**
 * Met à jour le profil utilisateur courant
 * @param userData Données à mettre à jour
 * @returns Promise avec le profil utilisateur mis à jour
 */
export const updateUserProfile = async (userData: UpdateProfileData): Promise<User> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Non authentifié");
    if (!isOnline()) throw new Error("Impossible de mettre à jour le profil hors-ligne");

    // Préparer les données selon la doc API
    const apiUserData: any = {
      email: userData.email || currentUser.email,
      password: userData.password || undefined, // facultatif si non changé
      username: userData.username || currentUser.username,
      bio: userData.bio || currentUser.bio,
      location: userData.location || undefined,
    };
    // Supprimer les champs undefined
    Object.keys(apiUserData).forEach((key) => apiUserData[key] === undefined && delete apiUserData[key]);

    const data = await fetchApi<{ id: string; username: string; email: string; avatar?: string; bio?: string; display_name?: string; following?: string[]; followers?: string[]; created_at: string; role: string; location?: any }>(API_ENDPOINTS.users.update, {
      method: "PUT",
      body: apiUserData,
    });

    const updatedUser: User = {
      id: data.id,
      email: data.email,
      username: data.username,
      avatar: data.avatar || null,
      bio: data.bio || "",
      display_name: data.display_name || "",
      following: data.following || [],
      followers: data.followers || [],
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      role: data.role,
    };
    await saveCurrentUser(updatedUser);
    return updatedUser;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    throw error;
  }
};

/**
 * Mark user data for sync when online
 */
const markUserForSync = async (user: User): Promise<void> => {
  try {
    const PENDING_USER_UPDATES_KEY = "pending_user_updates";

    await Preferences.set({
      key: PENDING_USER_UPDATES_KEY,
      value: JSON.stringify(user),
    });
  } catch (error) {
    console.error("Error marking user for sync:", error);
  }
};

/**
 * Sync user updates with the server when online
 */
export const syncPendingUserUpdates = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const PENDING_USER_UPDATES_KEY = "pending_user_updates";

    const result = await Preferences.get({ key: PENDING_USER_UPDATES_KEY });
    if (!result.value) return;

    const pendingUser: User = JSON.parse(result.value);

    // Update user via API
    await updateUserProfile({
      username: pendingUser.username,
      display_name: pendingUser.display_name,
      bio: pendingUser.bio,
      avatar: pendingUser.avatar,
    });

    // Clear pending updates
    await Preferences.remove({ key: PENDING_USER_UPDATES_KEY });
  } catch (error) {
    console.error("Error syncing user updates:", error);
  }
};

/**
 * Follow a user
 * @param userId ID of the user to follow
 * @returns Promise with the updated user data
 */
export const followUser = async (userId: string): Promise<User> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    if (isOnline()) {
      await fetchApi(API_ENDPOINTS.friends.send(userId), { method: "POST" });

      // Optimistically update following list
      const following = currentUser.following || [];
      if (!following.includes(userId)) {
        following.push(userId);
      }

      const updatedUser: User = {
        ...currentUser,
        following,
      };

      // Save locally
      await saveCurrentUser(updatedUser);

      return updatedUser;
    } else {
      // Offline mode: Update only locally
      const following = currentUser.following || [];
      if (!following.includes(userId)) {
        following.push(userId);
      }

      const updatedUser: User = {
        ...currentUser,
        following,
      };

      // Save locally
      await saveCurrentUser(updatedUser);

      // Mark for sync
      await addPendingSocialAction({
        type: "follow",
        userId,
        timestamp: Date.now(),
      });

      return updatedUser;
    }
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

/**
 * Ajoute une action sociale en attente (follow/unfollow)
 */
const addPendingSocialAction = async (action: SocialAction): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_SOCIAL_ACTIONS_KEY });
    const pendingActions = result.value ? JSON.parse(result.value) : [];

    // Vérifier s'il existe déjà une action contradictoire pour annuler les deux
    const existingActionIndex = pendingActions.findIndex(
      (a: SocialAction) => a.userId === action.userId && a.type !== action.type
    );

    if (existingActionIndex !== -1) {
      // Annuler l'action existante en la supprimant
      pendingActions.splice(existingActionIndex, 1);
    } else {
      // Ajouter la nouvelle action
      pendingActions.push(action);
    }

    await Preferences.set({
      key: PENDING_SOCIAL_ACTIONS_KEY,
      value: JSON.stringify(pendingActions),
    });
  } catch (error) {
    console.error("Error adding pending social action:", error);
  }
};

/**
 * Unfollow a user
 * @param userId ID of the user to unfollow
 * @returns Promise with the updated user data
 */
export const unfollowUser = async (userId: string): Promise<User> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    if (isOnline()) {
      await fetchApi(API_ENDPOINTS.friends.remove(userId), { method: "DELETE" });

      // Update following list
      const following = currentUser.following?.filter((id) => id !== userId) || [];

      const updatedUser: User = {
        ...currentUser,
        following,
      };

      // Save locally
      await saveCurrentUser(updatedUser);

      return updatedUser;
    } else {
      // Offline mode: Update only locally
      const following = currentUser.following?.filter((id) => id !== userId) || [];

      const updatedUser: User = {
        ...currentUser,
        following,
      };

      // Save locally
      await saveCurrentUser(updatedUser);

      // Mark for sync
      await addPendingSocialAction({
        type: "unfollow",
        userId,
        timestamp: Date.now(),
      });

      return updatedUser;
    }
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

/**
 * Search for users
 * @param query Search query
 * @returns Promise with array of matching users
 */
export const searchUsers = async (query: string): Promise<User[]> => {
  try {
    if (!query) {
      return [];
    }

    if (isOnline()) {
      // Vérifier si la requête est un email ou un ID
      const isEmail = query.includes('@');
      const searchParams = isEmail 
        ? { email: query }
        : { user_id: query };

      const data = await fetchApi<{ data: any }>(API_ENDPOINTS.friends.find, {
        method: "POST",
        body: searchParams,
      });

      // Convertir la réponse en tableau d'utilisateurs
      const users: User[] = Array.isArray(data.data) ? data.data : [data.data];
      return users.map((user: any) => ({
        id: user._id || user.id,
        username: user.username,
        email: user.email || "",
        avatar: user.avatar || null,
        bio: user.bio || "",
        display_name: user.display_name || "",
        following: user.following || [],
        followers: user.followers || [],
        createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
        role: user.role || "User",
      }));
    } else {
      throw new Error("Cannot search users while offline");
    }
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

/**
 * Get multiple users by IDs
 * @param userIds Array of user IDs
 * @returns Array of users
 */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  if (isOnline()) {
    try {
      const users: User[] = [];

      // Fetch each user individually
      for (const userId of userIds) {
        try {
          const data = await fetchApi<{ data: any }>(API_ENDPOINTS.users.byId(userId));
          users.push({
            id: data.data._id || data.data.id,
            username: data.data.username,
            email: data.data.email || "",
            avatar: data.data.avatar || null,
            bio: data.data.bio || "",
            display_name: data.data.display_name || "",
            following: data.data.following || [],
            followers: data.data.followers || [],
            createdAt: data.data.created_at ? new Date(data.data.created_at).getTime() : Date.now(),
            role: data.data.role || "User",
          });
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
        }
      }

      return users;
    } catch (error) {
      console.error("Error getting users by IDs:", error);
      return [];
    }
  } else {
    // Try to find users in cache
    const FOLLOWED_USERS_CACHE_KEY = "followed_users_cache";
    const result = await Preferences.get({ key: FOLLOWED_USERS_CACHE_KEY });

    if (!result.value) {
      return [];
    }

    const cachedUsers: Record<string, User> = JSON.parse(result.value);
    const users: User[] = [];

    for (const userId of userIds) {
      if (cachedUsers[userId]) {
        users.push(cachedUsers[userId]);
      }
    }

    return users;
  }
};

/**
 * Save current user data to storage
 * @param user User data
 */
const saveCurrentUser = async (user: User): Promise<void> => {
  await Preferences.set({
    key: USER_DATA_KEY,
    value: JSON.stringify(user),
  });
};

/**
 * Sync pending social actions (follows/unfollows) with the server
 */
export const syncPendingSocialActions = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_SOCIAL_ACTIONS_KEY });
    if (!result.value) return;

    const pendingActions: SocialAction[] = JSON.parse(result.value);
    if (pendingActions.length === 0) return;

    const successfulActions: SocialAction[] = [];

    // Trier les actions par timestamp (de la plus ancienne à la plus récente)
    pendingActions.sort((a, b) => a.timestamp - b.timestamp);

    for (const action of pendingActions) {
      try {
        if (action.type === "follow") {
          await followUser(action.userId);
        } else if (action.type === "unfollow") {
          await unfollowUser(action.userId);
        }
        successfulActions.push(action);
      } catch (error) {
        console.error(`Error syncing social action: ${action.type} for user ${action.userId}`, error);
      }
    }

    if (successfulActions.length > 0) {
      // Filtrer les actions réussies
      const remainingActions = pendingActions.filter(
        (action) =>
          !successfulActions.some(
            (successAction) => successAction.type === action.type && successAction.userId === action.userId
          )
      );

      // Mettre à jour la liste des actions en attente
      await Preferences.set({
        key: PENDING_SOCIAL_ACTIONS_KEY,
        value: JSON.stringify(remainingActions),
      });
    }
  } catch (error) {
    console.error("Error syncing pending social actions:", error);
  }
};

/**
 * Setup connectivity listeners for auto-syncing when online
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing user data and social actions...");
    await syncPendingUserUpdates();
    await syncPendingSocialActions();
  });
};

// Initialize connectivity listeners
setupConnectivityListeners();
