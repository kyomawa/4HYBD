import { Preferences } from "@capacitor/preferences";
import { getUserById, getCurrentUser, getUsersByIds } from "./auth.service";
import { API_URL, API_ENDPOINTS } from "../config";
import { getAuthToken } from "./auth.service";

// Key for posts in storage
const POSTS_STORAGE_KEY = "posts";
const PENDING_POSTS_KEY = "pending_posts";
const PENDING_LIKES_KEY = "pending_likes";
const PENDING_COMMENTS_KEY = "pending_comments";

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  createdAt: number;
  caption?: string;
  likes: string[]; // Array of user IDs who have liked the post
  comments: Comment[];
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface PostWithUser extends Post {
  user: {
    id: string;
    username: string;
    profilePicture?: string;
  };
}

interface PendingLike {
  postId: string;
  action: "like" | "unlike";
  timestamp: number;
}

interface PendingComment {
  postId: string;
  text: string;
  timestamp: number;
}

/**
 * Create a new post
 * @param imageUrl URL of the image
 * @param caption Optional caption for the post
 * @returns Created post
 */
export const createPost = async (imageUrl: string, caption?: string): Promise<Post> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const timestamp = new Date().getTime();

    if (isOnline()) {
      try {
        const token = await getAuthToken();

        // Detect if the imageUrl is a local path or a server URL
        const isServerUrl = imageUrl.startsWith("http");
        let mediaId;

        if (!isServerUrl) {
          // We need to upload the image first
          // Extract the mediaId from a server URL or use the local path
          const { uploadPhotoToServer } = await import("./camera.service");
          const serverUrl = await uploadPhotoToServer({
            id: `temp_${timestamp}`,
            webPath: imageUrl,
            timestamp,
            type: "photo",
          });

          if (!serverUrl) {
            throw new Error("Failed to upload image");
          }

          // Extract media ID from server URL
          const urlParts = serverUrl.split("/");
          mediaId = urlParts[urlParts.length - 1].split(".")[0];
        } else {
          // Extract media ID from server URL
          const urlParts = imageUrl.split("/");
          mediaId = urlParts[urlParts.length - 1].split(".")[0];
        }

        // Now create the post with the media ID
        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.CREATE}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_id: mediaId,
            caption: caption || "",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create post");
        }

        const data = await response.json();

        // Convert API response to our format
        const newPost: Post = {
          id: data._id || data.id,
          userId: data.user_id,
          imageUrl: data.media.url,
          createdAt: new Date(data.created_at).getTime(),
          caption: data.caption,
          likes: data.likes || [],
          comments: (data.comments || []).map((comment: any) => ({
            id: comment._id || comment.id,
            userId: comment.user_id,
            text: comment.text,
            createdAt: new Date(comment.created_at).getTime(),
          })),
          location: data.location
            ? {
                latitude: data.location.coordinates[1],
                longitude: data.location.coordinates[0],
              }
            : undefined,
        };

        // Cache the post locally
        await cachePost(newPost);

        return newPost;
      } catch (error) {
        console.error("Error creating post online:", error);
        // Fall back to offline mode
        return await createOfflinePost(imageUrl, caption, currentUser.id, timestamp);
      }
    } else {
      // Offline mode: create post locally
      return await createOfflinePost(imageUrl, caption, currentUser.id, timestamp);
    }
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

/**
 * Create a post in offline mode
 */
const createOfflinePost = async (
  imageUrl: string,
  caption: string | undefined,
  userId: string,
  timestamp: number
): Promise<Post> => {
  const newPost: Post = {
    id: `post_${timestamp}`,
    userId,
    imageUrl,
    createdAt: timestamp,
    caption,
    likes: [],
    comments: [],
  };

  // Get existing posts
  const posts = await getPosts();

  // Add new post at the beginning of the array
  posts.unshift(newPost);

  // Save updated posts
  await savePosts(posts);

  // Add to pending posts for later sync
  await addPendingPost(newPost);

  return newPost;
};

/**
 * Add a post to pending posts for later sync
 */
const addPendingPost = async (post: Post): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_POSTS_KEY });
    const pendingPosts = result.value ? JSON.parse(result.value) : [];

    pendingPosts.push(post);

    await Preferences.set({
      key: PENDING_POSTS_KEY,
      value: JSON.stringify(pendingPosts),
    });
  } catch (error) {
    console.error("Error adding pending post:", error);
  }
};

/**
 * Cache a post locally
 */
const cachePost = async (post: Post): Promise<void> => {
  try {
    const posts = await getPosts();

    // Check if post already exists
    const existingIndex = posts.findIndex((p) => p.id === post.id);

    if (existingIndex !== -1) {
      // Update existing post
      posts[existingIndex] = post;
    } else {
      // Add new post to beginning
      posts.unshift(post);
    }

    // Save updated posts
    await savePosts(posts);
  } catch (error) {
    console.error("Error caching post:", error);
  }
};

