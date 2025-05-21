import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFooter,
  IonTextarea,
  IonSpinner,
  IonToggle,
  IonItem,
  IonLabel,
  IonAlert,
  IonBadge,
  IonText,
  useIonToast,
  TextareaCustomEvent,
  ToastOptions,
  ToggleCustomEvent,
} from "@ionic/react";
import {
  closeOutline,
  checkmarkOutline,
  imageOutline,
  locationOutline,
  timeOutline,
  warningOutline,
  trashOutline,
  refreshOutline,
} from "ionicons/icons";
import { createStory } from "../services/story.service";
import { PhotoData } from "../services/camera.service";
import { getCurrentLocation, getLocationName } from "../services/location.service";
import "./StoryCapture.css";

interface StoryCaptureProps {
  photoData: PhotoData;
  onCancel: () => void;
  onSuccess: () => void;
}

const StoryCapture: React.FC<StoryCaptureProps> = ({ photoData, onCancel, onSuccess }) => {
  const [caption, setCaption] = useState<string>("");
  const [includeLocation, setIncludeLocation] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationCoordinates, setLocationCoordinates] = useState<{latitude: number; longitude: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [presentToast] = useIonToast();

  useEffect(() => {
    if (includeLocation) {
      fetchLocationData();
    }
  }, [includeLocation]);

  const fetchLocationData = async () => {
    try {
      setIsLoadingLocation(true);
      setLocationError(null);

      const location = await getCurrentLocation();
      
      if (location) {
        setLocationCoordinates({
          latitude: location.latitude,
          longitude: location.longitude
        });
        
        // Also get location name for display
        try {
          const name = await getLocationName(location.latitude, location.longitude);
          setLocationName(name);
        } catch (err) {
          console.error("Error getting location name:", err);
          // Still proceed even if we can't get the location name
          setLocationName("Unknown location");
        }
      } else {
        setLocationError("Could not determine your location");
      }
    } catch (err) {
      console.error("Error fetching location:", err);
      setLocationError("Error getting location. Check your location settings.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleCaptionChange = (e: TextareaCustomEvent) => {
    const value = e.detail.value || "";
    setCaption(value);
  };

  const handleLocationToggle = (checked: boolean) => {
    setIncludeLocation(checked);
  };

  const handleSubmit = async () => {
    if (!photoData) {
      return;
    }

    if (includeLocation && !locationCoordinates && !locationError) {
      // If we're including location but don't have it yet and no error occurred,
      // we're probably still loading location data
      showToast("Waiting for location data...", "warning");
      return;
    }

    try {
      setIsSubmitting(true);

      // If including location and we have coordinates, add them to photo data
      if (includeLocation && locationCoordinates) {
        photoData.location = {
          latitude: locationCoordinates.latitude,
          longitude: locationCoordinates.longitude,
          accuracy: 0 // Default value, would be more precise in real implementation
        };
      }

      // Set the type as "story" instead of regular photo
      photoData.type = "story";
      
      // Create an expiration time (24 hours)
      photoData.expireAt = Date.now() + (24 * 60 * 60 * 1000);

      // Create the story
      await createStory(photoData, caption || undefined);

      showToast("Story published successfully!", "success");
      onSuccess();
    } catch (error) {
      console.error("Error creating story:", error);
      showToast("Failed to publish story. Please try again.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshLocation = () => {
    fetchLocationData();
  };

  const showToast = (message: string, color: "success" | "danger" | "warning" = "success") => {
    const options: ToastOptions = {
      message,
      duration: 2000,
      position: "bottom",
      color,
      buttons: [{ text: "Dismiss", role: "cancel" }]
    };
    presentToast(options);
  };

  return (
    <div className="story-capture-container">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton color="medium" onClick={() => setShowAlert(true)}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>New Story</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <IonSpinner name="dots" />
              ) : (
                <IonIcon slot="icon-only" icon={checkmarkOutline} />
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="story-capture-content">
        <div className="story-preview">
          <div className="image-container">
            {photoData && photoData.webPath ? (
              <img src={photoData.webPath} alt="Story preview" />
            ) : (
              <div className="image-placeholder">
                <IonIcon icon={imageOutline} />
                <p>Image not available</p>
              </div>
            )}
          </div>
        </div>

        <div className="story-info">
          <div className="caption-container">
            <IonTextarea
              placeholder="Write a caption..."
              value={caption}
              onIonChange={handleCaptionChange}
              maxlength={150}
              autoGrow={true}
              className="caption-input"
            />
            <div className="caption-counter">
              <span>{caption.length}/150</span>
            </div>
          </div>

          <div className="story-options">
            <IonItem lines="none" className="location-toggle">
              <IonIcon icon={locationOutline} slot="start" color="primary" />
              <IonLabel>
                <h2>Include Location</h2>
                <p>Show your story in nearby search</p>
              </IonLabel>
              <IonToggle
                checked={includeLocation}
                onIonChange={(e: ToggleCustomEvent) => handleLocationToggle(e.detail.checked)}
                slot="end"
              />
            </IonItem>

            {includeLocation && (
              <div className="location-status">
                {isLoadingLocation ? (
                  <div className="location-loading">
                    <IonSpinner name="dots" />
                    <IonText color="medium">Getting your location...</IonText>
                  </div>
                ) : locationError ? (
                  <div className="location-error">
                    <IonIcon icon={warningOutline} color="danger" />
                    <IonText color="danger">{locationError}</IonText>
                    <IonButton size="small" fill="clear" onClick={handleRefreshLocation}>
                      <IonIcon slot="icon-only" icon={refreshOutline} />
                    </IonButton>
                  </div>
                ) : locationCoordinates ? (
                  <div className="location-success">
                    <IonIcon icon={locationOutline} color="success" />
                    <IonText>
                      {locationName ||
                        `${locationCoordinates.latitude.toFixed(4)}, ${locationCoordinates.longitude.toFixed(4)}`}
                    </IonText>
                  </div>
                ) : null}
              </div>
            )}

            <IonItem lines="none" className="expiry-info">
              <IonIcon icon={timeOutline} slot="start" color="warning" />
              <IonLabel>
                <h2>Expires in 24 hours</h2>
                <p>Your story will disappear automatically</p>
              </IonLabel>
              <IonBadge color="warning" slot="end">24h</IonBadge>
            </IonItem>
          </div>
        </div>
      </IonContent>

      <IonFooter className="story-capture-footer">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton color="danger" onClick={() => setShowAlert(true)}>
              <IonIcon slot="start" icon={trashOutline} />
              Discard
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton strong={true} onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <IonSpinner name="dots" />
              ) : (
                <>
                  Publish
                  <IonIcon slot="end" icon={checkmarkOutline} />
                </>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>

      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header="Discard Story"
        message="Are you sure you want to discard this story? Your photo will not be saved."
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
          },
          {
            text: "Discard",
            role: "destructive",
            handler: onCancel,
          },
        ]}
      />
    </div>
  );
};

export default StoryCapture;