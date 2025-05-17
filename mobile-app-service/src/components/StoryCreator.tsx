import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonToast,
} from "@ionic/react";
import {
  close,
  camera,
} from "ionicons/icons";
import { takePicture, createPhotoWithLocation } from "../services/camera.service";
import { createStory } from "../services/story.service";
import { CameraSource, CameraResultType } from "@capacitor/camera";
import "./StoryCreator.css";

interface StoryCreatorProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const StoryCreator: React.FC<StoryCreatorProps> = ({ onClose, onSuccess }) => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  
  // Ouvrir directement la caméra au chargement du composant
  useEffect(() => {
    handleTakePhoto();
  }, []);

  const handleTakePhoto = async () => {
    try {
      setIsCapturing(true);

      const photo = await takePicture({
        quality: 90,
        allowEditing: false, // Désactiver l'édition
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1600,
        correctOrientation: true,
        presentationStyle: "fullscreen",
        saveToGallery: false,
      });

      if (photo && photo.webPath) {
        // Créer directement la story sans passer par l'écran d'édition
        await handleCreateStory(photo);
      } else {
        // L'utilisateur a annulé la prise de photo
        onClose();
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      setToastMessage("Échec de la prise de photo");
      setShowToast(true);
      onClose(); // Fermer en cas d'erreur
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCreateStory = async (photo: any) => {
    try {
      setIsCreating(true);

      // Créer la photo avec la localisation
      const photoData = await createPhotoWithLocation(photo, true, "story");

      // Créer la story
      await createStory(photoData);

      // Notifier le succès
      if (onSuccess) {
        onSuccess();
      }

      // Afficher un message de succès
      setToastMessage("Story créée avec succès !");
      setShowToast(true);

      // Fermer après un court délai
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error creating story:", error);
      setToastMessage("Échec de création de la story");
      setShowToast(true);
      onClose(); // Fermer en cas d'erreur
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar color="dark">
          <IonButtons slot="start">
            <IonButton onClick={onClose} color="light">
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="story-creator-content">
        <div className="camera-container">
          <div className="capturing-overlay">
            <IonSpinner name="crescent" />
            <IonText color="light">
              {isCapturing ? "Prise de photo..." : isCreating ? "Création de la story..." : "Chargement..."}
            </IonText>
          </div>
        </div>
      </IonContent>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </>
  );
};

export default StoryCreator;