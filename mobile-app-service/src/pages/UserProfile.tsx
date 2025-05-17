import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonActionSheet,
  IonLabel,
  useIonRouter,
} from "@ionic/react";
import { personAdd, checkmark, grid, chevronBack, ellipsisHorizontal, chatbubbleOutline } from "ionicons/icons";
import { useParams } from "react-router";
import { useAuthContext } from "../contexts/AuthContext";
import { getUserById, followUser, unfollowUser, User } from "../services/auth.service";
import { getPostsByUserId, Post } from "../services/post.service";
import { getOrCreateConversation } from "../services/chat.service";
import "./UserProfile.css";

interface RouteParams {
  id: string;
}

const UserProfile: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const router = useIonRouter();
  const { user: currentUser, refreshUser } = useAuthContext();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState<boolean>(false);
  const [selectedSegment, setSelectedSegment] = useState<string>("posts");
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [startingChat, setStartingChat] = useState<boolean>(false);

  useEffect(() => {
    loadUserData();
  }, [id]);

  useEffect(() => {
    if (user && currentUser) {
      setIsFollowing(currentUser.following?.includes(user.id) || false);
    }
  }, [user, currentUser]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Get user data
      const userData = await getUserById(id);

      if (!userData) {
        // User not found, go back
        router.goBack();
        return;
      }

      setUser(userData);

      // Get user posts
      const userPosts = await getPostsByUserId(userData.id);
      setPosts(userPosts);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !currentUser) return;

    try {
      setIsFollowingLoading(true);

      if (isFollowing) {
        await unfollowUser(user.id);
      } else {
        await followUser(user.id);
      }

      // Refresh current user data
      await refreshUser();

      // Update following status
      setIsFollowing(!isFollowing);

      // Refresh user data
      loadUserData();
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user) return;

    try {
      setStartingChat(true);

      const conversation = await getOrCreateConversation(user.id);

      // Navigate to conversation
      router.push(`/app/conversation/${conversation.id}`);
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setStartingChat(false);
    }
  };

  const handleSegmentChange = (value: string) => {
    setSelectedSegment(value);
  };

  if (isLoading) {
    return (
      <IonPage className="user-profile-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/home" icon={chevronBack} text="" />
            </IonButtons>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <IonText color="medium">
              <p>Loading profile...</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!user) {
    return (
      <IonPage className="user-profile-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/home" icon={chevronBack} text="" />
            </IonButtons>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="error-container">
            <IonText color="danger">
              <p>User not found</p>
            </IonText>
            <IonButton onClick={() => router.goBack()}>Go Back</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="user-profile-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/home" icon={chevronBack} text="" />
          </IonButtons>
          <IonTitle>{user.username}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowActionSheet(true)}>
              <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="user-profile-content">
        <div className="profile-header">
          <div className="profile-info">
            <div className="profile-avatar-container">
              <IonAvatar className="profile-avatar">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.username} />
                ) : (
                  <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
                )}
              </IonAvatar>
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
          </div>

          <div className="profile-details">
            <h2>{user.username}</h2>
            {user.fullName && <p className="full-name">{user.fullName}</p>}
            {user.bio && <p className="bio">{user.bio}</p>}
          </div>

          <div className="profile-actions">
            {isFollowingLoading || startingChat ? (
              <div className="buttons-loading">
                <IonSpinner name="dots" />
              </div>
            ) : (
              <>
                <IonButton
                  fill={isFollowing ? "solid" : "outline"}
                  className="follow-button"
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? (
                    <>
                      <IonIcon slot="start" icon={checkmark} />
                      Following
                    </>
                  ) : (
                    <>
                      <IonIcon slot="start" icon={personAdd} />
                      Follow
                    </>
                  )}
                </IonButton>

                <IonButton fill="outline" className="message-button" onClick={handleStartChat}>
                  <IonIcon slot="start" icon={chatbubbleOutline} />
                  Message
                </IonButton>
              </>
            )}
          </div>
        </div>

        <div className="profile-content">
          <IonSegment value={selectedSegment} onIonChange={(e) => handleSegmentChange(e.detail.value!)}>
            <IonSegmentButton value="posts">
              <IonIcon icon={grid} />
            </IonSegmentButton>
          </IonSegment>

          {selectedSegment === "posts" &&
            (posts.length > 0 ? (
              <IonGrid className="posts-grid">
                <IonRow>
                  {posts.map((post) => (
                    <IonCol size="4" key={post.id}>
                      <div className="post-thumbnail" onClick={() => router.push(`/app/photo/${post.id}`)}>
                        <img src={post.imageUrl} alt="Post" />
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
            ) : (
              <div className="empty-posts">
                <IonText color="medium">
                  <p>No posts yet</p>
                </IonText>
              </div>
            ))}
        </div>
      </IonContent>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
          },
        ]}
      />
    </IonPage>
  );
};

export default UserProfile;
