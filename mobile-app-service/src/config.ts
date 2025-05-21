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
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string | number | boolean>;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  // Assurer qu'il n'y a pas de slash au début de l'endpoint
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${API_URL}/${cleanEndpoint}`;
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

// Types pour les endpoints
export interface ApiEndpoints {
  auth: {
    login: string;
    register: string;
    logout: string;
    refresh: string;
    me: string;
  };
  users: {
    byId: (id: string) => string;
    update: string;
    delete: string;
    search: string;
    follow: (id: string) => string;
    unfollow: (id: string) => string;
  };
  stories: {
    create: string;
    byId: (id: string) => string;
    byUser: (userId: string) => string;
    feed: string;
    nearby: string;
    delete: (id: string) => string;
    media: string;
    view: (id: string) => string;
    like: (id: string) => string;
    unlike: (id: string) => string;
  };
  chat: {
    conversations: string;
    messages: (conversationId: string) => string;
    send: (conversationId: string) => string;
    create: string;
    addUser: (conversationId: string) => string;
    removeUser: (conversationId: string, userId: string) => string;
    leave: (conversationId: string) => string;
  };
  location: {
    update: string;
    nearby: string;
    status: string;
  };
  media: {
    upload: string;
    delete: (id: string) => string;
  };
}

// Endpoints de l'API
export const API_ENDPOINTS = {
  auth: {
    login: "auth/login",
    register: "auth/register",
    logout: "auth/logout",
    refresh: "auth/refresh",
    me: "auth/me",
  },
  users: {
    byId: (id: string) => `users/${id}`,
    update: "users/update",
    delete: "users/delete",
    search: "users/search",
    follow: (id: string) => `users/${id}/follow`,
    unfollow: (id: string) => `users/${id}/unfollow`,
  },
  stories: {
    create: "stories/create",
    byId: (id: string) => `stories/${id}`,
    byUser: (userId: string) => `stories/user/${userId}`,
    feed: "stories/feed",
    nearby: "stories/nearby",
    delete: (id: string) => `stories/${id}`,
    media: (id: string) => `stories/${id}/media`,
    view: (id: string) => `stories/${id}/view`,
    like: (id: string) => `stories/${id}/like`,
    unlike: (id: string) => `stories/${id}/unlike`,
  },
  chat: {
    conversations: "chat/conversations",
    messages: (conversationId: string) => `chat/conversations/${conversationId}/messages`,
    send: "chat/messages/send",
    create: "chat/conversations/create",
    addUser: (conversationId: string) => `chat/conversations/${conversationId}/add-user`,
    removeUser: (conversationId: string) => `chat/conversations/${conversationId}/remove-user`,
    leave: (conversationId: string) => `chat/conversations/${conversationId}/leave`,
  },
  location: {
    update: "location/update",
    nearby: "location/nearby",
    status: "location/status",
  },
  media: {
    upload: "media/upload",
    delete: (id: string) => `media/${id}`,
  },
} as const;
