import React, { useState, useEffect } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonText,
  IonSegment,
  IonSegmentButton,
  useIonRouter,
} from "@ionic/react";
import { close, person, people } from "ionicons/icons";
import { searchUsers, User } from "../services/auth.service";
import { getOrCreateConversation } from "../services/chat.service";
import GroupChatCreator from "./GroupChatCreator";
import "./NewChatModal.css";

interface NewChatModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onSuccess }) => {
  const router = useIonRouter();

  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [chatType, setChatType] = useState<"direct" | "group">("direct");

  useEffect(() => {
    if (searchText.trim().length > 0 && chatType === "direct") {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchText, chatType]);

  const handleSearch = async () => {
    if (searchText.trim().length === 0) return;

    try {
      setIsSearching(true);
      const users = await searchUsers(searchText);
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = async (user: User) => {
    try {
      setIsCreating(true);
      const conversation = await getOrCreateConversation(user.id);

      // Navigate to conversation
      router.push(`/app/conversation/${conversation.id}`);

      // Notify parent of success
      onSuccess();
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGroupCreated = (conversationId: string) => {
    router.push(`/app/conversation/${conversationId}`);
    onSuccess();
  };

  const renderUserItem = (user: User) => {
    return (
      <IonItem
        key={user.id}
        className="user-item"
        onClick={() => handleUserSelect(user)}
        button
        detail={false}
        disabled={isCreating}
        lines="none"
      >
        <IonAvatar slot="start">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.username} />
          ) : (
            <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
          )}
        </IonAvatar>

        <IonLabel>
          <h2>{user.username}</h2>
          {user.fullName && <p>{user.fullName}</p>}
        </IonLabel>
      </IonItem>
    );
  };

  const renderDirectChatContent = () => {
    if (isSearching) {
      return (
        <div className="center-content">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Recherche en cours...</p>
          </IonText>
        </div>
      );
    }

    if (searchText && searchResults.length === 0) {
      return (
        <div className="center-content">
          <IonText color="medium">
            <p>Aucun utilisateur trouvé pour "{searchText}"</p>
          </IonText>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="center-content">
          <IonText color="medium">
            <p>Recherchez un utilisateur pour commencer une conversation</p>
          </IonText>
        </div>
      );
    }

    return (
      <IonList className="user-list">
        <div className="section-header">Résultats</div>
        {searchResults.map(renderUserItem)}
      </IonList>
    );
  };

  return (
    <>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={onClose} disabled={isCreating}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>Nouvelle conversation</IonTitle>
        </IonToolbar>
        
        <IonToolbar>
          <IonSegment value={chatType} onIonChange={(e) => setChatType(e.detail.value as "direct" | "group")}>
            <IonSegmentButton value="direct">
              <IonIcon icon={person} />
              <IonLabel>Directe</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="group">
              <IonIcon icon={people} />
              <IonLabel>Groupe</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      {chatType === "direct" ? (
        <IonContent className="new-chat-content">
          <div className="search-container">
            <IonSearchbar
              value={searchText}
              onIonChange={(e) => setSearchText(e.detail.value!)}
              placeholder="Rechercher des utilisateurs"
              debounce={300}
              animated
              showClearButton="always"
              className="custom-searchbar"
            />
          </div>

          {renderDirectChatContent()}
        </IonContent>
      ) : (
        <GroupChatCreator onClose={onClose} onSuccess={handleGroupCreated} />
      )}
    </>
  );
};

export default NewChatModal;