/**
 * Save posts to local storage
 */
const savePosts = async (posts: Post[]): Promise<void> => {
  await Preferences.set({
    key: POSTS_STORAGE_KEY,
    value: JSON.stringify(posts),
  });
};

/**
 * Get all posts
 * @returns Array of posts
 */
export const getPosts = async (): Promise<Post[]> => {
  try {
    const result = await Preferences.get({ key: POSTS_STORAGE_KEY });

    if (result.value) {
      return JSON.parse(result.value);
    }

    return [];
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
};

/**
 * Get a post by ID
 * @param postId Post ID
 * @returns Post or null if not found
 */
export const getPostById = async (postId: string): Promise<Post | null> => {
  try {
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.BY_ID(postId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }

        const data = await response.json();

        // Convert API response to our format
        const post: Post = {
          id: data._id || data.id,
          userId: data.user_id,
          imageUrl: data.media.url,
          createdAt: new Date(data.created_at).getTime(),
          caption: data.caption,
          likes: data.likes || [],
          comments: (data.comments || []).map((comment: any) => ({
            id: comment._id || comment.id,
            userId: comment.user_id,
            text: comment.text,
            createdAt: new Date(comment.created_at).getTime(),
          })),
          location: data.location
            ? {
                latitude: data.location.coordinates[1],
                longitude: data.location.coordinates[0],
              }
            : undefined,
        };

        // Cache the post locally
        await cachePost(post);

        return post;
      } catch (error) {
        console.error("Error fetching post from API:", error);
        // Fall back to local cache
      }
    }

    // Get from local cache
    const posts = await getPosts();
    return posts.find((post) => post.id === postId) || null;
  } catch (error) {
    console.error("Error getting post by ID:", error);
    return null;
  }
};

/**
 * Get posts by user ID
 * @param userId User ID
 * @returns Array of posts
 */
export const getPostsByUserId = async (userId: string): Promise<Post[]> => {
  try {
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.USERS.BY_ID(userId)}/stories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user posts");
        }

        const data = await response.json();

        // Convert API response to our format
        const posts: Post[] = data.map((item: any) => ({
          id: item._id || item.id,
          userId: item.user_id,
          imageUrl: item.media.url,
          createdAt: new Date(item.created_at).getTime(),
          caption: item.caption,
          likes: item.likes || [],
          comments: (item.comments || []).map((comment: any) => ({
            id: comment._id || comment.id,
            userId: comment.user_id,
            text: comment.text,
            createdAt: new Date(comment.created_at).getTime(),
          })),
          location: item.location
            ? {
                latitude: item.location.coordinates[1],
                longitude: item.location.coordinates[0],
              }
            : undefined,
        }));

        // Cache posts locally
        for (const post of posts) {
          await cachePost(post);
        }

        return posts;
      } catch (error) {
        console.error("Error fetching user posts from API:", error);
        // Fall back to local cache
      }
    }

    // Get from local cache
    const posts = await getPosts();
    return posts.filter((post) => post.userId === userId);
  } catch (error) {
    console.error("Error getting posts by user ID:", error);
    return [];
  }
};

/**
 * Get posts for the feed (posts from users the current user follows)
 * @returns Array of posts with user data
 */
export const getFeedPosts = async (): Promise<PostWithUser[]> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.LIST}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch feed posts");
        }

        const data = await response.json();

        // Convert API response to our format with user data
        const postsWithUsers: PostWithUser[] = data.map((item: any) => ({
          id: item._id || item.id,
          userId: item.user_id,
          imageUrl: item.media.url,
          createdAt: new Date(item.created_at).getTime(),
          caption: item.caption,
          likes: item.likes || [],
          comments: (item.comments || []).map((comment: any) => ({
            id: comment._id || comment.id,
            userId: comment.user_id,
            text: comment.text,
            createdAt: new Date(comment.created_at).getTime(),
          })),
          location: item.location
            ? {
                latitude: item.location.coordinates[1],
                longitude: item.location.coordinates[0],
              }
            : undefined,
          user: {
            id: item.user._id || item.user.id,
            username: item.user.username,
            profilePicture: item.user.avatar,
          },
        }));

        // Cache posts locally
        for (const post of postsWithUsers) {
          await cachePost(post);
        }

        return postsWithUsers;
      } catch (error) {
        console.error("Error fetching feed posts from API:", error);
        // Fall back to local cache
      }
    }

    // Get from local cache
    const posts = await getPosts();

    // Get the following list, include the current user's ID to also show their posts
    const following = [...(currentUser.following || []), currentUser.id];

    // Filter posts by users the current user follows
    const feedPosts = posts.filter((post) => following.includes(post.userId));

    // Sort by creation date (newest first)
    feedPosts.sort((a, b) => b.createdAt - a.createdAt);

    // Get user data for each post
    const postsWithUsers = await Promise.all(
      feedPosts.map(async (post) => {
        const user = await getUserById(post.userId);

        if (!user) {
          throw new Error("User not found");
        }

        return {
          ...post,
          user: {
            id: user.id,
            username: user.username,
            profilePicture: user.profilePicture,
          },
        };
      })
    );

    return postsWithUsers;
  } catch (error) {
    console.error("Error getting feed posts:", error);
    return [];
  }
};

