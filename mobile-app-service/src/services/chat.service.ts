import { Preferences } from "@capacitor/preferences";
import { getCurrentUser, getUserById, getUsersByIds, User } from "./auth.service";
import { API_URL, API_ENDPOINTS, fetchApi } from "../config";

// Keys for storage
const CONVERSATIONS_KEY = "conversations";
const MESSAGES_KEY = "messages";
const PENDING_MESSAGES_KEY = "pending_messages";

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
    profilePicture?: string | null; // Modifié pour accepter null
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
    profilePicture?: string | null; // Modifié pour accepter null
  };
}

export interface PendingMessage {
  id: string;
  recipientId: string; // User ID or Group ID
  content: string;
  imageUrl?: string;
  isGroup: boolean;
  timestamp: number;
}

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Obtient le token d'authentification
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { getAuthToken: getToken } = await import("./auth.service");
    return await getToken();
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

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

    // Si nous sommes en ligne, essayer de récupérer depuis le serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        // Utiliser fetchApi qui gère le mode no-cors
        await fetchApi(API_ENDPOINTS.GROUPS.LIST, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Puisque nous ne pouvons pas lire la réponse, utilisons des données locales
      } catch (error) {
        console.error("Error fetching conversations from server:", error);
        // Continuer avec les données locales en cas d'erreur
      }
    }

    // Get all conversations from local storage
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

    // Si en ligne, essayer de créer la conversation sur le serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        await fetchApi(API_ENDPOINTS.GROUPS.CREATE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            members: [userId],
          }),
        });
      } catch (error) {
        console.error("Error creating conversation on server:", error);
        // Continuer avec la conversation locale en cas d'erreur
      }
    }

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

    // Si en ligne, essayer de créer le groupe sur le serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        await fetchApi(API_ENDPOINTS.GROUPS.CREATE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: groupName,
            members: userIds.filter((id) => id !== currentUser.id),
          }),
        });
      } catch (error) {
        console.error("Error creating group on server:", error);
        // Continuer avec le groupe local en cas d'erreur
      }
    }

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

    // Si en ligne, envoyer le message au serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        // Déterminer si c'est un message direct ou de groupe
        if (conversation.isGroup) {
          // Message de groupe
          await fetchApi(API_ENDPOINTS.MESSAGES.GROUP(conversationId), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content,
              media: imageUrl ? { url: imageUrl } : null,
            }),
          });
        } else {
          // Message direct - trouver l'autre utilisateur
          const recipientId = conversation.participants.find((id) => id !== currentUser.id);

          if (!recipientId) {
            throw new Error("Recipient not found");
          }

          await fetchApi(API_ENDPOINTS.MESSAGES.DIRECT(recipientId), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content,
              media: imageUrl ? { url: imageUrl } : null,
            }),
          });
        }
      } catch (error) {
        console.error("Error sending message to server:", error);
        // Ajouter aux messages en attente en cas d'erreur
        await addPendingMessage(conversationId, content, imageUrl, conversation.isGroup);
      }
    } else {
      // Mode hors ligne: ajouter aux messages en attente
      await addPendingMessage(conversationId, content, imageUrl, conversation.isGroup);
    }

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
 * Ajoute un message à la liste des messages en attente
 */
const addPendingMessage = async (
  conversationId: string,
  content: string,
  imageUrl?: string,
  isGroup: boolean = false
): Promise<void> => {
  try {
    // Trouver la conversation
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Déterminer le destinataire
    let recipientId: string;

    if (isGroup) {
      // Pour un groupe, utiliser l'ID de la conversation
      recipientId = conversationId;
    } else {
      // Pour un message direct, trouver l'autre utilisateur
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const otherId = conversation.participants.find((id) => id !== currentUser.id);

      if (!otherId) {
        throw new Error("Recipient not found");
      }

      recipientId = otherId;
    }

    // Créer le message en attente
    const pendingMessage: PendingMessage = {
      id: `pending_${Date.now()}`,
      recipientId,
      content,
      imageUrl,
      isGroup,
      timestamp: Date.now(),
    };

    // Récupérer les messages en attente
    const result = await Preferences.get({ key: PENDING_MESSAGES_KEY });
    const pendingMessages = result.value ? JSON.parse(result.value) : [];

    // Ajouter le message
    pendingMessages.push(pendingMessage);

    // Enregistrer
    await Preferences.set({
      key: PENDING_MESSAGES_KEY,
      value: JSON.stringify(pendingMessages),
    });
  } catch (error) {
    console.error("Error adding pending message:", error);
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

    // Si en ligne, essayer de récupérer les messages depuis le serveur
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        // Déterminer si c'est une conversation directe ou un groupe
        if (conversation.isGroup) {
          // Groupe
          await fetchApi(API_ENDPOINTS.MESSAGES.GROUP(conversationId), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          // Direct - trouver l'autre utilisateur
          const recipientId = conversation.participants.find((id) => id !== currentUser.id);

          if (!recipientId) {
            throw new Error("Recipient not found");
          }

          await fetchApi(API_ENDPOINTS.MESSAGES.DIRECT(recipientId), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }

        // Puisque nous ne pouvons pas lire la réponse, utilisons des données locales
      } catch (error) {
        console.error("Error fetching messages from server:", error);
        // Continuer avec les messages locaux en cas d'erreur
      }
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

/**
 * Synchronise les messages en attente avec le serveur
 */
export const syncPendingMessages = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const result = await Preferences.get({ key: PENDING_MESSAGES_KEY });
    if (!result.value) return;

    const pendingMessages: PendingMessage[] = JSON.parse(result.value);
    if (pendingMessages.length === 0) return;

    const token = await getAuthToken();
    if (!token) return;

    const successfulMessages: string[] = [];

    for (const message of pendingMessages) {
      try {
        // Déterminer le type de message (direct ou groupe)
        if (message.isGroup) {
          // Message de groupe
          await fetchApi(API_ENDPOINTS.MESSAGES.GROUP(message.recipientId), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: message.content,
              media: message.imageUrl ? { url: message.imageUrl } : null,
            }),
          });
        } else {
          // Message direct
          await fetchApi(API_ENDPOINTS.MESSAGES.DIRECT(message.recipientId), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: message.content,
              media: message.imageUrl ? { url: message.imageUrl } : null,
            }),
          });
        }

        // Marquer comme réussi
        successfulMessages.push(message.id);
      } catch (error) {
        console.error(`Error syncing message ${message.id}:`, error);
      }
    }

    // Supprimer les messages envoyés avec succès
    if (successfulMessages.length > 0) {
      const remainingMessages = pendingMessages.filter((message) => !successfulMessages.includes(message.id));

      await Preferences.set({
        key: PENDING_MESSAGES_KEY,
        value: JSON.stringify(remainingMessages),
      });
    }
  } catch (error) {
    console.error("Error syncing pending messages:", error);
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

/**
 * Configure les écouteurs d'événements pour la synchronisation
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: synchronizing pending messages...");
    await syncPendingMessages();
  });
};

// Initialiser les écouteurs
setupConnectivityListeners();
