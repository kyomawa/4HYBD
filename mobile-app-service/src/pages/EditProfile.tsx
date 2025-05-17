import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonAvatar,
  IonIcon,
  IonSpinner,
  IonToast,
  useIonRouter,
} from "@ionic/react";
import { camera, checkmark, chevronBack } from "ionicons/icons";
import { useAuthContext } from "../contexts/AuthContext";
import { updateUserProfile } from "../services/auth.service";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import "./EditProfile.css";

const EditProfile: React.FC = () => {
  const { user, refreshUser } = useAuthContext();
  const router = useIonRouter();

  const [fullName, setFullName] = useState<string>(user?.fullName || "");
  const [username, setUsername] = useState<string>(user?.username || "");
  const [bio, setBio] = useState<string>(user?.bio || "");
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user?.profilePicture);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  const handleSave = async () => {
    try {
      if (!username.trim()) {
        setToastMessage("Username cannot be empty");
        setShowToast(true);
        return;
      }

      setIsLoading(true);

      await updateUserProfile({
        username,
        fullName: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        profilePicture,
      });

      await refreshUser();

      setToastMessage("Profile updated successfully");
      setShowToast(true);

      // Go back to profile
      setTimeout(() => {
        router.goBack();
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      setToastMessage("Failed to update profile");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeProfilePicture = async () => {
    try {
      const photo = await takePicture({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 400,
        height: 400,
        presentationStyle: "fullscreen",
      });

      if (photo && photo.webPath) {
        setProfilePicture(photo.webPath);
      }
    } catch (error) {
      console.error("Error taking profile picture:", error);
    }
  };

  return (
    <IonPage className="edit-profile-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/profile" icon={chevronBack} text="" />
          </IonButtons>
          <IonTitle>Edit Profile</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} disabled={isLoading}>
              {isLoading ? <IonSpinner name="dots" /> : <IonIcon icon={checkmark} />}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="profile-picture-container">
          <IonAvatar className="profile-avatar" onClick={handleTakeProfilePicture}>
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" />
            ) : (
              <div className="default-avatar">{username.charAt(0).toUpperCase()}</div>
            )}
          </IonAvatar>

          <IonButton fill="clear" size="small" className="change-photo-button" onClick={handleTakeProfilePicture}>
            <IonIcon slot="start" icon={camera} />
            Change Photo
          </IonButton>
        </div>

        <div className="form-container">
          <IonItem className="form-item">
            <IonLabel position="floating">Username</IonLabel>
            <IonInput
              value={username}
              onIonChange={(e) => setUsername(e.detail.value!)}
              type="text"
              autocapitalize="off"
              required
            />
          </IonItem>

          <IonItem className="form-item">
            <IonLabel position="floating">Full Name</IonLabel>
            <IonInput value={fullName} onIonChange={(e) => setFullName(e.detail.value!)} type="text" />
          </IonItem>

          <IonItem className="form-item">
            <IonLabel position="floating">Bio</IonLabel>
            <IonTextarea value={bio} onIonChange={(e) => setBio(e.detail.value!)} autoGrow rows={4} maxlength={150} />
          </IonItem>
        </div>
      </IonContent>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </IonPage>
  );
};

export default EditProfile;
