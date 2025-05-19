import React, { useState } from "react";
import { IonIcon, IonAvatar, IonModal, IonContent, IonHeader, IonToolbar, IonButton, IonTitle } from "@ionic/react";
import { add, close } from "ionicons/icons";
import "./StoryCircles.css";

// Interface pour les données de story
interface StoryUser {
  id: string;
  username: string;
  profilePicture?: string | null;
  hasUnseenStory?: boolean;
}

interface StoryCirclesProps {
  users?: StoryUser[];
  onAddStory?: () => void;
  onViewStory?: (userId: string) => void;
}

/**
 * Composant pour afficher les cercles de stories en haut du feed
 * Incluant un bouton "+" pour créer une nouvelle story
 */
const StoryCircles: React.FC<StoryCirclesProps> = ({ users = [], onAddStory = () => {}, onViewStory = () => {} }) => {
  const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
  const [showStoryModal, setShowStoryModal] = useState<boolean>(false);

  // Gestion du clic sur un cercle de story
  const handleStoryClick = (user: StoryUser) => {
    setSelectedUser(user);
    setShowStoryModal(true);
    onViewStory(user.id);
  };

  // Fermeture du modal de story
  const closeStoryModal = () => {
    setShowStoryModal(false);
    setSelectedUser(null);
  };

  return (
    <>
      <div className="story-circles-container">
        {/* Bouton d'ajout de story */}
        <div className="story-item">
          <div className="story-add-button" onClick={onAddStory}>
            <IonIcon icon={add} />
          </div>
          <div className="story-name">Votre story</div>
        </div>

        {/* Cercles des stories des autres utilisateurs */}
        {users.map((user) => (
          <div className="story-item" key={user.id} onClick={() => handleStoryClick(user)}>
            <div className={`story-circle ${user.hasUnseenStory ? "unseen" : "seen"}`}>
              {user.profilePicture ? (
                <IonAvatar>
                  <img src={user.profilePicture} alt={user.username} />
                </IonAvatar>
              ) : (
                <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="story-name">{user.username}</div>
          </div>
        ))}
      </div>

      {/* Modal pour afficher une story */}
      <IonModal isOpen={showStoryModal} onDidDismiss={closeStoryModal} className="story-modal">
        {selectedUser && (
          <>
            <IonHeader>
              <IonToolbar>
                <IonTitle>{selectedUser.username}</IonTitle>
                <IonButton slot="end" fill="clear" onClick={closeStoryModal}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonToolbar>
            </IonHeader>
            <IonContent className="story-content">
              <div className="story-view-placeholder">
                <h2>Story de {selectedUser.username}</h2>
                <p>Contenu de la story à implémenter...</p>
              </div>
            </IonContent>
          </>
        )}
      </IonModal>
    </>
  );
};

export default StoryCircles;
