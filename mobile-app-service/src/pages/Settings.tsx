import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonText,
  IonDatetime,
  IonModal,
  IonButton,
  IonIcon,
  IonAlert,
  IonCard,
  IonCardContent,
  IonNote,
  IonBadge,
  IonSpinner,
  IonBackButton,
  IonButtons,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  notifications,
  trash,
  time,
  arrowBack,
  checkmarkCircle,
  informationCircle,
  moon,
  globe,
  language,
  lockClosed,
} from "ionicons/icons";
import {
  getNotificationSettings,
  saveNotificationSettings,
  toggleNotifications,
  initNotifications,
  getPendingNotifications,
} from "../services/notification.service";
import { deleteAllPhotos } from "../services/storage.service";
import { 
  changeLanguage, 
  getLanguagePreference,
  initLanguage
} from "../services/i18n.service";
import { useTranslation } from "react-i18next";
import logoImage from "../assets/logo.png";
import "./Settings.css";

// Fonction helper pour garantir que t() retourne toujours une chaîne
const translate = (key: string, options?: any): string => {
  const { t } = useTranslation();
  const translation = t(key, options);
  return translation || key;
};

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [notificationTime, setNotificationTime] = useState<string>("12:00");
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [showClearDataAlert, setShowClearDataAlert] = useState<boolean>(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [currentLanguage, setCurrentLanguage] = useState<string>("fr");

  // Load notification settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        // Initialize notifications
        await initNotifications();

        // Get notification settings
        const settings = await getNotificationSettings();
        setNotificationsEnabled(settings.enabled);

        if (settings.time) {
          setNotificationTime(settings.time);
        }

        // Get pending notifications count
        const pendingNotifications = await getPendingNotifications();
        setPendingCount(pendingNotifications.length);

        // Initialiser la langue
        await initLanguage();
        const savedLanguage = await getLanguagePreference();
        setCurrentLanguage(savedLanguage);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle toggle notifications
  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      await toggleNotifications(enabled, notificationTime);
      setNotificationsEnabled(enabled);

      // Get updated pending notifications count
      const pendingNotifications = await getPendingNotifications();
      setPendingCount(pendingNotifications.length);

      setAlertMessage(
        enabled ? `${t('settings.notifications.enabled') as string} ${formatTimeDisplay(notificationTime)}` : t('settings.notifications.disabled') as string
      );
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error toggling notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle time change
  const handleTimeChange = (ev: CustomEvent) => {
    const selectedDateTime = new Date(ev.detail.value);
    const hours = selectedDateTime.getHours().toString().padStart(2, "0");
    const minutes = selectedDateTime.getMinutes().toString().padStart(2, "0");
    const timeString = `${hours}:${minutes}`;

    setNotificationTime(timeString);
  };

  // Handle time save
  const handleSaveTime = async () => {
    try {
      setIsLoading(true);

      // Only update if notifications are enabled
      if (notificationsEnabled) {
        await toggleNotifications(true, notificationTime);
      } else {
        // Just save the time preference
        await saveNotificationSettings({
          enabled: false,
          time: notificationTime,
        });
      }

      // Get updated pending notifications count
      const pendingNotifications = await getPendingNotifications();
      setPendingCount(pendingNotifications.length);

      setShowTimePicker(false);
      setAlertMessage(`${t('settings.alerts.timeUpdated') as string} ${formatTimeDisplay(notificationTime)}`);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error saving notification time:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clear all data
  const handleClearAllData = async () => {
    try {
      setIsLoading(true);

      // Delete all photos
      await deleteAllPhotos();

      // Disable notifications
      await toggleNotifications(false);
      setNotificationsEnabled(false);

      // Get updated pending notifications count
      const pendingNotifications = await getPendingNotifications();
      setPendingCount(pendingNotifications.length);

      setShowClearDataAlert(false);
      setAlertMessage(t('settings.alerts.dataCleared') as string);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error clearing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle language change
  const handleLanguageChange = async (language: string) => {
    try {
      setIsLoading(true);
      await changeLanguage(language);
      setCurrentLanguage(language);
      
      setAlertMessage(t('settings.alerts.languageChanged') as string);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error changing language:", error);
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
    <IonPage className="settings-page">
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/profile" text="" />
          </IonButtons>
          <IonTitle>{t('settings.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList className="settings-list">
          <div className="settings-section">
            <div className="section-header">
              {t('settings.notifications.title')}
            </div>
            
            <IonItem className="settings-item" lines="none">
              <IonIcon icon={notifications} slot="start" color="primary"></IonIcon>
              <IonLabel>
                <h2 className="settings-item-header">{t('settings.notifications.dailyReminder')}</h2>
                <p className="settings-item-subtext">{t('settings.notifications.reminderDescription')}</p>
              </IonLabel>
              {isLoading ? (
                <IonSpinner name="dots" slot="end" />
              ) : (
                <IonToggle
                  checked={notificationsEnabled}
                  onIonChange={(e) => handleToggleNotifications(e.detail.checked)}
                  slot="end"
                />
              )}
            </IonItem>

            <IonItem className="settings-item" button detail lines="none" onClick={() => setShowTimePicker(true)}>
              <IonIcon icon={time} slot="start" color="primary"></IonIcon>
              <IonLabel>
                <h2 className="settings-item-header">{t('settings.notifications.notificationTime')}</h2>
                <p className="settings-item-subtext">{t('settings.notifications.timeDescription')}</p>
              </IonLabel>
              <IonText slot="end" color="medium">
                {formatTimeDisplay(notificationTime)}
              </IonText>
            </IonItem>

            {notificationsEnabled && pendingCount > 0 && (
              <div className="notification-status">
                <IonIcon icon={checkmarkCircle} color="success"></IonIcon>
                {t('settings.notifications.nextScheduled')} {formatTimeDisplay(notificationTime)}
              </div>
            )}
          </div>

          <div className="settings-section">
            <div className="section-header">
              {t('settings.language.title')}
            </div>
            
            <IonItem className="settings-item" lines="none">
              <IonIcon icon={language} slot="start" color="primary"></IonIcon>
              <IonLabel>
                <h2 className="settings-item-header">{t('settings.language.select')}</h2>
              </IonLabel>
              {isLoading ? (
                <IonSpinner name="dots" slot="end" />
              ) : (
                <IonSelect 
                  value={currentLanguage}
                  onIonChange={(e) => handleLanguageChange(e.detail.value)}
                  interface="popover"
                  slot="end"
                >
                  <IonSelectOption value="fr">{t('settings.language.fr')}</IonSelectOption>
                  <IonSelectOption value="en">{t('settings.language.en')}</IonSelectOption>
                </IonSelect>
              )}
            </IonItem>
          </div>

          <div className="settings-section">
            <div className="section-header">
              {t('settings.dataManagement.title')}
            </div>
            
            <IonItem className="settings-item danger-item" button lines="none" onClick={() => setShowClearDataAlert(true)}>
              <IonIcon icon={trash} slot="start" color="danger"></IonIcon>
              <IonLabel>
                <h2 className="settings-item-header">{t('settings.dataManagement.clearData')}</h2>
                <p className="settings-item-subtext">{t('settings.dataManagement.clearDescription')}</p>
              </IonLabel>
            </IonItem>
          </div>

          <div className="settings-section">
            <div className="section-header">
              {t('settings.about.title')}
            </div>
            
            <IonCard className="about-card">
              <img src={logoImage} alt="Logo" className="app-logo" />
              <h2>BeUnreal</h2>
              <p>{t('settings.about.version')} 1.0.0</p>
              <p>{t('settings.about.description')}</p>
              <p className="copyright">{t('settings.about.copyright')}</p>
            </IonCard>
          </div>
        </IonList>

        {/* Time picker modal */}
        <IonModal isOpen={showTimePicker} onDidDismiss={() => setShowTimePicker(false)} className="time-picker-modal">
          <IonHeader>
            <IonToolbar color="primary">
              <IonButton slot="start" fill="clear" color="light" onClick={() => setShowTimePicker(false)}>
                <IonIcon icon={arrowBack} slot="icon-only"></IonIcon>
              </IonButton>
              <IonTitle>{t('settings.time.title')}</IonTitle>
              <IonButton slot="end" fill="clear" color="light" onClick={handleSaveTime}>
                {t('settings.time.save')}
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonDatetime
              presentation="time"
              value={`2025-01-01T${notificationTime}:00`}
              onIonChange={handleTimeChange}
            ></IonDatetime>
          </IonContent>
        </IonModal>

        {/* Clear data confirmation alert */}
        <IonAlert
          isOpen={showClearDataAlert}
          onDidDismiss={() => setShowClearDataAlert(false)}
          header={t('settings.alerts.clearDataTitle')}
          message={t('settings.alerts.clearDataMessage')}
          buttons={[
            {
              text: t('settings.alerts.cancel'),
              role: "cancel",
            },
            {
              text: t('settings.alerts.clearAll'),
              role: "destructive",
              handler: handleClearAllData,
            },
          ]}
        />

        {/* Success alert */}
        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={() => setShowSuccessAlert(false)}
          header={t('settings.alerts.success')}
          message={alertMessage}
          buttons={[t('settings.alerts.ok')]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
