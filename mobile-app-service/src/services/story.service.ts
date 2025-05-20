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

export interface Story {
  id: string;
  caption?: string;
  location?: { latitude: number; longitude: number };
  views: string[];
  createdAt: number;
  expiresAt: number;
  userId: string;
  mediaUrl: string;
  photoData?: PhotoData;
  locationName?: string;
}

export interface StoryWithUser extends Story {
  user: User;
  viewed: boolean;
}

const isOnline = (): boolean => navigator.onLine;

export const markStoryAsViewed = async (storyId: string): Promise<void> => {
  if (isOnline()) {
    const token = await getAuthToken();
    await fetch(`${API_URL}/${API_ENDPOINTS.STORIES.BY_ID(storyId)}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  const viewed = await getViewedStories();
  if (!viewed.includes(storyId)) {
    viewed.push(storyId);
    await Preferences.set({ key: VIEWED_STORIES_KEY, value: JSON.stringify(viewed) });
  }
};

export const getViewedStories = async (): Promise<string[]> => {
  const res = await Preferences.get({ key: VIEWED_STORIES_KEY });
  return res.value ? JSON.parse(res.value) : [];
};

export const createStory = async (photoData: PhotoData, caption?: string): Promise<Story> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("User not authenticated");
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;
  const coords = photoData.location
    ? { type: "Point", coordinates: [photoData.location.longitude, photoData.location.latitude] }
    : undefined;

  const mediaUrl = await uploadMedia(photoData.webPath, "image");

  if (isOnline()) {
    const token = await getAuthToken();
    const body: any = { media: { media_type: "Image", url: mediaUrl, duration: null } };
    if (coords) body.location = coords;
    if (caption) body.caption = caption;

    const res = await fetch(`${API_URL}/${API_ENDPOINTS.STORIES.CREATE}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create story");

    const story: Story = {
      id: data._id || data.id,
      caption: data.caption,
      location: data.location
        ? { latitude: data.location.coordinates[1], longitude: data.location.coordinates[0] }
        : undefined,
      views: data.views || [],
      createdAt: new Date(data.created_at).getTime(),
      expiresAt: new Date(data.expires_at).getTime(),
      userId: data.user_id,
      mediaUrl: data.media.url,
    };
    await cacheStory(story);
    return story;
  }

  return createOfflineStory(photoData, caption, currentUser.id, mediaUrl, coords, now, expiresAt);
};

const createOfflineStory = async (
  photoData: PhotoData,
  caption: string | undefined,
  userId: string,
  mediaUrl: string,
  coords: any,
  createdAt: number,
  expiresAt: number
): Promise<Story> => {
  const newStory: Story = {
    id: `story_${createdAt}`,
    caption,
    location: coords ? { latitude: coords.coordinates[1], longitude: coords.coordinates[0] } : undefined,
    views: [],
    createdAt,
    expiresAt,
    userId,
    mediaUrl,
    photoData,
  };
  const all = await getOfflineStories();
  all.push(newStory);
  await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(all) });
  await addPendingStory(newStory);
  return newStory;
};

const addPendingStory = async (story: Story): Promise<void> => {
  const res = await Preferences.get({ key: PENDING_STORIES_KEY });
  const list: Story[] = res.value ? JSON.parse(res.value) : [];
  list.push(story);
  await Preferences.set({ key: PENDING_STORIES_KEY, value: JSON.stringify(list) });
};

const cacheStory = async (story: Story): Promise<void> => {
  const all = await getOfflineStories();
  const idx = all.findIndex((s) => s.id === story.id);
  if (idx >= 0) all[idx] = story;
  else all.push(story);
  await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(all) });
};

export const getOfflineStories = async (): Promise<Story[]> => {
  const res = await Preferences.get({ key: STORIES_STORAGE_KEY });
  const list: Story[] = res.value ? JSON.parse(res.value) : [];
  const now = Date.now();
  const active = list.filter((s) => s.expiresAt > now);
  if (active.length < list.length) await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(active) });
  return active;
};

