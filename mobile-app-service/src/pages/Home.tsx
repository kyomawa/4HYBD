import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonModal,
  IonAvatar,
  IonItem,
  IonLabel,
  IonActionSheet,
  IonAlert,
  RefresherEventDetail,
  useIonRouter,
} from "@ionic/react";
import {
  camera,
  heart,
  heartOutline,
  chatbubbleOutline,
  ellipsisHorizontal,
  trash,
  share,
  chevronDownCircle,
  imageOutline,
} from "ionicons/icons";
import { useAuthContext } from "../contexts/AuthContext";
import { getFeedPosts, PostWithUser, likePost, unlikePost, deletePost } from "../services/post.service";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import { createPost } from "../services/post.service";
import CameraView from "../components/CameraView";
import PostComposer from "../components/PostComposer";
import StoryCircles from "../components/StoryCircles";
import "./Home.css";
import logoImage from "../assets/logo.png";

const Home: React.FC = () => {
  const { user } = useAuthContext();
  const router = useIonRouter();

  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState<boolean>(false);
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<PostWithUser | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);

  useEffect(() => {
    loadFeedPosts();
  }, []);

  const loadFeedPosts = async () => {
    try {
      setIsLoading(true);
      const feedPosts = await getFeedPosts();
      setPosts(feedPosts);
    } catch (error) {
      console.error("Error loading feed posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = (event: CustomEvent<RefresherEventDetail>) => {
    loadFeedPosts().then(() => {
      event.detail.complete();
    });
  };

  const handleLikeToggle = async (post: PostWithUser) => {
    try {
      if (!user) return;

      // Optimistic update
      const isLiked = post.likes.includes(user.id);

      // Create a new posts array with the updated post
      const updatedPosts = posts.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            likes: isLiked ? p.likes.filter((id) => id !== user.id) : [...p.likes, user.id],
          };
        }
        return p;
      });

      setPosts(updatedPosts);

      // Call the API
      if (isLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      loadFeedPosts();
    }
  };

  const handleCommentClick = (post: PostWithUser) => {
    router.push(`/app/photo/${post.id}`);
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePicture({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1600,
        correctOrientation: true,
        presentationStyle: "fullscreen",
      });

      if (photo && photo.webPath) {
        setCapturedImage(photo.webPath);
        setShowCameraModal(false);
        setShowComposer(true);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handlePhotoTaken = (webPath: string) => {
    setCapturedImage(webPath);
    setShowCameraModal(false);
    setShowComposer(true);
  };

  const handlePublishPost = async (caption: string) => {
    try {
      if (!capturedImage) return;

      await createPost(capturedImage, caption);

      // Reset states
      setCapturedImage(null);
      setShowComposer(false);

      // Reload feed
      await loadFeedPosts();
    } catch (error) {
      console.error("Error publishing post:", error);
    }
  };

  const handlePostOptions = (post: PostWithUser) => {
    setSelectedPost(post);
    setShowActionSheet(true);
  };

  const handleDeletePost = async () => {
    try {
      if (!selectedPost) return;

      await deletePost(selectedPost.id);

      // Remove post from state
      setPosts(posts.filter((p) => p.id !== selectedPost.id));

      // Reset selected post
      setSelectedPost(null);
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setShowDeleteAlert(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffTime = Math.abs(now.getTime() - postDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      }

      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    }

    if (diffDays === 1) {
      return "Yesterday";
    }

    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }

    return postDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderPosts = () => {
    if (isLoading) {
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
        <div className="empty-feed">
          <IonIcon icon={imageOutline} className="empty-feed-icon" />
          <h2>No Posts Yet</h2>
          <p>Follow users or take your first photo to see posts here</p>
          <div className="empty-feed-actions">
            <IonButton fill="solid" onClick={() => setShowCameraModal(true)}>
              <IonIcon slot="start" icon={camera} />
              Take Photo
            </IonButton>
            <IonButton fill="outline" routerLink="/app/search">
              Find People
            </IonButton>
          </div>
        </div>
      );
    }

    return (
      <IonGrid className="feed-grid">
        {posts.map((post) => (
          <IonRow key={post.id}>
            <IonCol size="12">
              <IonCard className="post-card">
                <div className="post-header">
                  <IonItem lines="none" button routerLink={`/app/user/${post.user.id}`}>
                    <IonAvatar slot="start">
                      {post.user.profilePicture ? (
                        <img src={post.user.profilePicture} alt={post.user.username} />
                      ) : (
                        <div className="default-avatar">{post.user.username.charAt(0).toUpperCase()}</div>
                      )}
                    </IonAvatar>
                    <IonLabel>
                      <h2 className="post-username">{post.user.username}</h2>
                      <p className="post-time">{formatDate(post.createdAt)}</p>
                    </IonLabel>
                  </IonItem>

                  <IonButton fill="clear" className="post-options-button" onClick={() => handlePostOptions(post)}>
                    <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
                  </IonButton>
                </div>

                <div className="post-image-container" onClick={() => router.push(`/app/photo/${post.id}`)}>
                  <img src={post.imageUrl} alt="Post" className="post-image" />
                </div>

                <IonCardContent className="post-content">
                  <div className="post-actions">
                    <IonButton fill="clear" className="post-action-button" onClick={() => handleLikeToggle(post)}>
                      <IonIcon
                        slot="icon-only"
                        icon={user && post.likes.includes(user.id) ? heart : heartOutline}
                        className={user && post.likes.includes(user.id) ? "liked" : ""}
                      />
                    </IonButton>

                    <IonButton fill="clear" className="post-action-button" onClick={() => handleCommentClick(post)}>
                      <IonIcon slot="icon-only" icon={chatbubbleOutline} />
                    </IonButton>
                  </div>

                  {post.likes.length > 0 && (
                    <div className="post-likes">
                      <strong>
                        {post.likes.length} like{post.likes.length !== 1 ? "s" : ""}
                      </strong>
                    </div>
                  )}

                  {post.caption && (
                    <div className="post-caption">
                      <strong>{post.user.username}</strong> {post.caption}
                    </div>
                  )}

                  {post.comments.length > 0 && (
                    <div className="post-comments-link" onClick={() => handleCommentClick(post)}>
                      View all {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        ))}
      </IonGrid>
    );
  };

  return (
    <IonPage className="home-page">
      <IonHeader>
        <IonToolbar>
          <div className="home-title-container">
            <img src={logoImage} alt="Logo" className="header-logo" />
            <IonTitle>BeUnreal</IonTitle>
          </div>
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

        <StoryCircles />
        {renderPosts()}

        {/* Camera Modal */}
        <IonModal isOpen={showCameraModal} onDidDismiss={() => setShowCameraModal(false)} className="camera-modal">
          <CameraView onPhotoTaken={handlePhotoTaken} onClose={() => setShowCameraModal(false)} />
        </IonModal>

        {/* Post Composer */}
        <IonModal
          isOpen={showComposer}
          onDidDismiss={() => {
            setShowComposer(false);
            setCapturedImage(null);
          }}
          className="composer-modal"
        >
          <PostComposer
            imageUrl={capturedImage || ""}
            onPublish={handlePublishPost}
            onCancel={() => {
              setShowComposer(false);
              setCapturedImage(null);
            }}
          />
        </IonModal>

        {/* Action Sheet for post options */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => {
            setShowActionSheet(false);
            setSelectedPost(null);
          }}
          buttons={[
            {
              text: "Share",
              icon: share,
              handler: () => {
                console.log("Share clicked");
              },
            },
            ...(selectedPost && selectedPost.user.id === user?.id
              ? [
                  {
                    text: "Delete",
                    role: "destructive",
                    icon: trash,
                    handler: () => {
                      setShowDeleteAlert(true);
                    },
                  },
                ]
              : []),
            {
              text: "Cancel",
              role: "cancel",
            },
          ]}
        />

        {/* Delete confirmation alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              role: "destructive",
              handler: handleDeletePost,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
