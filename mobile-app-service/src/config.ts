// Base and proxy/API configuration
export const API_URL: string = import.meta.env.VITE_API_URL || "http://192.168.1.11/api";
export const API_VERSION: string = "1.0.0";
export const API_TIMEOUT: number = 15000;
export const MAX_RETRY_ATTEMPTS: number = 3;

export const APP_CONFIG = {
  MAX_MEDIA_SIZE: 10 * 1024 * 1024,
  MAX_VIDEO_DURATION: 10, // en secondes
  STORY_EXPIRY_TIME: 24 * 60 * 60, // en secondes
  DATA_REFRESH_INTERVAL: 5 * 60 * 1000,
  NEARBY_MAX_DISTANCE: 20_000, // en mètres
  MEDIA_CACHE_SIZE: 50 * 1024 * 1024, // en octets
  DEFAULT_NOTIFICATION_TIME: "12:00",
};

export enum AppMode {
  ONLINE = "online",
  OFFLINE = "offline",
  HYBRID = "hybrid",
}
export const DEFAULT_APP_MODE = AppMode.HYBRID;

// Generic fetch wrapper and types
export type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
};
export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

// Auth login helper
export interface LoginPayload {
  credential: string;
  password: string;
}
export interface LoginResponse {
  session_token: string;
  host: string;
  path: string;
  session: boolean;
  secure: boolean;
}
export function login(payload: LoginPayload): Promise<LoginResponse> {
  return fetchApi<LoginResponse>("auth/login", {
    method: "POST",
    body: payload,
  });
}

// Centralized endpoints, no leading slashes
export const endpoints = {
  auth: {
    register: "auth/register",
    login: "auth/login",
    me: "auth/me",
  },
  users: {
    list: "users",
    me: "users/me",
    byId: (id: string) => `users/${id}`,
  },
  friends: {
    list: "friends",
    requests: "friends/requests",
    find: "friends/find",
    send: (id: string) => `friends/request/${id}`,
    accept: (id: string) => `friends/accept/${id}`,
    remove: (id: string) => `friends/${id}`,
  },
  messages: {
    direct: (id: string) => `messages/${id}`,
    send: (id: string) => `messages/${id}`,
    media: (id: string, text?: string) =>
      `messages/${id}/media${text ? `?text_content=${encodeURIComponent(text)}` : ""}`,
  },
  groups: {
    list: "groups",
    byId: (g: string) => `groups/${g}`,
    create: "groups",
    update: (g: string) => `groups/${g}`,
    addMembers: (g: string) => `groups/${g}/members`,
    removeMember: (g: string, u: string) => `groups/${g}/members/${u}`,
    delete: (g: string) => `groups/${g}`,
  },
  stories: {
    list: "stories",
    nearby: "stories/nearby",
    create: "stories",
    byId: (s: string) => `stories/${s}`,
    delete: (s: string) => `stories/${s}`,
    upload: (type: string = "Point", coords?: [number, number]) =>
      `stories/media?type=${type}${coords ? `&coordinates=[${coords[0]},${coords[1]}]` : ""}`,
  },
  location: {
    update: "location/update",
    nearbyUsers: (lon: number, lat: number, r = 5000, l = 50) =>
      `location/nearby/users?longitude=${lon}&latitude=${lat}&radius=${r}&limit=${l}`,
  },
};

// — Extension avec alias MAJUSCULES et méthodes manquantes —
const extendedEndpoints = {
  ...endpoints,

  // Users
  USERS: {
    ...endpoints.users,
    LIST: endpoints.users.list,
    ME: endpoints.users.me,
    BY_ID: endpoints.users.byId,
  },

  // Messages
  MESSAGES: {
    ...endpoints.messages,
    DIRECT: endpoints.messages.direct,
    SEND: endpoints.messages.send,
    MEDIA: endpoints.messages.media,
    GROUP: (groupId: string) => `groups/${groupId}/messages`,
  },

  // Groups
  GROUPS: {
    ...endpoints.groups,
    LIST: endpoints.groups.list,
    BY_ID: endpoints.groups.byId,
    CREATE: endpoints.groups.create,
    UPDATE: endpoints.groups.update,
    ADD_MEMBERS: endpoints.groups.addMembers,
    REMOVE_MEMBER: endpoints.groups.removeMember,
    DELETE: endpoints.groups.delete,
  },

  // Stories (+ LIKE / UNLIKE)
  STORIES: {
    ...endpoints.stories,
    LIST: endpoints.stories.list,
    NEARBY: endpoints.stories.nearby,
    CREATE: endpoints.stories.create,
    BY_ID: endpoints.stories.byId,
    DELETE: endpoints.stories.delete,
    UPLOAD: endpoints.stories.upload,
    LIKE: (id: string) => `stories/${id}/like`,
    UNLIKE: (id: string) => `stories/${id}/unlike`,
  },

  // Location
  LOCATION: {
    UPDATE: endpoints.location.update,
    NEARBY_USERS: endpoints.location.nearbyUsers,
    PRIVACY: "location/privacy",
  },

  // Media (pour storage.service.ts)
  MEDIA: {
    BY_ID: (id: string) => `media/${id}`,
    UPLOAD: "media",
  },
};

export const API_ENDPOINTS = extendedEndpoints;
