export const API_ENDPOINTS = {
  auth: {
    login: 'auth/login',
    register: 'auth/register',
    logout: 'auth/logout',
    refresh: 'auth/refresh',
    me: 'auth/me'
  },
  stories: {
    create: '/stories',
    list: '/stories',
    get: (id: string) => `stories/${id}`,
    update: (id: string) => `stories/${id}`,
    delete: (id: string) => `stories/${id}`,
    nearby: 'stories/nearby'
  },
  users: {
    profile: 'users/profile',
    update: 'users/profile',
    search: 'users/search',
    follow: (id: string) => `users/${id}/follow`,
    unfollow: (id: string) => `users/${id}/unfollow`
  },
  media: {
    upload: 'media/upload',
    delete: (id: string) => `media/${id}`
  },
  location: {
    update: 'location/update',
    privacy: 'location/privacy',
    nearby: 'location/nearby'
  }
} as const; 