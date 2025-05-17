import { Preferences } from "@capacitor/preferences";
import { getUserById, getCurrentUser, getUsersByIds } from "./auth.service";

// Key for posts in storage
const POSTS_STORAGE_KEY = "posts";

export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  createdAt: number;
  caption?: string;
  likes: string[]; // Array of user IDs who have liked the post
  comments: Comment[];
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
    const newPost: Post = {
      id: `post_${timestamp}`,
      userId: currentUser.id,
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
    await Preferences.set({
      key: POSTS_STORAGE_KEY,
      value: JSON.stringify(posts),
    });

    return newPost;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
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

    // Get all posts
    const allPosts = await getPosts();

    // Get the following list, include the current user's ID to also show their posts
    const following = [...(currentUser.following || []), currentUser.id];

    // Filter posts by users the current user follows
    const feedPosts = allPosts.filter((post) => following.includes(post.userId));

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

    // Get all posts
    const posts = await getPosts();

    // Find the post
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
      await Preferences.set({
        key: POSTS_STORAGE_KEY,
        value: JSON.stringify(posts),
      });
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

    // Get all posts
    const posts = await getPosts();

    // Find the post
    const postIndex = posts.findIndex((post) => post.id === postId);

    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    // Remove user from likes
    const post = posts[postIndex];
    post.likes = post.likes.filter((userId) => userId !== currentUser.id);

    // Save updated posts
    await Preferences.set({
      key: POSTS_STORAGE_KEY,
      value: JSON.stringify(posts),
    });

    return post;
  } catch (error) {
    console.error("Error unliking post:", error);
    throw error;
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

    // Get all posts
    const posts = await getPosts();

    // Find the post
    const postIndex = posts.findIndex((post) => post.id === postId);

    if (postIndex === -1) {
      throw new Error("Post not found");
    }

    // Create new comment
    const timestamp = new Date().getTime();
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
    await Preferences.set({
      key: POSTS_STORAGE_KEY,
      value: JSON.stringify(posts),
    });

    return post;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
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

    // Get all posts
    const posts = await getPosts();

    // Find the post
    const post = posts.find((post) => post.id === postId);

    if (!post) {
      return false;
    }

    // Check if user is the owner of the post
    if (post.userId !== currentUser.id) {
      throw new Error("Unauthorized");
    }

    // Remove the post
    const updatedPosts = posts.filter((post) => post.id !== postId);

    // Save updated posts
    await Preferences.set({
      key: POSTS_STORAGE_KEY,
      value: JSON.stringify(updatedPosts),
    });

    return true;
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
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
