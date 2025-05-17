import { Preferences } from "@capacitor/preferences";
import { getCurrentUser, getUserById, getUsersByIds, User } from "./auth.service";

// Keys for storage
const CONVERSATIONS_KEY = "conversations";
const MESSAGES_KEY = "messages";

export interface Conversation {
  id: string;
  participants: string[]; // Array of user IDs
  lastMessage?: Message;
  createdAt: number;
  updatedAt: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
}

export interface ConversationWithUsers extends Conversation {
  users: Array<{
    id: string;
    username: string;
    profilePicture?: string;
  }>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  isRead: boolean;
}

export interface MessageWithUser extends Message {
  sender: {
    id: string;
    username: string;
    profilePicture?: string;
  };
}

/**
 * Get all conversations for the current user
 * @returns Array of conversations with user data
 */
export const getConversations = async (): Promise<ConversationWithUsers[]> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get all conversations
    const conversations = await getAllConversations();

    // Filter conversations for the current user
    const userConversations = conversations.filter((conv) => conv.participants.includes(currentUser.id));

    // Sort by updatedAt (newest first)
    userConversations.sort((a, b) => b.updatedAt - a.updatedAt);

    // Get user data for each conversation
    const conversationsWithUsers = await Promise.all(
      userConversations.map(async (conv) => {
        // For group chats, we don't need to get all users
        if (conv.isGroup) {
          return {
            ...conv,
            users: [],
          };
        }

        // For direct chats, get the other user
        const otherUserId = conv.participants.find((id) => id !== currentUser.id);

        if (!otherUserId) {
          return {
            ...conv,
            users: [],
          };
        }

        const otherUser = await getUserById(otherUserId);

        if (!otherUser) {
          return {
            ...conv,
            users: [],
          };
        }

        return {
          ...conv,
          users: [
            {
              id: otherUser.id,
              username: otherUser.username,
              profilePicture: otherUser.profilePicture,
            },
          ],
        };
      })
    );

    return conversationsWithUsers;
  } catch (error) {
    console.error("Error getting conversations:", error);
    return [];
  }
};

/**
 * Get a conversation by ID with user data
 * @param conversationId Conversation ID
 * @returns Conversation with user data or null if not found
 */
export const getConversationById = async (conversationId: string): Promise<ConversationWithUsers | null> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get all conversations
    const conversations = await getAllConversations();

    // Find the conversation
    const conversation = conversations.find((conv) => conv.id === conversationId);

    if (!conversation) {
      return null;
    }

    // Check if user is a participant
    if (!conversation.participants.includes(currentUser.id)) {
      throw new Error("Unauthorized");
    }

    // Get user data for the conversation
    if (conversation.isGroup) {
      // For group chats, get all participants except current user
      const otherUserIds = conversation.participants.filter((id) => id !== currentUser.id);
      const otherUsers = await getUsersByIds(otherUserIds);

      return {
        ...conversation,
        users: otherUsers.map((user) => ({
          id: user.id,
          username: user.username,
          profilePicture: user.profilePicture,
        })),
      };
    } else {
      // For direct chats, get the other user
      const otherUserId = conversation.participants.find((id) => id !== currentUser.id);

      if (!otherUserId) {
        return {
          ...conversation,
          users: [],
        };
      }

      const otherUser = await getUserById(otherUserId);

      if (!otherUser) {
        return {
          ...conversation,
          users: [],
        };
      }

      return {
        ...conversation,
        users: [
          {
            id: otherUser.id,
            username: otherUser.username,
            profilePicture: otherUser.profilePicture,
          },
        ],
      };
    }
  } catch (error) {
    console.error("Error getting conversation by ID:", error);
    return null;
  }
};

/**
 * Get or create a conversation between users
 * @param userId ID of the user to chat with
 * @returns Created or existing conversation
 */
export const getOrCreateConversation = async (userId: string): Promise<ConversationWithUsers> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get all conversations
    const conversations = await getAllConversations();

    // Try to find an existing direct conversation between the users
    const existingConversation = conversations.find(
      (conv) => !conv.isGroup && conv.participants.includes(currentUser.id) && conv.participants.includes(userId)
    );

    if (existingConversation) {
      // Get user data
      const otherUser = await getUserById(userId);

      if (!otherUser) {
        throw new Error("User not found");
      }

      return {
        ...existingConversation,
        users: [
          {
            id: otherUser.id,
            username: otherUser.username,
            profilePicture: otherUser.profilePicture,
          },
        ],
      };
    }

    // Create a new conversation
    const timestamp = new Date().getTime();
    const newConversation: Conversation = {
      id: `conv_${timestamp}`,
      participants: [currentUser.id, userId],
      createdAt: timestamp,
      updatedAt: timestamp,
      isGroup: false,
    };

    // Save the new conversation
    await saveConversation(newConversation);

    // Get user data
    const otherUser = await getUserById(userId);

    if (!otherUser) {
      throw new Error("User not found");
    }

    return {
      ...newConversation,
      users: [
        {
          id: otherUser.id,
          username: otherUser.username,
          profilePicture: otherUser.profilePicture,
        },
      ],
    };
  } catch (error) {
    console.error("Error getting or creating conversation:", error);
    throw error;
  }
};

/**
 * Create a group conversation
 * @param userIds Array of user IDs to include in the group
 * @param groupName Name of the group
 * @param groupAvatar Optional avatar for the group
 * @returns Created group conversation
 */
