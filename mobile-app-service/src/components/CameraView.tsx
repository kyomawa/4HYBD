import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  IonContent,
  IonButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonSpinner,
  IonFooter,
  IonFab,
  IonFabButton,
  IonAlert,
  IonToast,
} from "@ionic/react";
import {
  close,
  camera,
  cameraReverse,
  flashOff,
  flash,
  image,
} from "ionicons/icons";
import { Camera, CameraResultType, CameraDirection } from "@capacitor/camera";
import { Photo } from "@capacitor/camera/dist/esm/definitions";
import { isLocationEnabled, getCurrentLocation } from "../services/location.service";
import "./CameraView.css";

interface CameraViewProps {
  onPhotoTaken: (webPath: string) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken, onClose }) => {
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [cameraDirection, setCameraDirection] = useState<CameraDirection>(CameraDirection.Rear);
  const [isTakingPhoto, setIsTakingPhoto] = useState<boolean>(false);
  const [showLocationAlert, setShowLocationAlert] = useState<boolean>(false);
  const [showErrorToast, setShowErrorToast] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    initCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [cameraDirection]);
  
  const initCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraDirection === CameraDirection.Front ? "user" : "environment",
        },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error initializing camera:", error);
      setErrorMessage("Camera access failed. Please check permissions.");
      setShowErrorToast(true);
    }
  };
  
  const takePicture = async () => {
    try {
      setIsTakingPhoto(true);
      
      const locationEnabled = await isLocationEnabled();
      
      let locationPromise = null;
      if (locationEnabled) {
        locationPromise = getCurrentLocation();
      }
      
      const photo: Photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        direction: cameraDirection,
        promptLabelHeader: "",
        promptLabelCancel: "",
        promptLabelPhoto: "",
        promptLabelPicture: "",
      });
      
      if (locationPromise) {
        const location = await locationPromise;
        
        if (!location) {
          setShowLocationAlert(true);
        }
      }
      
      if (photo.webPath) {
        onPhotoTaken(photo.webPath);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      setErrorMessage("Failed to take photo. Please try again.");
      setShowErrorToast(true);
    } finally {
      setIsTakingPhoto(false);
    }
  };
  
  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
    
    if (videoRef.current) {
      if (!flashEnabled) {
        videoRef.current.style.filter = "brightness(1.5)";
      } else {
        videoRef.current.style.filter = "brightness(1)";
      }
    }
  };
  
  const toggleCameraDirection = () => {
    setCameraDirection(
      cameraDirection === CameraDirection.Rear
        ? CameraDirection.Front
        : CameraDirection.Rear
    );
  };
  
  return (
    <>
      <IonHeader>
        <IonToolbar color="dark" className="camera-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" color="light" onClick={onClose}>
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton fill="clear" color="light" onClick={toggleFlash}>
              <IonIcon icon={flashEnabled ? flash : flashOff} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen className="camera-content">
        <div className="camera-container">
          <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
        </div>
      </IonContent>
      
      <IonFooter className="camera-footer">
        <div className="camera-controls">
          <IonButton fill="clear" color="light" onClick={toggleCameraDirection} className="camera-control-button">
            <IonIcon icon={cameraReverse} slot="icon-only" />
          </IonButton>
          
          <IonFabButton color="light" className="shutter-button" onClick={takePicture} disabled={isTakingPhoto}>
            {isTakingPhoto ? <IonSpinner name="crescent" /> : <IonIcon icon={camera} />}
          </IonFabButton>
          
          <div className="placeholder-button"></div>
        </div>
      </IonFooter>
      
      <IonAlert
        isOpen={showLocationAlert}
        onDidDismiss={() => setShowLocationAlert(false)}
        header="Location Access"
        message="Could not access your location. Location data won't be added to your photo."
        buttons={['OK']}
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

export default CameraView;