import { LocalNotifications, ScheduleOptions, PendingLocalNotificationSchema } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { API_URL, API_ENDPOINTS, APP_CONFIG } from "../config";
import { getAuthToken } from "./auth.service";

// Keys for notification storage
const NOTIFICATION_ENABLED_KEY = "notification_enabled";
const NOTIFICATION_TIME_KEY = "notification_time";
const NOTIFICATION_ID = "beunreal_daily";
const LAST_NOTIFICATION_DATE_KEY = "last_notification_date";
const NOTIFICATION_SERVER_REGISTERED_KEY = "notification_server_registered";

export interface NotificationSettings {
  enabled: boolean;
  time?: string; // Format: 'HH:MM'
}

/**
 * Vérifie si l'appareil est actuellement en ligne
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Initialize notifications and request permissions
 */
export const initNotifications = async (): Promise<void> => {
  try {
    // Check if permissions are granted
    const permResult = await LocalNotifications.checkPermissions();

    if (permResult.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }

    // Configure notification channels for Android
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_ID,
        name: "BeUnreal Daily Reminder",
        description: "Daily reminder to take your BeUnreal photo",
        importance: 4, // High importance
        vibration: true,
        sound: "default",
        lights: true,
        lightColor: "#0044CC",
      });
    }

    // Setup notification listeners
    LocalNotifications.addListener("localNotificationActionPerformed", async (notification) => {
      // When user interacts with a notification, schedule the next one
      const settings = await getNotificationSettings();
      if (settings && settings.enabled) {
        scheduleTomorrowReminder(settings.time || "12:00");
      }

      // If online, inform the server that the user engaged with the notification
      if (isOnline()) {
        try {
          const token = await getAuthToken();
          if (token) {
            await fetch(`${API_URL}/api/notifications/engagement`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                notification_id: notification.notification.id.toString(),
                action: notification.actionId || "clicked",
              }),
            });
          }
        } catch (error) {
          console.error("Error reporting notification engagement:", error);
        }
      }
    });

    // Check if notifications are enabled and schedule if needed
    const settings = await getNotificationSettings();
    if (settings.enabled) {
      const pendingNotifications = await getPendingNotifications();

      // If no pending notifications, schedule one
      if (pendingNotifications.length === 0) {
        await scheduleDailyReminder(settings.time || "12:00");
      }
    }
  } catch (error) {
    console.error("Error initializing notifications:", error);
    throw error;
  }
};

/**
 * Schedule a daily reminder notification
 * @param time Time in 'HH:MM' format (24-hour)
 */
export const scheduleDailyReminder = async (time: string): Promise<void> => {
  try {
    // Cancel any existing notifications first
    await cancelAllNotifications();

    // Check if we already sent a notification today
    const today = new Date().toDateString();
    const lastNotificationDate = await Preferences.get({ key: LAST_NOTIFICATION_DATE_KEY });

    if (lastNotificationDate.value === today) {
      // Already sent today, schedule for tomorrow
      await scheduleTomorrowReminder(time);
      return;
    }

    // Parse the time
    const [hours, minutes] = time.split(":").map(Number);

    // Create a Date object for today with the specified time
    const now = new Date();
    const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // If the time is in the past for today, schedule for tomorrow
    if (scheduledTime.getTime() < now.getTime()) {
      await scheduleTomorrowReminder(time);
      return;
    }

    // Schedule the notification for today
    const options: ScheduleOptions = {
      notifications: [
        {
          id: 1,
          title: "BeUnreal Reminder",
          body: "Time to take your daily photo!",
          schedule: {
            at: scheduledTime,
            repeats: false, // No automatic repetition
          },
          channelId: NOTIFICATION_ID,
          smallIcon: "ic_stat_logo",
          iconColor: "#0044CC",
        },
      ],
    };

    await LocalNotifications.schedule(options);

    // Save notification settings
    await saveNotificationSettings({
      enabled: true,
      time: time,
    });

    // Register with server if online
    if (isOnline()) {
      await registerNotificationsWithServer(time);
    }
  } catch (error) {
    console.error("Error scheduling notification:", error);
    throw error;
  }
};

/**
 * Register notification preferences with the server
 */
