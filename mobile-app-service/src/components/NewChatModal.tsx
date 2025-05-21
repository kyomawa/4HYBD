import React, { useState, useEffect } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonAvatar,
  IonChip,
  IonSpinner,
  IonText,
  IonFooter,
  InputCustomEvent,
  SegmentCustomEvent,
} from "@ionic/react";
import { close, checkmark, people, personAdd, arrowForward } from "ionicons/icons";
import { searchUsers, User } from "../services/auth.service";
import { getOrCreateConversation, createGroupConversation } from "../services/chat.service";
import "./NewChatModal.css";

interface NewChatModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onSuccess }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<string>("direct");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    if (searchText.trim().length > 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchText]);

  const handleSearch = async () => {
    if (searchText.trim().length < 3) return;

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

  const handleSearchChange = (e: InputCustomEvent) => {
    setSearchText(e.detail.value || "");
  };

  const handleSegmentChange = (e: SegmentCustomEvent) => {
    setSelectedMode(e.detail.value as string);
    // Clear selections when switching modes
    setSelectedUsers([]);
  };

  const toggleUserSelection = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);

    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleStartChat = async () => {
    try {
      setIsCreating(true);

      if (selectedMode === "direct") {
        // For direct chat, only the first selected user is used
        if (selectedUsers.length === 0) {
          return;
        }

        const conversation = await getOrCreateConversation(selectedUsers[0].id);
        onSuccess();
      } else {
        // For group chat
        if (selectedUsers.length === 0 || !groupName.trim()) {
          return;
        }

        const userIds = selectedUsers.map((user) => user.id);
        const conversation = await createGroupConversation(userIds, groupName);
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="search-loading">
          <IonSpinner name="crescent" />
          <p>Searching users...</p>
        </div>
      );
    }

    if (searchResults.length === 0 && searchText.trim().length > 2) {
      return (
        <div className="no-results">
          <IonText color="medium">
            <p>No users found matching "{searchText}"</p>
          </IonText>
        </div>
      );
    }

    return (
      <IonList>
        {searchResults.map((user) => (
          <IonItem
            key={user.id}
            className={`user-item ${
              selectedUsers.some((u) => u.id === user.id) ? "selected" : ""
            }`}
            onClick={() => toggleUserSelection(user)}
            detail={false}
            button
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
            {selectedUsers.some((u) => u.id === user.id) && (
              <IonIcon icon={checkmark} color="primary" slot="end" />
            )}
          </IonItem>
        ))}
      </IonList>
    );
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>New Chat</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleStartChat}
              disabled={
                isCreating ||
                selectedUsers.length === 0 ||
                (selectedMode === "group" && !groupName.trim())
              }
            >
              {isCreating ? <IonSpinner name="dots" /> : "Start"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={selectedMode} onIonChange={handleSegmentChange}>
            <IonSegmentButton value="direct">
              <IonIcon icon={personAdd} />
              <IonLabel>Direct</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="group">
              <IonIcon icon={people} />
              <IonLabel>Group</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="new-chat-content">
          <IonSearchbar
            value={searchText}
            onIonChange={handleSearchChange}
            placeholder="Search users..."
            debounce={500}
            animated
            showCancelButton="never"
          />

          {selectedMode === "group" && (
            <div className="group-name-container">
              <IonItem className="group-name-input">
                <IonLabel position="floating">Group Name</IonLabel>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </IonItem>
            </div>
          )}

          {selectedUsers.length > 0 && (
            <div className="selected-users">
              {selectedUsers.map((user) => (
                <IonChip
                  key={user.id}
                  className="selected-user-chip"
                  onClick={() => toggleUserSelection(user)}
                >
                  <IonAvatar>
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.username} />
                    ) : (
                      <div className="default-avatar">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </IonAvatar>
                  <IonLabel>{user.username}</IonLabel>
                  <IonIcon icon={close} />
                </IonChip>
              ))}
            </div>
          )}

          {renderSearchResults()}

          {selectedMode === "direct" && selectedUsers.length > 0 && (
            <div className="action-hint">
              <IonText color="medium">
                <p>
                  {selectedUsers.length > 1
                    ? `Only the first selected user will be used for direct chat`
                    : `Ready to start a conversation with ${selectedUsers[0].username}`}
                </p>
              </IonText>
            </div>
          )}

          {selectedMode === "group" && selectedUsers.length > 0 && (
            <div className="action-hint">
              <IonText color="medium">
                <p>
                  Group chat with {selectedUsers.length} selected user
                  {selectedUsers.length !== 1 ? "s" : ""}
                </p>
              </IonText>
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter className="new-chat-footer">
        <IonToolbar>
          <IonButton
            expand="block"
            onClick={handleStartChat}
            disabled={
              isCreating ||
              selectedUsers.length === 0 ||
              (selectedMode === "group" && !groupName.trim())
            }
          >
            {isCreating ? (
              <IonSpinner name="dots" />
            ) : (
              <>
                Start {selectedMode === "direct" ? "Conversation" : "Group Chat"}
                <IonIcon slot="end" icon={arrowForward} />
              </>
            )}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default NewChatModal;