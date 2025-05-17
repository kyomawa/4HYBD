import React, { useState, useEffect, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonFooter,
  IonTextarea,
  IonIcon,
  IonSpinner,
  IonAvatar,
  IonText,
  IonActionSheet,
  IonAlert,
  useIonRouter,
} from "@ionic/react";
import { camera, send, image, informationCircleOutline, ellipsisVertical, chevronBack, arrowUp } from "ionicons/icons";
import { useParams } from "react-router";
import { useAuthContext } from "../contexts/AuthContext";
import {
  getConversationById,
  getMessages,
  sendMessage,
  MessageWithUser,
  ConversationWithUsers,
} from "../services/chat.service";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import "./Conversation.css";

interface RouteParams {
  id: string;
}

const Conversation: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const router = useIonRouter();
  const { user: currentUser } = useAuthContext();
  const contentRef = useRef<HTMLIonContentElement>(null);

  const [conversation, setConversation] = useState<ConversationWithUsers | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [messageText, setMessageText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);

  useEffect(() => {
    loadConversation();
    loadMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      loadMessages(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      const conversationData = await getConversationById(id);

      if (!conversationData) {
        setError("Conversation not found");
        return;
      }

      setConversation(conversationData);
    } catch (error) {
      console.error("Error loading conversation:", error);
      setError("Failed to load conversation");
    }
  };

  const loadMessages = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const conversationMessages = await getMessages(id);
      setMessages(conversationMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      setError("Failed to load messages");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setIsSending(true);

      // Optimistic update
      if (currentUser) {
        const optimisticMessage: MessageWithUser = {
          id: `temp_${Date.now()}`,
          conversationId: id,
          senderId: currentUser.id,
          content: messageText,
          createdAt: Date.now(),
          isRead: false,
          sender: {
            id: currentUser.id,
            username: currentUser.username,
            profilePicture: currentUser.profilePicture,
          },
        };

        setMessages([...messages, optimisticMessage]);
      }

      // Clear input
      setMessageText("");

      // Send message
      await sendMessage(id, messageText);

      // Reload messages
      await loadMessages(false);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePicture({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (photo && photo.webPath) {
        // Send image message
        setIsSending(true);

        // Optimistic update
        if (currentUser) {
          const optimisticMessage: MessageWithUser = {
            id: `temp_${Date.now()}`,
            conversationId: id,
            senderId: currentUser.id,
            content: "Photo",
            imageUrl: photo.webPath,
            createdAt: Date.now(),
            isRead: false,
            sender: {
              id: currentUser.id,
              username: currentUser.username,
              profilePicture: currentUser.profilePicture,
            },
          };

          setMessages([...messages, optimisticMessage]);
        }

        // Send message
        await sendMessage(id, "Photo", photo.webPath);

        // Reload messages
        await loadMessages(false);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollToBottom(300);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return "Today";
    }

    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: today.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
    });
  };

  const groupMessagesByDate = (messages: MessageWithUser[]) => {
    const groups: { [date: string]: MessageWithUser[] } = {};

    messages.forEach((message) => {
      const date = formatDate(message.createdAt);

      if (!groups[date]) {
        groups[date] = [];
      }

      groups[date].push(message);
    });

    return groups;
  };

  const renderHeaderTitle = () => {
    if (!conversation) return "Chat";

    if (conversation.isGroup) {
      return conversation.groupName || "Group Chat";
    }

    if (conversation.users.length > 0) {
      return conversation.users[0].username;
    }

    return "Chat";
  };

  const renderHeaderAvatar = () => {
    if (!conversation) return null;

    if (conversation.isGroup) {
      return (
        <div className="header-avatar group-avatar">
          {conversation.groupAvatar ? (
            <img src={conversation.groupAvatar} alt={conversation.groupName} />
          ) : (
            <div className="group-avatar-placeholder">
              <IonIcon icon={informationCircleOutline} />
            </div>
          )}
        </div>
      );
    }

    if (conversation.users.length > 0) {
      const otherUser = conversation.users[0];

      return (
        <IonAvatar className="header-avatar">
          {otherUser.profilePicture ? (
            <img src={otherUser.profilePicture} alt={otherUser.username} />
          ) : (
            <div className="default-avatar">{otherUser.username.charAt(0).toUpperCase()}</div>
          )}
        </IonAvatar>
      );
    }

    return null;
  };

  const renderMessages = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading messages...</p>
          </IonText>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
          <IonButton onClick={() => loadMessages()}>Retry</IonButton>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="empty-conversation">
          <IonText color="medium">
            <p>No messages yet</p>
            <p>Say hello! 👋</p>
          </IonText>
        </div>
      );
    }

    const messageGroups = groupMessagesByDate(messages);

    return (
      <div className="messages-container">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date} className="message-date-group">
            <div className="date-separator">
              <div className="date-line"></div>
              <div className="date-bubble">{date}</div>
              <div className="date-line"></div>
            </div>

            {dateMessages.map((message, index) => {
              const isMine = message.senderId === currentUser?.id;
              const isFirstInGroup = index === 0 || dateMessages[index - 1].senderId !== message.senderId;
              const isLastInGroup =
                index === dateMessages.length - 1 || dateMessages[index + 1].senderId !== message.senderId;

              return (
                <div key={message.id} className={`message-container ${isMine ? "mine" : "theirs"}`}>
                  {!isMine && isFirstInGroup && (
                    <IonAvatar className="message-avatar">
                      {message.sender.profilePicture ? (
                        <img src={message.sender.profilePicture} alt={message.sender.username} />
                      ) : (
                        <div className="default-avatar">{message.sender.username.charAt(0).toUpperCase()}</div>
                      )}
                    </IonAvatar>
                  )}

                  <div className={`message-content-container ${!isMine && !isFirstInGroup ? "with-spacing" : ""}`}>
                    {!isMine && isFirstInGroup && conversation?.isGroup && (
                      <div className="message-sender-name">{message.sender.username}</div>
                    )}

                    <div
                      className={`message-bubble ${isMine ? "mine" : "theirs"} ${isFirstInGroup ? "first" : ""} ${
                        isLastInGroup ? "last" : ""
                      }`}
                    >
                      {message.imageUrl ? (
                        <div className="message-image-container">
                          <img src={message.imageUrl} alt="Message" className="message-image" />
                        </div>
                      ) : (
                        <div className="message-text">{message.content}</div>
                      )}

                      <div className="message-metadata">
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <IonPage className="conversation-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/chat" icon={chevronBack} text="" />
          </IonButtons>

          <div className="conversation-header">
            {renderHeaderAvatar()}
            <IonTitle>{renderHeaderTitle()}</IonTitle>
          </div>

          <IonButtons slot="end">
            <IonButton onClick={() => setShowActionSheet(true)}>
              <IonIcon slot="icon-only" icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="conversation-content" scrollEvents={true}>
        {renderMessages()}
      </IonContent>

      <IonFooter className="conversation-footer">
        <div className="input-container">
          <div className="textarea-container">
            <IonTextarea
              value={messageText}
              onIonChange={(e) => setMessageText(e.detail.value!)}
              placeholder="Message"
              autoGrow
              rows={1}
              className="message-textarea"
              disabled={isSending}
            />
          </div>

          <div className="actions-container">
            <IonButton fill="clear" className="action-button" onClick={handleTakePhoto} disabled={isSending}>
              <IonIcon slot="icon-only" icon={camera} />
            </IonButton>

            <IonButton
              fill="solid"
              className="send-button"
              onClick={handleSendMessage}
              disabled={isSending || !messageText.trim()}
            >
              {isSending ? <IonSpinner name="dots" /> : <IonIcon slot="icon-only" icon={send} />}
            </IonButton>
          </div>
        </div>
      </IonFooter>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        buttons={[
          {
            text: "View Profile",
            handler: () => {
              if (conversation && !conversation.isGroup && conversation.users.length > 0) {
                router.push(`/app/user/${conversation.users[0].id}`);
              }
            },
          },
          {
            text: "Cancel",
            role: "cancel",
          },
        ]}
      />
    </IonPage>
  );
};

export default Conversation;
