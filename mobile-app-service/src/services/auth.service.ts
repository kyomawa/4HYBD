import { Preferences } from "@capacitor/preferences";
import { API_URL, API_ENDPOINTS } from "../config";

// Keys for auth storage
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";
const PENDING_SOCIAL_ACTIONS_KEY = "pending_social_actions";

export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string | null;
  fullName?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  createdAt: number;
  role?: string;
}

export interface SocialAction {
  type: "follow" | "unfollow";
  userId: string;
  timestamp: number;
}

/**
 * Récupère le token d'authentification
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const result = await Preferences.get({ key: AUTH_TOKEN_KEY });
    return result.value || null;
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
 * Register a new user
 * @param email User email
 * @param username User username
 * @param password User password
 * @returns Promise with the user data
 */
export const register = async (email: string, username: string, password: string): Promise<User> => {
  try {
    if (isOnline()) {
      // Online mode: Use the API
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important pour stocker les cookies
        body: JSON.stringify({
          email,
          password,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Registration failed: ${response.status}`);
      }

      const data = await response.json();

      // Stocke le token JWT si disponible dans la réponse
      if (data.data && data.data.token) {
        await saveAuthToken(data.data.token);
      }

      // Créer un objet utilisateur à partir de la réponse
      const user: User = {
        id: data.data.user._id || data.data.user.id,
        email: data.data.user.email,
        username: data.data.user.username,
        profilePicture: data.data.user.avatar || null,
        bio: data.data.user.bio || "",
        fullName: data.data.user.display_name || "",
        following: data.data.user.following || [],
        followers: data.data.user.followers || [],
        createdAt: new Date(data.data.user.created_at).getTime(),
        role: data.data.user.role,
      };

      // Save user data
      await saveCurrentUser(user);

      return user;
    } else {
      // Offline mode: Cannot register without internet
      throw new Error("Cannot register while offline");
    }
  } catch (error) {
    console.error("Error registering user:", error);
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
      // Online mode: Use the API
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important pour que le cookie de session soit stocké
        body: JSON.stringify({
          credential: emailOrUsername,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }

      const data = await response.json();

      // Stocke le token JWT si disponible dans la réponse
      if (data.data && data.data.token) {
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
 * Get user profile from API
 */
const getUserProfile = async (): Promise<User> => {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/users/me`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.status}`);
    }

    const data = await response.json();

    // Convert API response to our format
    return {
      id: data.data._id || data.data.id,
      email: data.data.email,
      username: data.data.username,
      profilePicture: data.data.avatar || null,
      bio: data.data.bio || "",
      fullName: data.data.display_name || "",
      following: data.data.following || [],
      followers: data.data.followers || [],
      createdAt: new Date(data.data.created_at).getTime(),
      role: data.data.role,
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
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
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/users/${userId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.status}`);
      }

      const data = await response.json();

      // Convert API response to our format
      return {
        id: data.data._id || data.data.id,
        username: data.data.username,
        email: data.data.email,
        profilePicture: data.data.avatar || null,
        bio: data.data.bio || "",
        fullName: data.data.display_name || "",
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
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  try {
    if (isOnline()) {
      // Appeler l'API pour déconnecter la session
      const token = await getAuthToken();

      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      } catch (error) {
        console.error("Error calling logout API:", error);
        // Continue with local logout even if API call fails
      }
    }

    // Supprimer les données locales
    await Preferences.remove({ key: AUTH_TOKEN_KEY });
    await Preferences.remove({ key: USER_DATA_KEY });
  } catch (error) {
    console.error("Error logging out:", error);
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
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        return response.ok;
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

    // Si en ligne, récupérer les données à jour depuis le serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        if (!token && !localUser) return null;

        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          // Si l'API échoue mais qu'on a des données locales, on les utilise
          if (localUser) return localUser;
          return null;
        }

        const data = await response.json();

        // Convertir la réponse API à notre format
        const user: User = {
          id: data.data._id || data.data.id,
          email: data.data.email,
          username: data.data.username,
          profilePicture: data.data.avatar || null,
          bio: data.data.bio || "",
          fullName: data.data.display_name || "",
          following: data.data.following || [],
          followers: data.data.followers || [],
          createdAt: new Date(data.data.created_at).getTime(),
          role: data.data.role,
        };

        // Mettre à jour les données locales
        await saveCurrentUser(user);

        return user;
      } catch (error) {
        console.error("Error getting current user from API:", error);
        // En cas d'erreur, utiliser les données locales
        return localUser;
      }
    }

    return localUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Update the current user profile
 * @param userData User data to update
 * @returns Promise with the updated user data
 */
export const updateUserProfile = async (userData: Partial<User>): Promise<User> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    if (isOnline()) {
      const token = await getAuthToken();

      // Map our internal fields to API fields
      const apiUserData: Record<string, any> = {};

      if (userData.username !== undefined) apiUserData.username = userData.username;
      if (userData.fullName !== undefined) apiUserData.display_name = userData.fullName;
      if (userData.bio !== undefined) apiUserData.bio = userData.bio;
      if (userData.profilePicture !== undefined) {
        // Pour le profil, on définit l'avatar avec l'URL de l'image
        apiUserData.avatar = userData.profilePicture;
      }

      const response = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(apiUserData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }

      // Récupérer le profil mis à jour
      const updatedUser = await getCurrentUser();
      if (!updatedUser) {
        throw new Error("Failed to get updated user profile");
      }

      return updatedUser;
    } else {
      // Offline mode: Update only locally
      const updatedUser: User = {
        ...currentUser,
        ...userData,
      };

      // Save locally
      await saveCurrentUser(updatedUser);

      // Mark for sync when online
      await markUserForSync(updatedUser);

      return updatedUser;
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
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
      fullName: pendingUser.fullName,
      bio: pendingUser.bio,
      profilePicture: pendingUser.profilePicture,
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
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/friends/request/${userId}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to follow user: ${response.status}`);
      }

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
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/friends/${userId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to unfollow user: ${response.status}`);
      }

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
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/friends/find`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search users: ${response.status}`);
      }

      const data = await response.json();

      // Convert API response to our format
      return data.data.map((user: any) => ({
        id: user._id || user.id,
        username: user.username,
        email: user.email || "",
        profilePicture: user.avatar || null,
        bio: user.bio || "",
        fullName: user.display_name || "",
        following: user.following || [],
        followers: user.followers || [],
        createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
        role: user.role || "User",
      }));
    } else {
      // Offline mode: Can't search users without internet
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
      const token = await getAuthToken();
      const users: User[] = [];

      // Fetch each user individually
      for (const userId of userIds) {
        try {
          const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            users.push({
              id: data.data._id || data.data.id,
              username: data.data.username,
              email: data.data.email || "",
              profilePicture: data.data.avatar || null,
              bio: data.data.bio || "",
              fullName: data.data.display_name || "",
              following: data.data.following || [],
              followers: data.data.followers || [],
              createdAt: data.data.created_at ? new Date(data.data.created_at).getTime() : Date.now(),
              role: data.data.role || "User",
            });
          }
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
