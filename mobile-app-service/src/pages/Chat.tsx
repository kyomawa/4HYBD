import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonModal,
  IonSpinner,
  IonText,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  useIonRouter,
  IonSegment,
  IonSegmentButton,
  IonBadge,
} from "@ionic/react";
import { pencil, chevronForward, personAdd, search, people, chevronDownCircle, add, chatbubble } from "ionicons/icons";
import { useAuthContext } from "../contexts/AuthContext";
import { getConversations, ConversationWithUsers } from "../services/chat.service";
import NewChatModal from "../components/NewChatModal";
import "./Chat.css";

const Chat: React.FC = () => {
  const { user } = useAuthContext();
  const router = useIonRouter();

  const [conversations, setConversations] = useState<ConversationWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [conversationType, setConversationType] = useState<string>("all");

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const userConversations = await getConversations();
      setConversations(userConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = (event: CustomEvent<RefresherEventDetail>) => {
    loadConversations().then(() => {
      event.detail.complete();
    });
  };

  const handleSearchChange = (e: CustomEvent) => {
    setSearchText(e.detail.value);
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleNewChatSuccess = () => {
    setShowNewChatModal(false);
    loadConversations();
  };

  const formatLastMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return "Hier";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations
    .filter((conversation) => {
      // Filter by search text
      if (searchText) {
        if (conversation.isGroup && conversation.groupName) {
          return conversation.groupName.toLowerCase().includes(searchText.toLowerCase());
        } else if (!conversation.isGroup && conversation.users.length > 0) {
          return conversation.users[0].username.toLowerCase().includes(searchText.toLowerCase());
        }
        return false;
      }

      // Filter by conversation type
      if (conversationType === "direct") {
        return !conversation.isGroup;
      } else if (conversationType === "group") {
        return conversation.isGroup;
      }

      return true; // "all" type
    })
    .sort((a, b) => {
      // Sort by last message time
      const timeA = a.lastMessage ? a.lastMessage.createdAt : a.updatedAt;
      const timeB = b.lastMessage ? b.lastMessage.createdAt : b.updatedAt;
      return timeB - timeA;
    });

  const renderConversationItem = (conversation: ConversationWithUsers) => {
    if (conversation.isGroup) {
      // Group conversation
      return (
        <IonItem
          key={conversation.id}
          routerLink={`/app/conversation/${conversation.id}`}
          detail={false}
          className="conversation-item"
        >
          <div className="group-avatar" slot="start">
            {conversation.groupAvatar ? (
              <img src={conversation.groupAvatar} alt={conversation.groupName} />
            ) : (
              <div className="group-avatar-placeholder">
                <IonIcon icon={people} />
              </div>
            )}
          </div>

          <IonLabel>
            <h2>{conversation.groupName || "Groupe"}</h2>
            {conversation.lastMessage && <p className="message-preview">{conversation.lastMessage.content}</p>}
          </IonLabel>

          {conversation.lastMessage && (
            <div className="conversation-time" slot="end">
              <span>{formatLastMessageTime(conversation.lastMessage.createdAt)}</span>
              <IonIcon icon={chevronForward} />
            </div>
          )}
        </IonItem>
      );
    } else {
      // Direct conversation
      const otherUser = conversation.users[0];

      if (!otherUser) return null;

      return (
        <IonItem
          key={conversation.id}
          routerLink={`/app/conversation/${conversation.id}`}
          detail={false}
          className="conversation-item"
        >
          <IonAvatar slot="start">
            {otherUser.profilePicture ? (
              <img src={otherUser.profilePicture} alt={otherUser.username} />
            ) : (
              <div className="default-avatar">{otherUser.username.charAt(0).toUpperCase()}</div>
            )}
          </IonAvatar>

          <IonLabel>
            <h2>{otherUser.username}</h2>
            {conversation.lastMessage && (
              <p className="message-preview">
                {conversation.lastMessage.senderId === user?.id ? (
                  <span className="message-preview-you">Vous: </span>
                ) : null}
                {conversation.lastMessage.content}
              </p>
            )}
          </IonLabel>

          {conversation.lastMessage && (
            <div className="conversation-time" slot="end">
              <span>{formatLastMessageTime(conversation.lastMessage.createdAt)}</span>
              <IonIcon icon={chevronForward} />
            </div>
          )}
        </IonItem>
      );
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <IonSpinner name="crescent" />
          <IonText color="medium">Chargement des conversations...</IonText>
        </div>
      );
    }

    if (filteredConversations.length === 0) {
      if (searchText) {
        return (
          <div className="empty-state">
            <IonText color="medium">Aucune conversation ne correspond à votre recherche</IonText>
          </div>
        );
      }

      return (
        <div className="empty-state">
          <IonIcon icon={chatbubble} className="empty-icon" />
          <IonText color="medium">Aucune conversation pour le moment</IonText>
          <IonText color="medium">Appuyez sur le + pour commencer à discuter</IonText>
        </div>
      );
    }

    return (
      <IonList className="conversation-list">
        {filteredConversations.map((conversation) => renderConversationItem(conversation))}
      </IonList>
    );
  };

  return (
    <IonPage className="chat-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Messages</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonChange={handleSearchChange}
            placeholder="Rechercher"
            animated
            className="chat-searchbar"
          />
          <IonSegment value={conversationType} onIonChange={(e) => setConversationType(e.detail.value!)}>
            <IonSegmentButton value="all">
              <IonLabel>Tous</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="direct">
              <IonLabel>Directs</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="group">
              <IonLabel className="group-label">
                Groupes
                {conversations.filter((c) => c.isGroup).length > 0 && (
                  <IonBadge color="primary" className="group-badge">
                    {conversations.filter((c) => c.isGroup).length}
                  </IonBadge>
                )}
              </IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={chevronDownCircle}
            pullingText="Tirer pour rafraîchir"
            refreshingSpinner="circles"
            refreshingText="Chargement..."
          />
        </IonRefresher>

        {renderContent()}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleNewChat}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showNewChatModal} onDidDismiss={() => setShowNewChatModal(false)}>
          <NewChatModal 
            onClose={() => setShowNewChatModal(false)} 
            onSuccess={handleNewChatSuccess} 
          />
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Chat;
