import { Geolocation, Position, PermissionStatus } from "@capacitor/geolocation";
import { Preferences } from "@capacitor/preferences";
import { getAuthToken } from "./auth.service";
import { API_URL, API_ENDPOINTS } from "../config";

// Keys for storage
const LOCATION_ENABLED_KEY = "location_enabled";
const LOCATION_PRIVACY_KEY = "location_privacy";
const LOCATION_CACHE_KEY = "location_cache";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationPrivacy {
  shareWith: "friends_only" | "everyone" | "nobody";
  precision: "exact" | "approximate" | "city";
}

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Check if location services are enabled
 * @returns Promise with boolean indicating if location is enabled
 */
export const isLocationEnabled = async (): Promise<boolean> => {
  try {
    const result = await Preferences.get({ key: LOCATION_ENABLED_KEY });
    return result.value === "true";
  } catch (error) {
    console.error("Error checking location enabled:", error);
    return false;
  }
};

/**
 * Enable or disable location services
 * @param enabled Whether location services should be enabled
 */
export const setLocationEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await Preferences.set({
      key: LOCATION_ENABLED_KEY,
      value: String(enabled),
    });
  } catch (error) {
    console.error("Error setting location enabled:", error);
    throw error;
  }
};

/**
 * Request location permissions from the user
 * @returns Promise with the permission status
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    const status = await Geolocation.checkPermissions();

    if (status.location === "granted") {
      return true;
    }

    const requestResult = await Geolocation.requestPermissions();
    return requestResult.location === "granted";
  } catch (error) {
    console.error("Error requesting location permissions:", error);
    return false;
  }
};

/**
 * Get the current location
 * @returns Promise with the location data
 */
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    // Check if location is enabled in app settings
    const enabled = await isLocationEnabled();
    if (!enabled) {
      return null;
    }

    // Check permissions
    const permissionStatus = await Geolocation.checkPermissions();

    if (permissionStatus.location !== "granted") {
      const requestResult = await Geolocation.requestPermissions();
      if (requestResult.location !== "granted") {
        return null;
      }
    }

    // Get current position
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };

    // Cache the location data
    await cacheLocation(locationData);

    // If online, send location update to server
    if (isOnline()) {
      try {
        await updateLocationOnServer(locationData);
      } catch (error) {
        console.error("Error updating location on server:", error);
      }
    }

    return locationData;
  } catch (error) {
    console.error("Error getting current location:", error);

    // Try to get from cache
    return await getCachedLocation();
  }
};

/**
 * Cache the location data locally
 */
const cacheLocation = async (location: LocationData): Promise<void> => {
  try {
    await Preferences.set({
      key: LOCATION_CACHE_KEY,
      value: JSON.stringify(location),
    });
  } catch (error) {
    console.error("Error caching location:", error);
  }
};

/**
 * Get cached location data
 */
const getCachedLocation = async (): Promise<LocationData | null> => {
  try {
    const result = await Preferences.get({ key: LOCATION_CACHE_KEY });

    if (result.value) {
      return JSON.parse(result.value);
    }

    return null;
  } catch (error) {
    console.error("Error getting cached location:", error);
    return null;
  }
};

/**
 * Update location on the server
 */
const updateLocationOnServer = async (location: LocationData): Promise<void> => {
  try {
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}${API_ENDPOINTS.LOCATION.UPDATE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update location on server");
    }
  } catch (error) {
    console.error("Error updating location on server:", error);
    throw error;
  }
};

/**
 * Get location privacy settings
 */
export const getLocationPrivacy = async (): Promise<LocationPrivacy> => {
  try {
    // Try to get from server if online
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.LOCATION.PRIVACY}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to get location privacy settings");
        }

        const data = await response.json();

        const privacy: LocationPrivacy = {
          shareWith: data.share_with,
          precision: data.precision,
        };

        // Cache the privacy settings
        await Preferences.set({
          key: LOCATION_PRIVACY_KEY,
          value: JSON.stringify(privacy),
        });

        return privacy;
      } catch (error) {
        console.error("Error getting location privacy from server:", error);
        // Fall back to cached settings
      }
    }

    // Get from cache
    const result = await Preferences.get({ key: LOCATION_PRIVACY_KEY });

    if (result.value) {
      return JSON.parse(result.value);
    }

    // Default settings
    return {
      shareWith: "friends_only",
      precision: "exact",
    };
  } catch (error) {
    console.error("Error getting location privacy:", error);

    // Default settings
    return {
      shareWith: "friends_only",
      precision: "exact",
    };
  }
};