const registerNotificationsWithServer = async (time: string): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) return;

    // Check if already registered
    const isRegistered = await Preferences.get({ key: NOTIFICATION_SERVER_REGISTERED_KEY });
    if (isRegistered.value === "true") return;

    // Register with server
    const response = await fetch(`${API_URL}/api/notifications/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        time: time,
        enabled: true,
        device_type: Capacitor.getPlatform(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    if (response.ok) {
      // Mark as registered
      await Preferences.set({
        key: NOTIFICATION_SERVER_REGISTERED_KEY,
        value: "true",
      });
    }
  } catch (error) {
    console.error("Error registering notifications with server:", error);
  }
};

/**
 * Schedule a reminder for tomorrow
 * @param time Time in 'HH:MM' format (24-hour)
 */
export const scheduleTomorrowReminder = async (time: string): Promise<void> => {
  try {
    // Parse the time
    const [hours, minutes] = time.split(":").map(Number);

    // Create a Date object for tomorrow with the specified time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);

    // Schedule the notification
    const options: ScheduleOptions = {
      notifications: [
        {
          id: 1,
          title: "BeUnreal Reminder",
          body: "Time to take your daily photo!",
          schedule: {
            at: tomorrow,
            repeats: false,
          },
          channelId: NOTIFICATION_ID,
          smallIcon: "ic_stat_logo",
          iconColor: "#0044CC",
        },
      ],
    };

    await LocalNotifications.schedule(options);

    // Save the date of the last scheduled notification
    await Preferences.set({
      key: LAST_NOTIFICATION_DATE_KEY,
      value: new Date().toDateString(),
    });
  } catch (error) {
    console.error("Error scheduling tomorrow notification:", error);
    throw error;
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    const pendingNotifications = await LocalNotifications.getPending();

    if (pendingNotifications.notifications.length > 0) {
      const ids = pendingNotifications.notifications.map((notification) => notification.id);
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }
  } catch (error) {
    console.error("Error canceling notifications:", error);
    throw error;
  }
};

/**
 * Toggle notifications on/off
 * @param enabled Whether notifications should be enabled
 * @param time Optional time in 'HH:MM' format (24-hour)
 */
export const toggleNotifications = async (enabled: boolean, time?: string): Promise<void> => {
  try {
    if (enabled && time) {
      await scheduleDailyReminder(time);
    } else {
      await cancelAllNotifications();

      // Save notification settings with enabled = false
      await saveNotificationSettings({
        enabled: false,
        time: time,
      });

      // Update server if online
      if (isOnline()) {
        await updateServerNotificationSettings(false, time);
      }
    }
  } catch (error) {
    console.error("Error toggling notifications:", error);
    throw error;
  }
};

/**
 * Update notification settings on the server
 */
const updateServerNotificationSettings = async (enabled: boolean, time?: string): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) return;

    await fetch(`${API_URL}/api/notifications/preferences`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        time: time || "12:00",
        enabled: enabled,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
  } catch (error) {
    console.error("Error updating server notification settings:", error);
  }
};

/**
 * Save notification settings to storage
 * @param settings Notification settings
 */
export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  try {
    await Preferences.set({
      key: NOTIFICATION_ENABLED_KEY,
      value: String(settings.enabled),
    });

    if (settings.time) {
      await Preferences.set({
        key: NOTIFICATION_TIME_KEY,
        value: settings.time,
      });
    }
  } catch (error) {
    console.error("Error saving notification settings:", error);
    throw error;
  }
};

/**
 * Get notification settings from storage
 * @returns Notification settings
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const enabledResult = await Preferences.get({ key: NOTIFICATION_ENABLED_KEY });
    const timeResult = await Preferences.get({ key: NOTIFICATION_TIME_KEY });

    const enabled = enabledResult.value === "true";
    const time = timeResult.value || APP_CONFIG.DEFAULT_NOTIFICATION_TIME;

    return {
      enabled,
      time,
    };
  } catch (error) {
    console.error("Error getting notification settings:", error);

    // Return default settings
    return {
      enabled: false,
      time: APP_CONFIG.DEFAULT_NOTIFICATION_TIME,
    };
  }
};

/**
 * Get all pending notifications
 * @returns Array of pending notifications
 */
export const getPendingNotifications = async (): Promise<PendingLocalNotificationSchema[]> => {
  try {
    const result = await LocalNotifications.getPending();
    return result.notifications;
  } catch (error) {
    console.error("Error getting pending notifications:", error);
    return [];
  }
};

/**
 * Send a test notification immediately
 */
export const sendTestNotification = async (): Promise<void> => {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999,
          title: "BeUnreal Test",
          body: "This is a test notification!",
          channelId: NOTIFICATION_ID,
          smallIcon: "ic_stat_logo",
          iconColor: "#0044CC",
        },
      ],
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    throw error;
  }
};

/**
 * Sync notification settings with the server
 */
export const syncNotificationSettings = async (): Promise<void> => {
  if (!isOnline()) return;

  try {
    const settings = await getNotificationSettings();
    await updateServerNotificationSettings(settings.enabled, settings.time);
  } catch (error) {
    console.error("Error syncing notification settings:", error);
  }
};

/**
 * Setup connectivity listeners for auto-syncing
 */
export const setupConnectivityListeners = (): void => {
  window.addEventListener("online", async () => {
    console.log("Online: syncing notification settings...");
    await syncNotificationSettings();
  });
};

// Initialize connectivity listeners
setupConnectivityListeners();
