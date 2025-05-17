import React, { useState, useEffect } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { close } from "ionicons/icons";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import "./CameraView.css";

interface CameraViewProps {
  onPhotoTaken: (webPath: string) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Ouvrir directement l'appareil photo dès le chargement du composant
  useEffect(() => {
    openNativeCamera();
  }, []);

  const openNativeCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const photo = await takePicture({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1600,
        correctOrientation: true,
        presentationStyle: "fullscreen",
        saveToGallery: false,
      });

      if (photo && photo.webPath) {
        onPhotoTaken(photo.webPath);
      } else {
        // Si aucune photo n'est prise (annulation), fermer le modal
        onClose();
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      setError("Échec de la prise de photo. Veuillez vérifier les permissions de la caméra.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose} disabled={isLoading}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>Caméra</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="camera-view-content">
        {isLoading ? (
          <div className="camera-loading">
            <IonSpinner name="crescent" />
            <IonText>Ouverture de l'appareil photo...</IonText>
          </div>
        ) : error ? (
          <div className="camera-error">
            <IonText color="danger">{error}</IonText>
            <IonButton onClick={openNativeCamera}>Réessayer</IonButton>
          </div>
        ) : (
          <div className="camera-container" onClick={openNativeCamera}>
            <div className="camera-instructions">
              <IonText>Appuyez pour ouvrir l'appareil photo</IonText>
              <IonButton onClick={openNativeCamera}>Ouvrir l'appareil photo</IonButton>
            </div>
          </div>
        )}
      </IonContent>
    </>
  );
};

export default CameraView;