/**
 * Update location privacy settings
 */
export const updateLocationPrivacy = async (privacy: LocationPrivacy): Promise<void> => {
  try {
    // Cache the settings
    await Preferences.set({
      key: LOCATION_PRIVACY_KEY,
      value: JSON.stringify(privacy),
    });

    // Update on server if online
    if (isOnline()) {
      try {
        const token = await getAuthToken();

        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.LOCATION.PRIVACY}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            share_with: privacy.shareWith,
            precision: privacy.precision,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update location privacy settings");
        }
      } catch (error) {
        console.error("Error updating location privacy on server:", error);
        // Add to pending updates for later sync
        await addPendingPrivacyUpdate(privacy);
      }
    } else {
      // Add to pending updates for later sync
      await addPendingPrivacyUpdate(privacy);
    }
  } catch (error) {
    console.error("Error updating location privacy:", error);
    throw error;
  }
};

/**
 * Add a pending privacy update
 */
const addPendingPrivacyUpdate = async (privacy: LocationPrivacy): Promise<void> => {
  try {
    const PENDING_PRIVACY_UPDATES_KEY = "pending_privacy_updates";

    await Preferences.set({
      key: PENDING_PRIVACY_UPDATES_KEY,
      value: JSON.stringify(privacy),
    });
  } catch (error) {
    console.error("Error adding pending privacy update:", error);
  }
};

/**
 * Calculate distance between two coordinates in kilometers
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

/**
 * Convert degrees to radians
 * @param deg Degrees
 * @returns Radians
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Get nearby users
 * @param radius Radius in meters
 * @param limit Maximum number of users to return
 * @returns Array of user IDs
 */
export const getNearbyUsers = async (radius: number = 5000, limit: number = 20): Promise<string[]> => {
  try {
    if (!isOnline()) {
      return [];
    }

    const location = await getCurrentLocation();

    if (!location) {
      return [];
    }

    const token = await getAuthToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}${API_ENDPOINTS.LOCATION.NEARBY_USERS}?radius=${radius}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get nearby users");
    }

    const data = await response.json();

    return data.map((user: any) => user._id || user.id);
  } catch (error) {
    console.error("Error getting nearby users:", error);
    return [];
  }
};

/**
 * Get location name from coordinates using reverse geocoding
 */
export const getLocationName = async (latitude: number, longitude: number): Promise<string> => {
  try {
    // This would typically use a geocoding service like Google Maps or Nominatim
    // For now, we'll use a simplistic approach with mock data

    // In a real app, you would implement a call to a geocoding service here
    // const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
    // const data = await response.json();
    // return data.display_name;

    // Mock implementation
    return "Lyon, France";
  } catch (error) {
    console.error("Error getting location name:", error);
    return "Unknown location";
  }
};

/**
 * Sync pending location updates with the server
 */
export const syncPendingLocationUpdates = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    // Sync location data
    const location = await getCachedLocation();

    if (location) {
      try {
        await updateLocationOnServer(location);
      } catch (error) {
        console.error("Error syncing location data:", error);
      }
    }

    // Sync privacy settings
    const PENDING_PRIVACY_UPDATES_KEY = "pending_privacy_updates";
    const result = await Preferences.get({ key: PENDING_PRIVACY_UPDATES_KEY });

    if (result.value) {
      const privacy: LocationPrivacy = JSON.parse(result.value);

      try {
        const token = await getAuthToken();

        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_URL}${API_ENDPOINTS.LOCATION.PRIVACY}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            share_with: privacy.shareWith,
            precision: privacy.precision,
          }),
        });

        if (response.ok) {
          // Clear pending updates
          await Preferences.remove({ key: PENDING_PRIVACY_UPDATES_KEY });
        }
      } catch (error) {
        console.error("Error syncing privacy settings:", error);
      }
    }
  } catch (error) {
    console.error("Error syncing pending location updates:", error);
  }
};

/**
 * Setup connectivity listeners
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing location data...");
    await syncPendingLocationUpdates();
  });
};

// Initialize connectivity listeners
setupConnectivityListeners();
