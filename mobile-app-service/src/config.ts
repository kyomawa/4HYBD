/**
 * Configuration du backend API
 */

// URL de base de l'API
export const API_URL = import.meta.env.VITE_API_URL as string;

// Version de l'API
export const API_VERSION = "1.0.0";

// Délai de timeout pour les requêtes API (en millisecondes)
export const API_TIMEOUT = 15000; // 15 secondes

// Nombre maximum de tentatives de reconnexion
export const MAX_RETRY_ATTEMPTS = 3;

// Configuration des paramètres d'application
export const APP_CONFIG = {
  // Taille maximale des médias en octets (10 Mo)
  MAX_MEDIA_SIZE: 10 * 1024 * 1024,

  // Durée maximale des vidéos en secondes (10s)
  MAX_VIDEO_DURATION: 10,

  // Temps d'expiration des stories en secondes (24h)
  STORY_EXPIRY_TIME: 86400,

  // Intervalle de mise à jour des données en millisecondes (5 min)
  DATA_REFRESH_INTERVAL: 5 * 60 * 1000,

  // Distance maximale pour les stories "à proximité" en mètres (20 km)
  NEARBY_MAX_DISTANCE: 20000,

  // Taille du cache des médias en octets (50 Mo)
  MEDIA_CACHE_SIZE: 50 * 1024 * 1024,

  // Délai de notification quotidienne par défaut ("12:00")
  DEFAULT_NOTIFICATION_TIME: "12:00",
};

// Mode de fonctionnement de l'application
export enum AppMode {
  ONLINE = "online", // Mode connecté au backend
  OFFLINE = "offline", // Mode hors-ligne avec données locales
  HYBRID = "hybrid", // Mode hybride (préférence online, fallback offline)
}

// Le mode par défaut de l'application
export const DEFAULT_APP_MODE = AppMode.HYBRID;

/**
 * Déterminer si l'application doit fonctionner en mode online ou offline
 * Cette fonction peut être modifiée pour implémenter une logique plus complexe
 * ex: vérifier la qualité de la connexion, le mode économie de données, etc.
 */
export const shouldUseOnlineMode = (): boolean => {
  // Par défaut, on vérifie simplement si l'appareil est connecté à Internet
  return typeof navigator !== "undefined" && navigator.onLine;
};

/**
 * Configuration des endpoints de l'API
 * Cela permet de centraliser tous les endpoints et de faciliter les modifications
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: "auth/register",
    LOGIN: "auth/login",
    ME: "auth/me",
  },

  // Users
  USERS: {
    LIST: "users",
    ME: "users/me",
    BY_ID: (id: string) => `users/${id}`,
  },

  // Friends
  FRIENDS: {
    LIST: "friends",
    REQUESTS: "friends/requests",
    FIND: "friends/find",
    REQUEST: (userId: string) => `friends/request/${userId}`,
    ACCEPT: (requestId: string) => `friends/accept/${requestId}`,
    REJECT: (requestId: string) => `friends/reject/${requestId}`,
    DELETE: (userId: string) => `friends/${userId}`,
  },

  // Messages
  MESSAGES: {
    DIRECT: (userId: string) => `messages/${userId}`,
    GROUP: (groupId: string) => `messages/groups/${groupId}`,
    DELETE: (messageId: string) => `messages/${messageId}`,
  },

  // Groups
  GROUPS: {
    LIST: "groups",
    CREATE: "groups",
    BY_ID: (groupId: string) => `groups/${groupId}`,
    MEMBERS: (groupId: string) => `groups/${groupId}/members`,
    REMOVE_MEMBER: (groupId: string, userId: string) =>
      `groups/${groupId}/members/${userId}`,
  },

  // Media
  MEDIA: {
    UPLOAD: "media/upload",
    BY_ID: (mediaId: string) => `media/${mediaId}`,
  },

  // Stories
  STORIES: {
    LIST: "stories",
    NEARBY: "stories/nearby",
    CREATE: "stories",
    BY_ID: (storyId: string) => `stories/${storyId}`,
    VIEW: (storyId: string) => `stories/${storyId}/view`,
    LIKE: (storyId: string) => `stories/${storyId}/like`,
    UNLIKE: (storyId: string) => `stories/${storyId}/unlike`,
  },

  // Location
  LOCATION: {
    UPDATE: "location/update",
    NEARBY_USERS: "location/nearby/users",
    PRIVACY: "location/privacy",
  },
};