/**
 * Like a post
 * @param postId Post ID
 * @returns Updated post
 */
export const likePost = async (postId: string): Promise<Post> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.LIKE(postId)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to like post");
        }

        // Update post locally
        const post = await getPostById(postId);

        if (!post) {
          throw new Error("Post not found");
        }

        if (!post.likes.includes(currentUser.id)) {
          post.likes.push(currentUser.id);
          await cachePost(post);
        }

        return post;
      } catch (error) {
        console.error("Error liking post online:", error);
        // Fall back to offline mode
      }
    }

    // Offline mode: update locally
    const posts = await getPosts();
    const postIndex = posts.findIndex((post) => post.id === postId);

    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    // Check if user already liked the post
    const post = posts[postIndex];

    if (!post.likes.includes(currentUser.id)) {
      // Add user to likes
      post.likes.push(currentUser.id);

      // Save updated posts
      await savePosts(posts);

      // Add to pending likes for later sync
      await addPendingLike(postId, "like");
    }

    return post;
  } catch (error) {
    console.error("Error liking post:", error);
    throw error;
  }
};

/**
 * Unlike a post
 * @param postId Post ID
 * @returns Updated post
 */
export const unlikePost = async (postId: string): Promise<Post> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.UNLIKE(postId)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to unlike post");
        }

        // Update post locally
        const post = await getPostById(postId);

        if (!post) {
          throw new Error("Post not found");
        }

        post.likes = post.likes.filter((id) => id !== currentUser.id);
        await cachePost(post);

        return post;
      } catch (error) {
        console.error("Error unliking post online:", error);
        // Fall back to offline mode
      }
    }

    // Offline mode: update locally
    const posts = await getPosts();
    const postIndex = posts.findIndex((post) => post.id === postId);

    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    // Remove user from likes
    const post = posts[postIndex];
    post.likes = post.likes.filter((id) => id !== currentUser.id);

    // Save updated posts
    await savePosts(posts);

    // Add to pending likes for later sync
    await addPendingLike(postId, "unlike");

    return post;
  } catch (error) {
    console.error("Error unliking post:", error);
    throw error;
  }
};

/**
 * Add a pending like action
 */
const addPendingLike = async (postId: string, action: "like" | "unlike"): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_LIKES_KEY });
    const pendingLikes = result.value ? JSON.parse(result.value) : [];

    // Check for existing actions on the same post
    const existingIndex = pendingLikes.findIndex((item: PendingLike) => item.postId === postId);

    if (existingIndex !== -1) {
      // Check if the action is different - if so, remove the previous one
      if (pendingLikes[existingIndex].action !== action) {
        pendingLikes.splice(existingIndex, 1);
      } else {
        // Same action, nothing to do
        return;
      }
    }

    // Add the new action
    pendingLikes.push({
      postId,
      action,
      timestamp: Date.now(),
    });

    await Preferences.set({
      key: PENDING_LIKES_KEY,
      value: JSON.stringify(pendingLikes),
    });
  } catch (error) {
    console.error("Error adding pending like action:", error);
  }
};

/**
 * Add a comment to a post
 * @param postId Post ID
 * @param text Comment text
 * @returns Updated post
 */
export const addComment = async (postId: string, text: string): Promise<Post> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.BY_ID(postId)}/comment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add comment");
        }

        // Get updated post
        return (await getPostById(postId)) as Post;
      } catch (error) {
        console.error("Error adding comment online:", error);
        // Fall back to offline mode
      }
    }

    // Offline mode: update locally
    const posts = await getPosts();
    const postIndex = posts.findIndex((post) => post.id === postId);

    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    // Create new comment
    const timestamp = Date.now();
    const newComment: Comment = {
      id: `comment_${timestamp}`,
      userId: currentUser.id,
      text,
      createdAt: timestamp,
    };

    // Add comment to post
    const post = posts[postIndex];
    post.comments.push(newComment);

    // Save updated posts
    await savePosts(posts);

    // Add to pending comments for later sync
    await addPendingComment(postId, text);

    return post;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

