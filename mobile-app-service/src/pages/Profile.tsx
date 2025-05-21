import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonActionSheet,
  IonAlert,
  IonAvatar,
  useIonRouter,
} from "@ionic/react";
import {
  settings,
  logOut,
  ellipsisHorizontal,
  pencil,
} from "ionicons/icons";
import { useAuthContext } from "../contexts/AuthContext";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import { updateUserProfile } from "../services/auth.service";
import "./Profile.css";

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuthContext();
  const router = useIonRouter();

  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login", "root", "replace");
    } catch (error) {
      console.error("Error logging out:", error);
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
        await updateUserProfile({
          avatar: photo.webPath,
        });
        await refreshUser();
      }
    } catch (error) {
      console.error("Error taking profile picture:", error);
    }
  };

  const renderProfileHeader = () => {
    if (!user) return null;

    return (
      // @ts-ignore
      <div className="profile-header">
        <div className="profile-avatar-container">
          {/* @ts-ignore */}
          <IonAvatar className="profile-avatar">
            <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
          </IonAvatar>
        </div>

        <div className="profile-username">
          <h2>{user.username}</h2>
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <strong>{user.followers?.length || 0}</strong>
            <span>Followers</span>
          </div>
          <div className="stat-item">
            <strong>{user.following?.length || 0}</strong>
            <span>Following</span>
          </div>
        </div>

        {user.bio && (
          <div className="profile-bio">
            <p>{user.bio}</p>
          </div>
        )}

        <div className="profile-actions">
          {/* @ts-ignore */}
          <IonButton 
            fill="outline" 
            className="edit-profile-button" 
            routerLink="/app/edit-profile"
          >
            {/* @ts-ignore */}
            <IonIcon slot="start" icon={pencil} />
            Edit Profile
          </IonButton>

          {/* @ts-ignore */}
          <IonButton 
            fill="clear" 
            className="options-button" 
            onClick={() => setShowActionSheet(true)}
          >
            {/* @ts-ignore */}
            <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
          </IonButton>
        </div>
      </div>
    );
  };

  return (
    <IonPage className="profile-page">
      {/* @ts-ignore */}
      <IonHeader>
        {/* @ts-ignore */}
        <IonToolbar>
          {/* @ts-ignore */}
          <IonTitle>{user?.username || "Profile"}</IonTitle>
          {/* @ts-ignore */}
          <IonButton slot="end" fill="clear" routerLink="/app/settings">
            {/* @ts-ignore */}
            <IonIcon slot="icon-only" icon={settings} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      {/* @ts-ignore */}
      <IonContent fullscreen>
        {renderProfileHeader()}

        {/* Action Sheet for profile options */}
        {/* @ts-ignore */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: "Change Profile Picture",
              icon: pencil,
              handler: handleTakeProfilePicture,
            },
            {
              text: "Logout",
              role: "destructive",
              icon: logOut,
              handler: () => setShowLogoutAlert(true),
            },
            {
              text: "Cancel",
              role: "cancel",
            },
          ]}
        />

        {/* Logout Confirmation Alert */}
        {/* @ts-ignore */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="Logout"
          message="Are you sure you want to logout?"
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Logout",
              handler: handleLogout,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Profile;