export const getFeedStories = async (): Promise<StoryWithUser[]> => {
  const viewed = await getViewedStories();
  if (isOnline()) {
    const token = await getAuthToken();
    const res = await fetch(`${API_URL}/${API_ENDPOINTS.STORIES.LIST}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch stories");
    const data = await res.json();
    return await Promise.all(
      data.map(async (item: any): Promise<StoryWithUser> => {
        const base: Story = {
          id: item._id || item.id,
          caption: item.caption,
          location: item.location
            ? { latitude: item.location.coordinates[1], longitude: item.location.coordinates[0] }
            : undefined,
          views: item.views || [],
          createdAt: new Date(item.created_at).getTime(),
          expiresAt: new Date(item.expires_at).getTime(),
          userId: item.user_id,
          mediaUrl: item.media.url,
        };
        const user = await getUserById(base.userId);
        if (!user) throw new Error("User not found");
        return { ...base, user, viewed: viewed.includes(item._id || item.id) };
      })
    );
  }
  // offline feed: own stories
  const offline = await getOfflineStories();
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("User not authenticated");
  return offline.map((s) => ({ ...s, user: currentUser, viewed: viewed.includes(s.id) }));
};

export const getNearbyStories = async (maxDistance: number = 20): Promise<StoryWithUser[]> => {
  if (!isOnline()) return [];
  const loc = await getCurrentLocation();
  if (!loc) return [];
  const viewed = await getViewedStories();
  const token = await getAuthToken();
  const res = await fetch(
    `${API_URL}/${API_ENDPOINTS.STORIES.NEARBY}?latitude=${loc.latitude}&longitude=${loc.longitude}&radius=${
      maxDistance * 1000
    }`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch nearby stories");
  const data = await res.json();
  return await Promise.all(
    data.map(async (item: any): Promise<StoryWithUser> => {
      const base: Story = {
        id: item._id || item.id,
        caption: item.caption,
        location: item.location
          ? { latitude: item.location.coordinates[1], longitude: item.location.coordinates[0] }
          : undefined,
        views: item.views || [],
        createdAt: new Date(item.created_at).getTime(),
        expiresAt: new Date(item.expires_at).getTime(),
        userId: item.user_id,
        mediaUrl: item.media.url,
      };
      const user = await getUserById(base.userId);
      if (!user) throw new Error("User not found");
      return { ...base, user, viewed: viewed.includes(item._id || item.id) };
    })
  );
};

export const deleteStory = async (storyId: string): Promise<boolean> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("User not authenticated");
  if (isOnline()) {
    const token = await getAuthToken();
    const res = await fetch(`${API_URL}/${API_ENDPOINTS.STORIES.BY_ID(storyId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await deleteOfflineStory(storyId);
      return true;
    }
  }
  return deleteOfflineStory(storyId);
};

const deleteOfflineStory = async (storyId: string): Promise<boolean> => {
  const res = await Preferences.get({ key: STORIES_STORAGE_KEY });
  const list: Story[] = res.value ? JSON.parse(res.value) : [];
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  const updated = list.filter((s) => s.id !== storyId || s.userId !== currentUser.id);
  await Preferences.set({ key: STORIES_STORAGE_KEY, value: JSON.stringify(updated) });
  await removePendingStory(storyId);
  return list.length !== updated.length;
};

const removePendingStory = async (storyId: string): Promise<void> => {
  const res = await Preferences.get({ key: PENDING_STORIES_KEY });
  const list: Story[] = res.value ? JSON.parse(res.value) : [];
  await Preferences.set({ key: PENDING_STORIES_KEY, value: JSON.stringify(list.filter((s) => s.id !== storyId)) });
};

export const syncPendingStories = async (): Promise<void> => {
  if (!isOnline()) return;
  const res = await Preferences.get({ key: PENDING_STORIES_KEY });
  const pending: Story[] = res.value ? JSON.parse(res.value) : [];
  const token = await getAuthToken();
  for (const st of pending) {
    if (!st.photoData) continue;
    try {
      const mediaUrl = await uploadMedia(st.photoData.webPath, "image");
      const body: any = { media: { media_type: "Image", url: mediaUrl, duration: null } };
      if (st.location) body.location = { type: "Point", coordinates: [st.location.longitude, st.location.latitude] };
      const r = await fetch(`${API_URL}/${API_ENDPOINTS.STORIES.CREATE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) await removePendingStory(st.id);
    } catch (e) {
      console.error(`Sync failed for ${st.id}:`, e);
    }
  }
};
