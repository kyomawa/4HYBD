import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonLoading,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonToolbar,
  IonButtons,
  IonBackButton,
  useIonRouter,
} from "@ionic/react";
import { personAdd, arrowBack } from "ionicons/icons";
import { register } from "../services/auth.service";
import logoImage from "../assets/logo.png";
import "./Register.css";

const Register: React.FC = () => {
  const router = useIonRouter();
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string): boolean => {
    // Username should be 3-20 characters, alphanumeric, underscores and dots
    const usernameRegex = /^[a-zA-Z0-9_.]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string): boolean => {
    // Password should be at least 6 characters
    return password.length >= 6;
  };

  const handleRegister = async () => {
    try {
      // Validate inputs
      if (!email || !username || !password || !confirmPassword) {
        setErrorMessage("Veuillez remplir tous les champs");
        return;
      }

      if (!validateEmail(email)) {
        setErrorMessage("Veuillez entrer un email valide");
        return;
      }

      if (!validateUsername(username)) {
        setErrorMessage("Le nom d'utilisateur doit contenir de 3 à 20 caractères et peut uniquement contenir des lettres, chiffres, tirets bas et points");
        return;
      }

      if (!validatePassword(password)) {
        setErrorMessage("Le mot de passe doit comporter au moins 6 caractères");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Les mots de passe ne correspondent pas");
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      // Try to register
      await register(email, username, password);

      // Redirect to home on success
      router.push("/app/home", "root", "replace");
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Échec de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage className="register-page">
      <IonToolbar color="transparent" className="register-toolbar">
        <IonButtons slot="start">
          <IonBackButton defaultHref="/login" icon={arrowBack} text="" />
        </IonButtons>
      </IonToolbar>

      <IonContent fullscreen className="ion-padding">
        <IonGrid className="register-container">
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" size-md="8" size-lg="6" className="ion-text-center">
              <div className="logo-container">
                <img src={logoImage} alt="Logo" className="app-logo" />
                <h1 className="app-name">BeUnreal</h1>
                <p className="tagline">Créez votre compte et commencez à partager vos moments</p>
              </div>

              <div className="form-container">
                <IonItem className="form-item">
                  <IonLabel position="floating">Email</IonLabel>
                  <IonInput
                    value={email}
                    onIonChange={(e) => setEmail(e.detail.value!)}
                    type="email"
                    autocapitalize="off"
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">Nom d'utilisateur</IonLabel>
                  <IonInput
                    value={username}
                    onIonChange={(e) => setUsername(e.detail.value!)}
                    type="text"
                    autocapitalize="off"
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">Mot de passe</IonLabel>
                  <IonInput value={password} onIonChange={(e) => setPassword(e.detail.value!)} type="password" />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">Confirmer le mot de passe</IonLabel>
                  <IonInput
                    value={confirmPassword}
                    onIonChange={(e) => setConfirmPassword(e.detail.value!)}
                    type="password"
                  />
                </IonItem>

                {errorMessage && (
                  <IonText color="danger" className="error-message">
                    <p>{errorMessage}</p>
                  </IonText>
                )}

                <IonButton expand="block" className="register-button" onClick={handleRegister} disabled={isLoading}>
                  <IonIcon slot="start" icon={personAdd} />
                  Créer un compte
                </IonButton>

                <div className="login-link">
                  <IonText color="medium">
                    Vous avez déjà un compte ?{" "}
                    <IonText color="primary" className="login-text" onClick={() => router.push("/login")}>
                      Connexion
                    </IonText>
                  </IonText>
                </div>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonLoading isOpen={isLoading} message={"Création du compte..."} />
      </IonContent>
    </IonPage>
  );
};

export default Register;
