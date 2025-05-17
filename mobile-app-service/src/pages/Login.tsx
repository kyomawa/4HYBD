import React, { useState, useEffect } from "react";
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
  useIonRouter,
} from "@ionic/react";
import { logIn, logoInstagram } from "ionicons/icons";
import { login, isAuthenticated } from "../services/auth.service";
import logoImage from "../assets/logo.png";
import "./Login.css";

const Login: React.FC = () => {
  const router = useIonRouter();
  const [emailOrUsername, setEmailOrUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsChecking(true);
        const isAuthed = await isAuthenticated();

        if (isAuthed) {
          router.push("/app/home", "root", "replace");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async () => {
    try {
      // Validate inputs
      if (!emailOrUsername || !password) {
        setErrorMessage("Veuillez remplir tous les champs");
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      // Try to login
      await login(emailOrUsername, password);

      // Redirect to home on success
      router.push("/app/home", "root", "replace");
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Échec de la connexion. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <IonLoading isOpen={true} message={"Vérification du statut de connexion..."} />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="login-page">
      <IonContent fullscreen className="ion-padding">
        <IonGrid className="login-container">
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" size-md="8" size-lg="6" className="ion-text-center">
              <div className="logo-container">
                <img src={logoImage} alt="Logo" className="app-logo" />
                <h1 className="app-name">BeUnreal</h1>
              </div>

              <div className="form-container">
                <IonItem className="form-item">
                  <IonLabel position="floating">Email ou nom d'utilisateur</IonLabel>
                  <IonInput
                    value={emailOrUsername}
                    onIonChange={(e) => setEmailOrUsername(e.detail.value!)}
                    type="text"
                    autocapitalize="off"
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">Mot de passe</IonLabel>
                  <IonInput value={password} onIonChange={(e) => setPassword(e.detail.value!)} type="password" />
                </IonItem>

                {errorMessage && (
                  <IonText color="danger" className="error-message">
                    <p>{errorMessage}</p>
                  </IonText>
                )}

                <IonButton expand="block" className="login-button" onClick={handleLogin} disabled={isLoading}>
                  <IonIcon slot="start" icon={logIn} />
                  Connexion
                </IonButton>

                <div className="separator">
                  <div className="line"></div>
                  <div className="or">OU</div>
                  <div className="line"></div>
                </div>

                <IonButton
                  expand="block"
                  fill="outline"
                  className="register-button"
                  routerLink="/register"
                  disabled={isLoading}
                >
                  Créer un nouveau compte
                </IonButton>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonLoading isOpen={isLoading} message={"Connexion en cours..."} />
      </IonContent>
    </IonPage>
  );
};

export default Login;
