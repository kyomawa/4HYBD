import { Preferences } from "@capacitor/preferences";
import { PhotoData } from "./camera.service";
import { getCurrentUser, getUserById, User, getAuthToken } from "./auth.service";
import { getCurrentLocation } from "./location.service";
import { uploadMedia } from "./media.service";
import { API_URL, API_ENDPOINTS } from "../config";

// Storage keys
const STORIES_STORAGE_KEY = "stories";
const VIEWED_STORIES_KEY = "viewed_stories";
const PENDING_STORIES_KEY = "pending_stories";
const LIKED_STORIES_KEY = "liked_stories";

export interface Story {
  id: string;
  caption?: string;
  location?: { latitude: number; longitude: number };
  views: string[]; // Array of user IDs who have viewed the story
  createdAt: number;
  expiresAt: number;
  userId: string;
  mediaUrl: string;
  photoData?: PhotoData;
  locationName?: string;
  likes: string[]; // Array of user IDs who have liked the story
}

export interface StoryWithUser extends Story {
  user: User;
  viewed: boolean;
}

/**
 * Checks if the device is currently online
 */
const isOnline = (): boolean => navigator.onLine;

/**
 * Marks a story as viewed by the current user
 * @param storyId ID of the story to mark as viewed
 */
export const markStoryAsViewed = async (storyId: string): Promise<void> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Add to viewed stories locally
    const viewed = await getViewedStories();
    if (!viewed.includes(storyId)) {
      viewed.push(storyId);
      await Preferences.set({ key: VIEWED_STORIES_KEY, value: JSON.stringify(viewed) });
    }

    // If online, inform the server that the story was viewed
    if (isOnline()) {
      const token = await getAuthToken();
      
      if (!token) return;

      // The API might not have a specific endpoint for marking stories as viewed,
      // but we're assuming the endpoint is available based on the README
      await fetch(`${API_URL}${API_ENDPOINTS.STORIES.BY_ID(storyId)}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Error marking story as viewed:", error);
  }
};

/**
 * Gets the list of story IDs that the current user has viewed
 * @returns Array of story IDs
 */
export const getViewedStories = async (): Promise<string[]> => {
  try {
    const result = await Preferences.get({ key: VIEWED_STORIES_KEY });
    return result.value ? JSON.parse(result.value) : [];
  } catch (error) {
    console.error("Error getting viewed stories:", error);
    return [];
  }
};

/**
 * Creates a new story from a photo
 * @param photoData Photo data to use for the story
 * @param caption Optional caption for the story
 * @returns Created story
 */
export const createStory = async (photoData: PhotoData, caption?: string): Promise<Story> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Current time and expiration time (24 hours later)
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    // Location data
    const locationData = photoData.location ? {
      type: "Point",
      coordinates: [photoData.location.longitude, photoData.location.latitude]
    } : undefined;

    // If online, upload to server
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Authentication token not available");
        }

        // Upload media first
        const mediaUrl = await uploadMedia(photoData.webPath, "image");

        // Create the story with the media URL
        const body: Record<string, any> = {
          media: {
            media_type: "Image",
            url: mediaUrl,
            duration: null
          }
        };

        // Add optional fields
        if (caption) body.caption = caption;
        if (locationData) body.location = locationData;

        // Send the request to create a story
        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.CREATE}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create story");
        }

        const data = await response.json();

        // Convert API response to our format
        const story: Story = {
          id: data._id || data.id,
          caption: data.caption,
          location: data.location ? {
            latitude: data.location.coordinates[1],
            longitude: data.location.coordinates[0]
          } : undefined,
          views: data.views || [],
          createdAt: data.created_at ? new Date(data.created_at).getTime() : now,
          expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : expiresAt,
          userId: data.user_id,
          mediaUrl: data.media.url,
          likes: data.likes || [],
        };

        // Cache the story locally
        await cacheStory(story);

        return story;
      } catch (error) {
        console.error("Error creating story on server:", error);
        // Fall back to offline mode
        return await createOfflineStory(photoData, caption, currentUser.id, now, expiresAt);
      }
    } else {
      // Offline mode: Create story locally
      return await createOfflineStory(photoData, caption, currentUser.id, now, expiresAt);
    }
  } catch (error) {
    console.error("Error creating story:", error);
    throw error;
  }
};

/**
 * Creates a story in offline mode
 */
const createOfflineStory = async (
  photoData: PhotoData,
  caption: string | undefined,
  userId: string,
  createdAt: number,
  expiresAt: number
): Promise<Story> => {
  // Generate a temporary ID for the story
  const storyId = `story_${createdAt}`;

  // Create the story object
  const newStory: Story = {
    id: storyId,
    caption,
    location: photoData.location ? {
      latitude: photoData.location.latitude,
      longitude: photoData.location.longitude
    } : undefined,
    views: [],
    createdAt,
    expiresAt,
    userId,
    mediaUrl: photoData.webPath,
    photoData,
    likes: [],
  };

  // Store the story in offline storage
  const allStories = await getOfflineStories();
  allStories.push(newStory);
  await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(allStories) });

  // Add to pending stories for later sync
  await addPendingStory(newStory);

  return newStory;
};

/**
 * Add a story to pending stories for later sync
 */
const addPendingStory = async (story: Story): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_STORIES_KEY });
    const pendingStories = result.value ? JSON.parse(result.value) : [];
    pendingStories.push(story);
    await Preferences.set({ key: PENDING_STORIES_KEY, value: JSON.stringify(pendingStories) });
  } catch (error) {
    console.error("Error adding pending story:", error);
  }
};

/**
 * Cache a story locally
 */
const cacheStory = async (story: Story): Promise<void> => {
  try {
    const allStories = await getOfflineStories();
    
    // Check if the story already exists
    const existingIndex = allStories.findIndex(s => s.id === story.id);
    
    if (existingIndex !== -1) {
      // Update existing story
      allStories[existingIndex] = story;
    } else {
      // Add new story
      allStories.push(story);
    }
    
    await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(allStories) });
  } catch (error) {
    console.error("Error caching story:", error);
  }
};

/**
 * Get all locally stored stories
 * @returns Array of stories
 */
export const getOfflineStories = async (): Promise<Story[]> => {
  try {
    const result = await Preferences.get({ key: STORIES_STORAGE_KEY });
    const stories = result.value ? JSON.parse(result.value) : [];
    
    // Filter out expired stories
    const now = Date.now();
    const activeStories = stories.filter((story: Story) => story.expiresAt > now);
    
    // If we filtered any stories, update the storage
    if (activeStories.length < stories.length) {
      await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(activeStories) });
    }
    
    return activeStories;
  } catch (error) {
    console.error("Error getting offline stories:", error);
    return [];
  }
};

/**
 * Get stories for the feed (from followed users and friends)
 * @returns Array of stories with user data
 */
export const getFeedStories = async (): Promise<StoryWithUser[]> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get viewed stories
    const viewedStoryIds = await getViewedStories();

    // If online, fetch from server
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.LIST}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch stories");
        }

        const data = await response.json();
        
        // Convert API response to our format
        const stories: StoryWithUser[] = await Promise.all(
          data.map(async (item: any) => {
            // Get user data
            let user: User;
            
            // If the story has user data embedded, use it
            if (item.user) {
              user = {
                id: item.user._id || item.user.id,
                username: item.user.username,
                email: item.user.email || "",
                profilePicture: item.user.avatar,
                createdAt: item.user.created_at ? new Date(item.user.created_at).getTime() : Date.now(),
                followers: item.user.followers || [],
                following: item.user.following || [],
              };
            } else {
              // Otherwise, fetch user data
              const userData = await getUserById(item.user_id);
              
              if (!userData) {
                throw new Error("User not found");
              }
              
              user = userData;
            }
            
            const story: Story = {
              id: item._id || item.id,
              caption: item.caption,
              location: item.location ? {
                latitude: item.location.coordinates[1],
                longitude: item.location.coordinates[0]
              } : undefined,
              views: item.views || [],
              createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
              expiresAt: item.expires_at ? new Date(item.expires_at).getTime() : Date.now() + 24 * 60 * 60 * 1000,
              userId: item.user_id,
              mediaUrl: item.media.url,
              likes: item.likes || [],
            };
            
            // Cache the story locally
            await cacheStory(story);
            
            return {
              ...story,
              user,
              viewed: viewedStoryIds.includes(story.id),
            };
          })
        );
        
        return stories;
      } catch (error) {
        console.error("Error fetching stories from API:", error);
        // Fall back to offline stories
      }
    }
    
    // Offline mode or API fallback: Get stories from local storage
    const offlineStories = await getOfflineStories();
    
    // Filter to only show current user's stories in offline mode (could be expanded)
    const filteredStories = offlineStories.filter(story => story.userId === currentUser.id);
    
    // Convert to StoryWithUser format
    return await Promise.all(
      filteredStories.map(async (story) => {
        let user: User;
        
        // If it's the current user's story, we already have the data
        if (story.userId === currentUser.id) {
          user = currentUser;
        } else {
          // Otherwise, try to get the user data
          const userData = await getUserById(story.userId);
          
          if (!userData) {
            // If user data not found, create minimal user object
            user = {
              id: story.userId,
              username: "Unknown User",
              email: "",
              createdAt: Date.now(),
              followers: [],
              following: [],
            };
          } else {
            user = userData;
          }
        }
        
        return {
          ...story,
          user,
          viewed: viewedStoryIds.includes(story.id),
        };
      })
    );
  } catch (error) {
    console.error("Error getting feed stories:", error);
    return [];
  }
};

/**
 * Get stories near a specific location
 * @param maxDistance Maximum distance in kilometers
 * @returns Array of stories with user data
 */
export const getNearbyStories = async (maxDistance: number = 5): Promise<StoryWithUser[]> => {
  try {
    // Ensure we have location access
    const location = await getCurrentLocation();
    
    if (!location) {
      throw new Error("Unable to get current location");
    }
    
    // Get viewed stories
    const viewedStoryIds = await getViewedStories();
    
    // If online, fetch from server
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Authentication token not available");
        }
        
        // Convert km to meters for API
        const radiusInMeters = maxDistance * 1000;
        
        const response = await fetch(
          `${API_URL}${API_ENDPOINTS.STORIES.NEARBY}?latitude=${location.latitude}&longitude=${location.longitude}&radius=${radiusInMeters}`,
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
        
        // Convert API response to our format
        const stories: StoryWithUser[] = await Promise.all(
          data.map(async (item: any) => {
            // Get user data
            const userData = await getUserById(item.user_id);
            
            if (!userData) {
              throw new Error("User not found");
            }
            
            const story: Story = {
              id: item._id || item.id,
              caption: item.caption,
              location: item.location ? {
                latitude: item.location.coordinates[1],
                longitude: item.location.coordinates[0]
              } : undefined,
              views: item.views || [],
              createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
              expiresAt: item.expires_at ? new Date(item.expires_at).getTime() : Date.now() + 24 * 60 * 60 * 1000,
              userId: item.user_id,
              mediaUrl: item.media.url,
              likes: item.likes || [],
            };
            
            // Cache the story locally
            await cacheStory(story);
            
            return {
              ...story,
              user: userData,
              viewed: viewedStoryIds.includes(story.id),
            };
          })
        );
        
        return stories;
      } catch (error) {
        console.error("Error fetching nearby stories from API:", error);
        // Fall back to offline mode
      }
    }
    
    // Offline mode or API fallback: try to filter offline stories by location
    const offlineStories = await getOfflineStories();
    
    // Filter stories that have location data and are within range
    const nearbyStories = offlineStories.filter(story => {
      if (!story.location) return false;
      
      // Calculate distance (approximate)
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        story.location.latitude,
        story.location.longitude
      );
      
      return distance <= maxDistance;
    });
    
    // Convert to StoryWithUser format
    return await Promise.all(
      nearbyStories.map(async (story) => {
        const userData = await getUserById(story.userId);
        
        return {
          ...story,
          user: userData || {
            id: story.userId,
            username: "Unknown User",
            email: "",
            createdAt: Date.now(),
            followers: [],
            following: [],
          },
          viewed: viewedStoryIds.includes(story.id),
        };
      })
    );
  } catch (error) {
    console.error("Error getting nearby stories:", error);
    return [];
  }
};

/**
 * Calculate distance between two coordinates in kilometers
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Like a story
 * @param storyId Story ID to like
 * @returns Updated story
 */
export const likeStory = async (storyId: string): Promise<void> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // If online, send to server
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.LIKE(storyId)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to like story");
        }
      } catch (error) {
        console.error("Error liking story on server:", error);
        // Fall back to offline mode
      }
    }

    // Update locally regardless of online status
    const likedStories = await getLikedStories();
    
    if (!likedStories.includes(storyId)) {
      likedStories.push(storyId);
      await Preferences.set({ key: LIKED_STORIES_KEY, value: JSON.stringify(likedStories) });
    }

    // Also update the local story if it exists
    const offlineStories = await getOfflineStories();
    const storyIndex = offlineStories.findIndex(s => s.id === storyId);
    
    if (storyIndex !== -1) {
      const story = offlineStories[storyIndex];
      
      if (!story.likes.includes(currentUser.id)) {
        story.likes.push(currentUser.id);
        offlineStories[storyIndex] = story;
        await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(offlineStories) });
      }
    }
  } catch (error) {
    console.error("Error liking story:", error);
    throw error;
  }
};

/**
 * Unlike a story
 * @param storyId Story ID to unlike
 */
export const unlikeStory = async (storyId: string): Promise<void> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // If online, send to server
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.UNLIKE(storyId)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to unlike story");
        }
      } catch (error) {
        console.error("Error unliking story on server:", error);
        // Fall back to offline mode
      }
    }

    // Update locally regardless of online status
    const likedStories = await getLikedStories();
    const updatedLikedStories = likedStories.filter(id => id !== storyId);
    await Preferences.set({ key: LIKED_STORIES_KEY, value: JSON.stringify(updatedLikedStories) });

    // Also update the local story if it exists
    const offlineStories = await getOfflineStories();
    const storyIndex = offlineStories.findIndex(s => s.id === storyId);
    
    if (storyIndex !== -1) {
      const story = offlineStories[storyIndex];
      story.likes = story.likes.filter(id => id !== currentUser.id);
      offlineStories[storyIndex] = story;
      await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(offlineStories) });
    }
  } catch (error) {
    console.error("Error unliking story:", error);
    throw error;
  }
};

/**
 * Get stories liked by the current user
 * @returns Array of story IDs
 */
export const getLikedStories = async (): Promise<string[]> => {
  try {
    const result = await Preferences.get({ key: LIKED_STORIES_KEY });
    return result.value ? JSON.parse(result.value) : [];
  } catch (error) {
    console.error("Error getting liked stories:", error);
    return [];
  }
};

/**
 * Delete a story
 * @param storyId Story ID to delete
 * @returns True if successful, false otherwise
 */
export const deleteStory = async (storyId: string): Promise<boolean> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // If online, delete from server
    if (isOnline()) {
      try {
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.BY_ID(storyId)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to delete story");
        }
      } catch (error) {
        console.error("Error deleting story from server:", error);
        // Continue with local deletion
      }
    }

    // Delete locally regardless of online status
    const offlineStories = await getOfflineStories();
    
    // Verify ownership
    const story = offlineStories.find(s => s.id === storyId);
    
    if (!story) {
      return false;
    }
    
    if (story.userId !== currentUser.id) {
      throw new Error("You do not have permission to delete this story");
    }
    
    // Remove story from offline storage
    const updatedStories = offlineStories.filter(s => s.id !== storyId);
    await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(updatedStories) });
    
    // Remove from pending stories if it exists
    const pendingResult = await Preferences.get({ key: PENDING_STORIES_KEY });
    
    if (pendingResult.value) {
      const pendingStories = JSON.parse(pendingResult.value);
      const updatedPendingStories = pendingStories.filter((s: Story) => s.id !== storyId);
      await Preferences.set({ key: PENDING_STORIES_KEY, value: JSON.stringify(updatedPendingStories) });
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
};

/**
 * Synchronize pending stories with the server
 */
export const syncPendingStories = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_STORIES_KEY });
    
    if (!result.value) return;
    
    const pendingStories: Story[] = JSON.parse(result.value);
    
    if (pendingStories.length === 0) return;
    
    const token = await getAuthToken();
    
    if (!token) return;
    
    const successfulSyncs: string[] = [];
    
    for (const story of pendingStories) {
      try {
        // Only try to sync stories with photoData
        if (!story.photoData) continue;
        
        // Upload the media
        const mediaUrl = story.photoData.webPath.startsWith("http")
          ? story.photoData.webPath // Already a URL
          : await uploadMedia(story.photoData.webPath, "image");
        
        // Create the story with the media URL
        const body: Record<string, any> = {
          media: {
            media_type: "Image",
            url: mediaUrl,
            duration: null
          }
        };
        
        // Add optional fields
        if (story.caption) body.caption = story.caption;
        if (story.location) {
          body.location = {
            type: "Point",
            coordinates: [story.location.longitude, story.location.latitude]
          };
        }
        
        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.CREATE}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        
        if (response.ok) {
          successfulSyncs.push(story.id);
        }
      } catch (error) {
        console.error(`Error syncing story ${story.id}:`, error);
      }
    }
    
    // Remove successfully synced stories from pending
    if (successfulSyncs.length > 0) {
      const remainingStories = pendingStories.filter(story => !successfulSyncs.includes(story.id));
      await Preferences.set({ key: PENDING_STORIES_KEY, value: JSON.stringify(remainingStories) });
    }
  } catch (error) {
    console.error("Error syncing pending stories:", error);
  }
};

/**
 * Set up listeners for online/offline status
 */
window.addEventListener("online", async () => {
  console.log("Device is online. Syncing pending stories...");
  await syncPendingStories();
});