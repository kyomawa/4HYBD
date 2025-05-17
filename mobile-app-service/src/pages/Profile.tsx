import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonImg,
  IonActionSheet,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonAvatar,
  IonChip,
  RefresherEventDetail,
  useIonRouter,
} from "@ionic/react";
import {
  settings,
  camera,
  grid,
  logOut,
  lockClosed,
  chevronDownCircle,
  ellipsisHorizontal,
  pencil,
} from "ionicons/icons";
import { useAuthContext } from "../contexts/AuthContext";
import { getPostsByUserId, Post } from "../services/post.service";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import { updateUserProfile } from "../services/auth.service";
import "./Profile.css";

const Profile: React.FC = () => {
  const { user, isLoading: authLoading, logout, refreshUser } = useAuthContext();
  const router = useIonRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState<boolean>(false);

  useEffect(() => {
    loadUserData();
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userPosts = await getPostsByUserId(user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await refreshUser();
      await loadUserData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      event.detail.complete();
    }
  };

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
          profilePicture: photo.webPath,
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
      <div className="profile-header">
        <div className="profile-avatar-container">
          <IonAvatar className="profile-avatar" onClick={handleTakeProfilePicture}>
            {user.profilePicture ? (
              <IonImg src={user.profilePicture} alt={user.username} />
            ) : (
              <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
            )}
          </IonAvatar>
          <div className="edit-avatar-icon">
            <IonIcon icon={camera} />
          </div>
        </div>

        <div className="profile-username">
          <h2>{user.username}</h2>
          {user.fullName && <p className="profile-fullname">{user.fullName}</p>}
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <strong>{posts.length}</strong>
            <span>Posts</span>
          </div>
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
          <IonButton fill="outline" className="edit-profile-button" routerLink="/app/edit-profile">
            <IonIcon slot="start" icon={pencil} />
            Edit Profile
          </IonButton>

          <IonButton fill="clear" className="options-button" onClick={() => setShowActionSheet(true)}>
            <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
          </IonButton>
        </div>
      </div>
    );
  };

  const renderPosts = () => {
    if (isLoading || authLoading) {
      return (
        <div className="spinner-container">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading posts...</p>
          </IonText>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="empty-state">
          <IonIcon className="empty-state-icon" icon={camera} />
          <h2 className="empty-state-title">No Posts Yet</h2>
          <p className="empty-state-message">Your photos will appear here</p>
          <IonButton routerLink="/app/home">Take Your First Photo</IonButton>
        </div>
      );
    }

    return (
      <IonGrid className="posts-grid">
        <IonRow>
          {posts.map((post) => (
            <IonCol size="4" key={post.id}>
              <div className="post-thumbnail" onClick={() => router.push(`/app/photo/${post.id}`)}>
                <IonImg src={post.imageUrl} alt="Post" />
                {post.likes.length > 0 && (
                  <div className="post-likes-indicator">
                    <span>{post.likes.length}</span>
                  </div>
                )}
              </div>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>
    );
  };

  return (
    <IonPage className="profile-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{user?.username || "Profile"}</IonTitle>
          <IonButton slot="end" fill="clear" routerLink="/app/settings">
            <IonIcon slot="icon-only" icon={settings} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={chevronDownCircle}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>

        {renderProfileHeader()}

        <div className="profile-content">
          {renderPosts()}
        </div>

        {/* Action Sheet for profile options */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
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
