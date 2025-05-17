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
  IonItem,
  IonAvatar,
  IonLabel,
  IonList,
  IonInput,
  IonSpinner,
  IonText,
  IonActionSheet,
  IonAlert,
  useIonRouter,
} from "@ionic/react";
import { heart, heartOutline, chatbubbleOutline, ellipsisHorizontal, chevronBack, send, trash } from "ionicons/icons";
import { useParams } from "react-router";
import { useAuthContext } from "../contexts/AuthContext";
import {
  getPostById,
  likePost,
  unlikePost,
  addComment,
  getCommentsWithUsers,
  deletePost,
  Post,
} from "../services/post.service";
import { getUserById } from "../services/auth.service";
import "./PhotoView.css";

interface RouteParams {
  id: string;
}

const PhotoView: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const router = useIonRouter();
  const { user: currentUser } = useAuthContext();

  const [post, setPost] = useState<Post | null>(null);
  const [postUser, setPostUser] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCommenting, setIsCommenting] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get post
      const postData = await getPostById(id);

      if (!postData) {
        // Post not found, go back
        router.goBack();
        return;
      }

      setPost(postData);

      // Get post author
      const userData = await getUserById(postData.userId);
      setPostUser(userData);

      // Get comments
      const postComments = await getCommentsWithUsers(id);
      setComments(postComments);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!post || !currentUser) return;

    try {
      setIsLiking(true);

      const isLiked = post.likes.includes(currentUser.id);

      // Optimistic update
      setPost({
        ...post,
        likes: isLiked ? post.likes.filter((id) => id !== currentUser.id) : [...post.likes, currentUser.id],
      });

      // Call API
      if (isLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      loadData();
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !post) return;

    try {
      setIsCommenting(true);

      await addComment(post.id, commentText);

      // Clear input
      setCommentText("");

      // Reload comments
      const postComments = await getCommentsWithUsers(id);
      setComments(postComments);
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;

    try {
      await deletePost(post.id);

      // Go back to profile
      router.goBack();
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
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

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <IonPage className="photo-view-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/home" icon={chevronBack} text="" />
            </IonButtons>
            <IonTitle>Photo</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <IonText color="medium">
              <p>Loading photo...</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!post || !postUser) {
    return (
      <IonPage className="photo-view-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/home" icon={chevronBack} text="" />
            </IonButtons>
            <IonTitle>Photo</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="error-container">
            <IonText color="danger">
              <p>Photo not found</p>
            </IonText>
            <IonButton onClick={() => router.goBack()}>Go Back</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="photo-view-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/home" icon={chevronBack} text="" />
          </IonButtons>
          <IonTitle>Photo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowActionSheet(true)}>
              <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="photo-view-content">
        <div className="photo-container">
          <div className="photo-header">
            <IonItem lines="none" button routerLink={`/app/user/${postUser.id}`}>
              <IonAvatar slot="start">
                {postUser.profilePicture ? (
                  <img src={postUser.profilePicture} alt={postUser.username} />
                ) : (
                  <div className="default-avatar">{postUser.username.charAt(0).toUpperCase()}</div>
                )}
              </IonAvatar>
              <IonLabel>
                <h2 className="username">{postUser.username}</h2>
                <p className="time">{formatDate(post.createdAt)}</p>
              </IonLabel>
            </IonItem>
          </div>

          <div className="photo-image-container">
            <img src={post.imageUrl} alt="Post" className="photo-image" />
          </div>

          <div className="photo-actions">
            <IonButton fill="clear" className="action-button" onClick={handleLikeToggle} disabled={isLiking}>
              <IonIcon
                slot="icon-only"
                icon={currentUser && post.likes.includes(currentUser.id) ? heart : heartOutline}
                className={currentUser && post.likes.includes(currentUser.id) ? "liked" : ""}
              />
            </IonButton>

            <IonButton fill="clear" className="action-button">
              <IonIcon slot="icon-only" icon={chatbubbleOutline} />
            </IonButton>
          </div>

          <div className="photo-info">
            {post.likes.length > 0 && (
              <div className="likes-count">
                <strong>
                  {post.likes.length} like{post.likes.length !== 1 ? "s" : ""}
                </strong>
              </div>
            )}

            {post.caption && (
              <div className="caption">
                <strong>{postUser.username}</strong> {post.caption}
              </div>
            )}
          </div>

          <div className="comments-section">
            <div className="comments-header">
              <h2>Comments</h2>
            </div>

            {comments.length > 0 ? (
              <IonList className="comments-list">
                {comments.map((comment) => (
                  <IonItem key={comment.id} className="comment-item">
                    <IonAvatar slot="start">
                      {comment.user?.profilePicture ? (
                        <img src={comment.user.profilePicture} alt={comment.user.username} />
                      ) : (
                        <div className="default-avatar">{comment.user?.username.charAt(0).toUpperCase() || "?"}</div>
                      )}
                    </IonAvatar>
                    <IonLabel>
                      <h3>{comment.user?.username || "Unknown User"}</h3>
                      <p>{comment.text}</p>
                      <p className="comment-time">{formatDate(comment.createdAt)}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            ) : (
              <div className="no-comments">
                <IonText color="medium">
                  <p>No comments yet</p>
                </IonText>
              </div>
            )}
          </div>
        </div>
      </IonContent>

      <div className="comment-input-container">
        <IonItem className="comment-input-item" lines="none">
          <IonInput
            value={commentText}
            onIonChange={(e) => setCommentText(e.detail.value!)}
            placeholder="Add a comment..."
            className="comment-input"
            disabled={isCommenting}
          />
          <IonButton
            fill="clear"
            className="send-button"
            onClick={handleAddComment}
            disabled={!commentText.trim() || isCommenting}
          >
            {isCommenting ? <IonSpinner name="dots" /> : <IonIcon slot="icon-only" icon={send} />}
          </IonButton>
        </IonItem>
      </div>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        buttons={[
          ...(post.userId === currentUser?.id
            ? [
                {
                  text: "Delete",
                  role: "destructive",
                  icon: trash,
                  handler: () => setShowDeleteAlert(true),
                },
              ]
            : []),
          {
            text: "Cancel",
            role: "cancel",
          },
        ]}
      />

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
    </IonPage>
  );
};

export default PhotoView;
