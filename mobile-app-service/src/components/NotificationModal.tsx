import React, { useState, useEffect } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonDatetime,
  IonItem,
  IonLabel,
  IonToggle,
  IonList,
  IonText,
  IonSpinner,
} from "@ionic/react";
import { close, notifications, time } from "ionicons/icons";
import { NotificationSettings, getNotificationSettings, toggleNotifications } from "../services/notification.service";
import "./NotificationModal.css";

interface NotificationModalProps {
  onDismiss: () => void;
  onSave: (settings: NotificationSettings) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ onDismiss, onSave }) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [notificationTime, setNotificationTime] = useState<string>("12:00");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getNotificationSettings();
        setEnabled(settings.enabled);

        if (settings.time) {
          setNotificationTime(settings.time);
        }
      } catch (error) {
        console.error("Error loading notification settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle time change
  const handleTimeChange = (ev: CustomEvent) => {
    const selectedDateTime = new Date(ev.detail.value);
    const hours = selectedDateTime.getHours().toString().padStart(2, "0");
    const minutes = selectedDateTime.getMinutes().toString().padStart(2, "0");
    const timeString = `${hours}:${minutes}`;

    setNotificationTime(timeString);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Toggle notifications with the current settings
      await toggleNotifications(enabled, notificationTime);

      // Notify parent component
      onSave({
        enabled,
        time: notificationTime,
      });

      // Dismiss modal
      onDismiss();
    } catch (error) {
      console.error("Error saving notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format time for display
  const formatTimeDisplay = (timeString: string) => {
    const [hoursStr, minutesStr] = timeString.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM

    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Notification Settings</IonTitle>
          <IonButton slot="end" fill="clear" color="light" onClick={onDismiss}>
            <IonIcon slot="icon-only" icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {isLoading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <IonText color="medium">
              <p>Loading settings...</p>
            </IonText>
          </div>
        ) : (
          <>
            <IonList>
              <IonItem>
                <IonIcon icon={notifications} slot="start" color="primary" />
                <IonLabel>Enable Daily Reminder</IonLabel>
                <IonToggle checked={enabled} onIonChange={(e) => setEnabled(e.detail.checked)} slot="end" />
              </IonItem>

              <IonItem>
                <IonIcon icon={time} slot="start" color="primary" />
                <IonLabel>Reminder Time</IonLabel>
                <IonText slot="end" color="medium">
                  {formatTimeDisplay(notificationTime)}
                </IonText>
              </IonItem>
            </IonList>

            <div className="time-picker-container">
              <IonDatetime
                presentation="time"
                value={`2025-01-01T${notificationTime}:00`}
                onIonChange={handleTimeChange}
                disabled={!enabled}
              />
            </div>

            <div className="notification-description">
              <p>
                Set a daily reminder to take your BeUnreal photo. You'll receive a notification at the specified time
                every day.
              </p>
            </div>

            <div className="button-container">
              <IonButton expand="block" onClick={handleSave}>
                Save Settings
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </>
  );
};

export default NotificationModal;
