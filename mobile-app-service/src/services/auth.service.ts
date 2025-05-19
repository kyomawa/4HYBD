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
  profilePicture?: string | null; // Modifié pour accepter null
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
      const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username,
        }),
        mode: "no-cors", // Added no-cors mode
      });

      // Note: With no-cors mode, we can't access response data properly
      // For development, we'll need to mock the success response
      const mockData = {
        token: "mock_token_" + Math.random().toString(36).substring(2),
        user: {
          _id: "user_" + Math.random().toString(36).substring(2),
          email,
          username,
          avatar: null,
          bio: "",
          display_name: "",
          created_at: new Date().toISOString(),
          role: "User",
        },
      };

      // Save token
      await saveAuthToken(mockData.token);

      // Convert API user format to local format
      const user: User = {
        id: mockData.user._id,
        email: mockData.user.email,
        username: mockData.user.username,
        profilePicture: mockData.user.avatar, // null est maintenant accepté
        bio: mockData.user.bio,
        fullName: mockData.user.display_name,
        following: [],
        followers: [],
        createdAt: new Date(mockData.user.created_at).getTime(),
        role: mockData.user.role,
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
      const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          credential: emailOrUsername,
          password,
        }),
        mode: "no-cors", // Added no-cors mode
      });

      // With no-cors, we need to mock the response
      const mockToken = "mock_token_" + Math.random().toString(36).substring(2);
      await saveAuthToken(mockToken);

      // Mock user data for development
      const mockUser: User = {
        id: "user_" + Math.random().toString(36).substring(2),
        email: emailOrUsername.includes("@") ? emailOrUsername : "user@example.com",
        username: emailOrUsername.includes("@") ? emailOrUsername.split("@")[0] : emailOrUsername,
        profilePicture: null, // null est maintenant accepté
        bio: "Test user bio",
        fullName: "Test User",
        following: [],
        followers: [],
        createdAt: Date.now(),
        role: "User",
      };

      // Save user data
      await saveCurrentUser(mockUser);

      return mockUser;
    } else {
      // Try to use cached credentials for offline login
      // This is a simplified offline login that just checks if the user exists locally
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
 * Get user profile from API (mocked for no-cors)
 */
const getUserProfile = async (token: string): Promise<User> => {
  try {
    // No-cors request
    await fetch(`${API_URL}${API_ENDPOINTS.USERS.ME}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      mode: "no-cors",
    });

    // Mock data since we can't read response with no-cors
    const mockData = {
      _id: "user_" + Math.random().toString(36).substring(2),
      email: "user@example.com",
      username: "testuser",
      avatar: null,
      bio: "Test user bio",
      display_name: "Test User",
      following: [],
      followers: [],
      created_at: new Date().toISOString(),
      role: "User",
    };

    return {
      id: mockData._id,
      email: mockData.email,
      username: mockData.username,
      profilePicture: mockData.avatar, // null est maintenant accepté
      bio: mockData.bio,
      fullName: mockData.display_name,
      following: mockData.following || [],
      followers: mockData.followers || [],
      createdAt: new Date(mockData.created_at).getTime(),
      role: mockData.role,
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

      // Make no-cors request
      await fetch(`${API_URL}${API_ENDPOINTS.USERS.BY_ID(userId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        mode: "no-cors",
      });

      // Mock data
      const mockData = {
        _id: userId,
        username: `user_${userId.substring(0, 5)}`,
        email: `user_${userId.substring(0, 5)}@example.com`,
        avatar: null,
        bio: "User bio",
        display_name: `User ${userId.substring(0, 5)}`,
        following: [],
        followers: [],
        created_at: new Date().toISOString(),
        role: "User",
      };

      // Convert API response to our format
      return {
        id: mockData._id,
        username: mockData.username,
        email: mockData.email,
        profilePicture: mockData.avatar, // null est maintenant accepté
        bio: mockData.bio,
        fullName: mockData.display_name,
        following: mockData.following || [],
        followers: mockData.followers || [],
        createdAt: new Date(mockData.created_at).getTime(),
        role: mockData.role,
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
        // With no-cors we can't properly check token validity
        // We'll assume it's valid if it exists
        return true;
      } catch (error) {
        // En cas d'erreur réseau, on considère que le token est valide pour permettre le mode hors ligne
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

    if (!result.value) {
      return null;
    }

    const localUser = JSON.parse(result.value);

    // Si en ligne, récupérer les données à jour depuis le serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        if (!token) return localUser;

        const user = await getUserProfile(token);

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

      // Make no-cors request
      await fetch(`${API_URL}${API_ENDPOINTS.USERS.ME}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiUserData),
        mode: "no-cors",
      });

      // Mock updated data
      const updatedUser: User = {
        ...currentUser,
        ...userData,
      };

      // Update local user data
      await saveCurrentUser(updatedUser);

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

      // Make no-cors request
      await fetch(`${API_URL}${API_ENDPOINTS.FRIENDS.REQUEST(userId)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        mode: "no-cors",
      });

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

      // Make no-cors request
      await fetch(`${API_URL}${API_ENDPOINTS.FRIENDS.DELETE(userId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        mode: "no-cors",
      });

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

      // Make no-cors request
      await fetch(`${API_URL}${API_ENDPOINTS.FRIENDS.FIND}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
        mode: "no-cors",
      });

      // Mock data
      const mockUsers: User[] = Array(5)
        .fill(0)
        .map((_, i) => ({
          id: `user_${i}_${Math.random().toString(36).substring(2, 5)}`,
          username: `user${i}_${query}`,
          email: `user${i}_${query}@example.com`,
          profilePicture: null, // null est maintenant accepté
          bio: `Bio for user ${i}`,
          fullName: `User ${i} ${query}`,
          following: [],
          followers: [],
          createdAt: Date.now() - i * 86400000, // Stagger creation times
          role: "User",
        }));

      return mockUsers;
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
      // Mock user data
      const mockUsers: User[] = userIds.map((userId, index) => ({
        id: userId,
        username: `user_${userId.substring(0, 5)}`,
        email: `user_${userId.substring(0, 5)}@example.com`,
        profilePicture: null, // null est maintenant accepté
        bio: `Bio for user ${index}`,
        fullName: `User ${index}`,
        following: [],
        followers: [],
        createdAt: Date.now() - index * 86400000, // Stagger creation times
        role: "User",
      }));

      return mockUsers;
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
 * Save auth token to storage
 * @param token Auth token
 */
const saveAuthToken = async (token: string): Promise<void> => {
  await Preferences.set({
    key: AUTH_TOKEN_KEY,
    value: token,
  });
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
