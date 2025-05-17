import { Preferences } from "@capacitor/preferences";
import { API_URL } from "../config";

// Keys for auth storage
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";

export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  fullName?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  createdAt: number;
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
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();

      // Save token
      await saveAuthToken(data.token);

      // Convert API user format to local format
      const user: User = {
        id: data.user._id || data.user.id,
        email: data.user.email,
        username: data.user.username,
        profilePicture: data.user.avatar,
        bio: data.user.bio,
        fullName: data.user.display_name,
        following: [],
        followers: [],
        createdAt: new Date(data.user.created_at).getTime(),
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
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailOrUsername.includes("@") ? emailOrUsername : undefined,
          username: !emailOrUsername.includes("@") ? emailOrUsername : undefined,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      // Save token
      await saveAuthToken(data.token);

      // Get user profile with token
      const user = await getUserProfile(data.token);

      // Save user data
      await saveCurrentUser(user);

      return user;
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
 * Get user profile from API
 */
const getUserProfile = async (token: string): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get user profile");
    }

    const data = await response.json();

    return {
      id: data._id || data.id,
      email: data.email,
      username: data.username,
      profilePicture: data.avatar,
      bio: data.bio,
      fullName: data.display_name,
      following: data.following || [],
      followers: data.followers || [],
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
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
    const result = await Preferences.get({ key: AUTH_TOKEN_KEY });
    return !!result.value;
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
    const result = await Preferences.get({ key: USER_DATA_KEY });

    if (!result.value) {
      return null;
    }

    return JSON.parse(result.value);
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
        // For profile pictures, we'd need to upload the image first
        // This is a simplified version that assumes the profilePicture is already a URL
        apiUserData.avatar = userData.profilePicture;
      }

      const response = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiUserData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Profile update failed");
      }

      const data = await response.json();

      // Convert API response to our format
      const updatedUser: User = {
        ...currentUser,
        id: data._id || data.id,
        username: data.username,
        email: data.email,
        profilePicture: data.avatar,
        bio: data.bio,
        fullName: data.display_name,
        following: data.following || currentUser.following,
        followers: data.followers || currentUser.followers,
        createdAt: new Date(data.created_at).getTime(),
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

      const response = await fetch(`${API_URL}/api/friends/request/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to follow user");
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
      await addPendingFollow(userId);

      return updatedUser;
    }
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

/**
 * Add a pending follow request
 */
const addPendingFollow = async (userId: string): Promise<void> => {
  try {
    const PENDING_FOLLOWS_KEY = "pending_follows";

    const result = await Preferences.get({ key: PENDING_FOLLOWS_KEY });
    const pendingFollows = result.value ? JSON.parse(result.value) : [];

    if (!pendingFollows.includes(userId)) {
      pendingFollows.push(userId);

      await Preferences.set({
        key: PENDING_FOLLOWS_KEY,
        value: JSON.stringify(pendingFollows),
      });
    }
  } catch (error) {
    console.error("Error adding pending follow:", error);
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

      const response = await fetch(`${API_URL}/api/friends/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to unfollow user");
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
      await addPendingUnfollow(userId);

      return updatedUser;
    }
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

/**
 * Add a pending unfollow request
 */
const addPendingUnfollow = async (userId: string): Promise<void> => {
  try {
    const PENDING_UNFOLLOWS_KEY = "pending_unfollows";

    const result = await Preferences.get({ key: PENDING_UNFOLLOWS_KEY });
    const pendingUnfollows = result.value ? JSON.parse(result.value) : [];

    if (!pendingUnfollows.includes(userId)) {
      pendingUnfollows.push(userId);

      await Preferences.set({
        key: PENDING_UNFOLLOWS_KEY,
        value: JSON.stringify(pendingUnfollows),
      });
    }
  } catch (error) {
    console.error("Error adding pending unfollow:", error);
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

      const response = await fetch(`${API_URL}/api/friends/find?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();

      // Convert API response to our format
      return data.map((user: any) => ({
        id: user._id || user.id,
        username: user.username,
        email: user.email,
        profilePicture: user.avatar,
        bio: user.bio,
        fullName: user.display_name,
        following: user.following || [],
        followers: user.followers || [],
        createdAt: new Date(user.created_at).getTime(),
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
 * Get a user by ID
 * @param userId User ID
 * @returns Promise with the user data
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    if (isOnline()) {
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("User not found");
      }

      const data = await response.json();

      // Convert API response to our format
      return {
        id: data._id || data.id,
        username: data.username,
        email: data.email,
        profilePicture: data.avatar,
        bio: data.bio,
        fullName: data.display_name,
        following: data.following || [],
        followers: data.followers || [],
        createdAt: new Date(data.created_at).getTime(),
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

      // We can't batch get users with the current API, so we have to make multiple requests
      const userPromises = userIds.map((id) => getUserById(id));
      const users = await Promise.all(userPromises);

      // Filter out null values
      return users.filter((user): user is User => user !== null);
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
    // Sync follows
    const PENDING_FOLLOWS_KEY = "pending_follows";
    const followsResult = await Preferences.get({ key: PENDING_FOLLOWS_KEY });

    if (followsResult.value) {
      const pendingFollows: string[] = JSON.parse(followsResult.value);

      for (const userId of pendingFollows) {
        try {
          await followUser(userId);
        } catch (error) {
          console.error(`Error syncing follow for user ${userId}:`, error);
        }
      }

      // Clear pending follows
      await Preferences.remove({ key: PENDING_FOLLOWS_KEY });
    }

    // Sync unfollows
    const PENDING_UNFOLLOWS_KEY = "pending_unfollows";
    const unfollowsResult = await Preferences.get({ key: PENDING_UNFOLLOWS_KEY });

    if (unfollowsResult.value) {
      const pendingUnfollows: string[] = JSON.parse(unfollowsResult.value);

      for (const userId of pendingUnfollows) {
        try {
          await unfollowUser(userId);
        } catch (error) {
          console.error(`Error syncing unfollow for user ${userId}:`, error);
        }
      }

      // Clear pending unfollows
      await Preferences.remove({ key: PENDING_UNFOLLOWS_KEY });
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