export const createGroupConversation = async (
  userIds: string[],
  groupName: string,
  groupAvatar?: string
): Promise<ConversationWithUsers> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Make sure current user is included
    if (!userIds.includes(currentUser.id)) {
      userIds.push(currentUser.id);
    }

    // Create a new conversation
    const timestamp = new Date().getTime();
    const newConversation: Conversation = {
      id: `conv_${timestamp}`,
      participants: userIds,
      createdAt: timestamp,
      updatedAt: timestamp,
      isGroup: true,
      groupName,
      groupAvatar,
    };

    // Save the new conversation
    await saveConversation(newConversation);

    // Get user data
    const otherUserIds = userIds.filter((id) => id !== currentUser.id);
    const otherUsers = await getUsersByIds(otherUserIds);

    return {
      ...newConversation,
      users: otherUsers.map((user) => ({
        id: user.id,
        username: user.username,
        profilePicture: user.profilePicture,
      })),
    };
  } catch (error) {
    console.error("Error creating group conversation:", error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 * @param conversationId Conversation ID
 * @param content Message content
 * @param imageUrl Optional image URL
 * @returns Sent message
 */
export const sendMessage = async (
  conversationId: string,
  content: string,
  imageUrl?: string
): Promise<MessageWithUser> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get the conversation
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Create new message
    const timestamp = new Date().getTime();
    const newMessage: Message = {
      id: `msg_${timestamp}`,
      conversationId,
      senderId: currentUser.id,
      content,
      imageUrl,
      createdAt: timestamp,
      isRead: false,
    };

    // Get all messages
    const messages = await getAllMessages();

    // Add new message
    messages.push(newMessage);

    // Save updated messages
    await Preferences.set({
      key: MESSAGES_KEY,
      value: JSON.stringify(messages),
    });

    // Update conversation's lastMessage and updatedAt
    await updateConversation(conversationId, {
      lastMessage: newMessage,
      updatedAt: timestamp,
    });

    return {
      ...newMessage,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        profilePicture: currentUser.profilePicture,
      },
    };
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 * @param conversationId Conversation ID
 * @returns Array of messages with sender data
 */
export const getMessages = async (conversationId: string): Promise<MessageWithUser[]> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get the conversation
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Get all messages
    const allMessages = await getAllMessages();

    // Filter messages for this conversation
    const conversationMessages = allMessages.filter((msg) => msg.conversationId === conversationId);

    // Sort by creation date (oldest first)
    conversationMessages.sort((a, b) => a.createdAt - b.createdAt);

    // Get unique user IDs from messages
    const userIds = [...new Set(conversationMessages.map((msg) => msg.senderId))];

    // Get users data
    const users = await getUsersByIds(userIds);

    // Mark messages as read
    await markMessagesAsRead(conversationId);

    // Map users to messages
    return conversationMessages.map((message) => {
      const sender = users.find((user) => user.id === message.senderId);

      return {
        ...message,
        sender: sender
          ? {
              id: sender.id,
              username: sender.username,
              profilePicture: sender.profilePicture,
            }
          : {
              id: message.senderId,
              username: "Unknown User",
              profilePicture: undefined,
            },
      };
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    return [];
  }
};

/**
 * Mark all messages in a conversation as read
 * @param conversationId Conversation ID
 */
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Get all messages
    const messages = await getAllMessages();

    // Find unread messages for this conversation that were not sent by the current user
    let updated = false;

    messages.forEach((message) => {
      if (message.conversationId === conversationId && message.senderId !== currentUser.id && !message.isRead) {
        message.isRead = true;
        updated = true;
      }
    });

    if (updated) {
      // Save updated messages
      await Preferences.set({
        key: MESSAGES_KEY,
        value: JSON.stringify(messages),
      });
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

/**
 * Get the number of unread messages for the current user
 * @returns Number of unread messages
 */
export const getUnreadMessagesCount = async (): Promise<number> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return 0;
    }

    // Get all messages
    const messages = await getAllMessages();

    // Count unread messages not sent by the current user
    const unreadCount = messages.filter((message) => !message.isRead && message.senderId !== currentUser.id).length;

    return unreadCount;
  } catch (error) {
    console.error("Error getting unread messages count:", error);
    return 0;
  }
};

// ---- Helper functions ----

/**
 * Get all conversations from storage
 * @returns Array of conversations
 */
const getAllConversations = async (): Promise<Conversation[]> => {
  const result = await Preferences.get({ key: CONVERSATIONS_KEY });

  if (result.value) {
    return JSON.parse(result.value);
  }

  return [];
};

/**
 * Save a conversation to storage
 * @param conversation Conversation to save
 */
const saveConversation = async (conversation: Conversation): Promise<void> => {
  const conversations = await getAllConversations();

  conversations.push(conversation);

  await Preferences.set({
    key: CONVERSATIONS_KEY,
    value: JSON.stringify(conversations),
  });
};

/**
 * Update a conversation
 * @param conversationId Conversation ID
 * @param updates Object with properties to update
 */
const updateConversation = async (conversationId: string, updates: Partial<Conversation>): Promise<void> => {
  const conversations = await getAllConversations();

  const index = conversations.findIndex((conv) => conv.id === conversationId);

  if (index !== -1) {
    conversations[index] = {
      ...conversations[index],
      ...updates,
    };

    await Preferences.set({
      key: CONVERSATIONS_KEY,
      value: JSON.stringify(conversations),
    });
  }
};

/**
 * Get all messages from storage
 * @returns Array of messages
 */
const getAllMessages = async (): Promise<Message[]> => {
  const result = await Preferences.get({ key: MESSAGES_KEY });

  if (result.value) {
    return JSON.parse(result.value);
  }

  return [];
};