/**
 * Add a pending comment
 */
const addPendingComment = async (postId: string, text: string): Promise<void> => {
  try {
    const result = await Preferences.get({ key: PENDING_COMMENTS_KEY });
    const pendingComments = result.value ? JSON.parse(result.value) : [];

    pendingComments.push({
      postId,
      text,
      timestamp: Date.now(),
    });

    await Preferences.set({
      key: PENDING_COMMENTS_KEY,
      value: JSON.stringify(pendingComments),
    });
  } catch (error) {
    console.error("Error adding pending comment:", error);
  }
};

/**
 * Delete a post
 * @param postId Post ID
 * @returns True if post was deleted, false otherwise
 */
export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    if (isOnline()) {
      try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.BY_ID(postId)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to delete post");
        }

        // Remove from local cache
        await removePostFromCache(postId);

        return true;
      } catch (error) {
        console.error("Error deleting post online:", error);
        // Fall back to offline mode if the user is the owner
        const posts = await getPosts();
        const post = posts.find((p) => p.id === postId);

        if (post && post.userId === currentUser.id) {
          await removePostFromCache(postId);
          return true;
        }

        return false;
      }
    } else {
      // Offline mode: check if user is owner
      const posts = await getPosts();
      const post = posts.find((p) => p.id === postId);

      if (!post) {
        return false;
      }

      if (post.userId !== currentUser.id) {
        throw new Error("Unauthorized to delete this post");
      }

      // Remove from local cache
      await removePostFromCache(postId);

      return true;
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

/**
 * Remove a post from local cache
 */
const removePostFromCache = async (postId: string): Promise<void> => {
  try {
    const posts = await getPosts();
    const updatedPosts = posts.filter((post) => post.id !== postId);
    await savePosts(updatedPosts);
  } catch (error) {
    console.error("Error removing post from cache:", error);
  }
};

/**
 * Get comments for a post with user data
 * @param postId Post ID
 * @returns Array of comments with user data
 */
export const getCommentsWithUsers = async (postId: string): Promise<any[]> => {
  try {
    const post = await getPostById(postId);

    if (!post) {
      throw new Error("Post not found");
    }

    // Get unique user IDs from comments
    const userIds = [...new Set(post.comments.map((comment) => comment.userId))];

    // Get users data
    const users = await getUsersByIds(userIds);

    // Map users to comments
    return post.comments.map((comment) => {
      const user = users.find((user) => user.id === comment.userId);

      return {
        ...comment,
        user: user
          ? {
              id: user.id,
              username: user.username,
              profilePicture: user.profilePicture,
            }
          : null,
      };
    });
  } catch (error) {
    console.error("Error getting comments with users:", error);
    return [];
  }
};

/**
 * Sync pending posts with the server
 */
export const syncPendingPosts = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    // Sync pending posts
    const postsResult = await Preferences.get({ key: PENDING_POSTS_KEY });
    if (postsResult.value) {
      const pendingPosts: Post[] = JSON.parse(postsResult.value);

      for (const post of pendingPosts) {
        try {
          await createPost(post.imageUrl, post.caption);
        } catch (error) {
          console.error(`Error syncing post:`, error);
        }
      }

      // Clear pending posts
      await Preferences.set({ key: PENDING_POSTS_KEY, value: JSON.stringify([]) });
    }

    // Sync pending likes
    const likesResult = await Preferences.get({ key: PENDING_LIKES_KEY });
    if (likesResult.value) {
      const pendingLikes: PendingLike[] = JSON.parse(likesResult.value);

      for (const like of pendingLikes) {
        try {
          if (like.action === "like") {
            await likePost(like.postId);
          } else {
            await unlikePost(like.postId);
          }
        } catch (error) {
          console.error(`Error syncing like action:`, error);
        }
      }

      // Clear pending likes
      await Preferences.set({ key: PENDING_LIKES_KEY, value: JSON.stringify([]) });
    }

    // Sync pending comments
    const commentsResult = await Preferences.get({ key: PENDING_COMMENTS_KEY });
    if (commentsResult.value) {
      const pendingComments: PendingComment[] = JSON.parse(commentsResult.value);

      for (const comment of pendingComments) {
        try {
          await addComment(comment.postId, comment.text);
        } catch (error) {
          console.error(`Error syncing comment:`, error);
        }
      }

      // Clear pending comments
      await Preferences.set({ key: PENDING_COMMENTS_KEY, value: JSON.stringify([]) });
    }
  } catch (error) {
    console.error("Error syncing pending post actions:", error);
  }
};

/**
 * Set up connectivity listeners
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing posts...");
    await syncPendingPosts();
  });
};

// Initialize connectivity listeners
setupConnectivityListeners();
