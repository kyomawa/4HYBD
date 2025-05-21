import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonTextarea,
  IonSpinner,
  IonImg,
  IonAlert,
  IonToast,
  IonFooter,
  IonCard,
  IonCardContent,
  IonToggle,
  IonItem,
  IonLabel,
  InputCustomEvent
} from "@ionic/react";
import { close, location, send, mapOutline } from "ionicons/icons";
import { createStory } from "../services/story.service";
import { createPhotoWithLocation } from "../services/camera.service";
import { getCurrentLocation, isLocationEnabled, setLocationEnabled } from "../services/location.service";
import "./PostComposer.css";

interface PostComposerProps {
  imageUrl: string;
  onPublish: (caption: string) => Promise<void>;
  onCancel: () => void;
}

const PostComposer: React.FC<PostComposerProps> = ({ imageUrl, onPublish, onCancel }) => {
  const [caption, setCaption] = useState<string>("");
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [includeLocation, setIncludeLocation] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [showLocationAlert, setShowLocationAlert] = useState<boolean>(false);
  const [showErrorToast, setShowErrorToast] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleCaptionChange = (e: InputCustomEvent) => {
    setCaption(e.detail.value as string);
  };

  const handleLocationToggle = async (e: CustomEvent) => {
    const enabled = e.detail.checked;
    setIncludeLocation(enabled);
    
    if (enabled) {
      try {
        // Check if location is already enabled in system settings
        const locationEnabled = await isLocationEnabled();
        
        if (!locationEnabled) {
          setShowLocationAlert(true);
          return;
        }
        
        // Try to get current location
        const location = await getCurrentLocation();
        
        if (location) {
          setLocationStatus(`Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
        } else {
          setLocationStatus("Could not get location");
        }
      } catch (error) {
        console.error("Error checking location:", error);
        setLocationStatus("Location error");
        setIncludeLocation(false);
      }
    } else {
      setLocationStatus(null);
    }
  };

  const handleEnableLocation = async () => {
    try {
      await setLocationEnabled(true);
      setIncludeLocation(true);
      
      const location = await getCurrentLocation();
      
      if (location) {
        setLocationStatus(`Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      } else {
        setLocationStatus("Could not get location");
      }
    } catch (error) {
      console.error("Error enabling location:", error);
      setLocationStatus("Location error");
      setIncludeLocation(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsSharing(true);
      
      // Create a photo data object
      const photoData = {
        id: `photo_${Date.now()}`,
        webPath: imageUrl,
        timestamp: Date.now(),
        type: "story" as const
      };
      
      // Add location if enabled
      if (includeLocation) {
        const location = await getCurrentLocation();
        
        if (location) {
          photoData.location = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          };
        }
      }
      
      // Create story with the photo and caption
      const photoWithLocation = await createPhotoWithLocation(
        { webPath: imageUrl } as any,
        includeLocation,
        "story"
      );
      
      await createStory(photoWithLocation, caption);
      
      // Let parent component know we're done
      await onPublish(caption);
    } catch (error) {
      console.error("Error publishing story:", error);
      setErrorMessage("Failed to publish story. Please try again.");
      setShowErrorToast(true);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onCancel}>
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>New Story</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handlePublish} disabled={isSharing}>
              {isSharing ? <IonSpinner name="dots" /> : <IonIcon slot="icon-only" icon={send} />}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="composer-content">
        <IonCard className="image-preview-card">
          <IonImg src={imageUrl} alt="Preview" className="image-preview" />
        </IonCard>
        
        <IonCardContent>
          <IonTextarea
            placeholder="Add a caption to your story..."
            value={caption}
            onIonChange={handleCaptionChange}
            autoGrow
            rows={4}
            maxlength={280}
            className="caption-textarea"
          />
          
          <IonItem lines="none" className="location-toggle">
            <IonIcon icon={mapOutline} slot="start" color={includeLocation ? "primary" : "medium"} />
            <IonLabel>Include Location</IonLabel>
            <IonToggle
              checked={includeLocation}
              onIonChange={handleLocationToggle}
              slot="end"
            />
          </IonItem>
          
          {locationStatus && (
            <div className="location-status">
              <IonIcon icon={location} color="primary" />
              <span>{locationStatus}</span>
            </div>
          )}
        </IonCardContent>
      </IonContent>
      
      <IonFooter className="composer-footer">
        <div className="footer-message">
          <p>Your story will be visible to your followers for 24 hours</p>
        </div>
      </IonFooter>
      
      <IonAlert
        isOpen={showLocationAlert}
        onDidDismiss={() => setShowLocationAlert(false)}
        header="Location Access"
        message="Location access is required to include your location with the story. Would you like to enable location access?"
        buttons={[
          {
            text: 'No',
            role: 'cancel',
            handler: () => {
              setIncludeLocation(false);
            },
          },
          {
            text: 'Yes',
            handler: handleEnableLocation,
          },
        ]}
      />
      
      <IonToast
        isOpen={showErrorToast}
        onDidDismiss={() => setShowErrorToast(false)}
        message={errorMessage}
        duration={3000}
        color="danger"
      />
    </>
  );
};

export default PostComposer;