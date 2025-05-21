import { HTMLAttributes } from 'react';
import { JSX as IonicJSX } from '@ionic/core';

declare module '@ionic/react' {
  interface IonSpinnerProps extends Partial<IonicJSX.IonSpinner> {
    name?: string;
    color?: string;
    slot?: string;
  }
  
  interface IonTextProps extends Partial<IonicJSX.IonText> {
    color?: string;
    slot?: string;
  }
  
  interface IonIconProps extends Partial<IonicJSX.IonIcon> {
    icon?: string;
    className?: string;
    slot?: string;
    'aria-hidden'?: string;
  }
  
  interface IonButtonProps extends Partial<IonicJSX.IonButton> {
    fill?: 'clear' | 'outline' | 'solid';
    routerLink?: string;
    onClick?: () => void;
    slot?: string;
    disabled?: boolean;
  }
  
  interface IonPageProps extends Partial<IonicJSX.IonPage> {
    className?: string;
  }
  
  interface IonHeaderProps extends Partial<IonicJSX.IonHeader> {}
  
  interface IonToolbarProps extends Partial<IonicJSX.IonToolbar> {}
  
  interface IonTitleProps extends Partial<IonicJSX.IonTitle> {
    slot?: string;
  }
  
  interface IonContentProps extends Partial<IonicJSX.IonContent> {
    fullscreen?: boolean;
  }
  
  interface IonRefresherProps extends Partial<IonicJSX.IonRefresher> {
    slot?: string;
    onIonRefresh?: (event: CustomEvent<RefresherEventDetail>) => void;
  }
  
  interface IonRefresherContentProps extends Partial<IonicJSX.IonRefresherContent> {
    pullingIcon?: string;
    pullingText?: string;
    refreshingSpinner?: string;
    refreshingText?: string;
    slot?: string;
  }
  
  interface IonSegmentProps extends Partial<IonicJSX.IonSegment> {
    value?: string;
    onIonChange?: (e: SegmentCustomEvent) => void;
    className?: string;
  }
  
  interface IonSegmentButtonProps extends Partial<IonicJSX.IonSegmentButton> {
    value?: string;
  }
  
  interface IonLabelProps extends Partial<IonicJSX.IonLabel> {
    slot?: string;
  }
  
  interface IonBadgeProps extends Partial<IonicJSX.IonBadge> {
    color?: string;
    className?: string;
    slot?: string;
  }
  
  interface IonFabProps extends Partial<IonicJSX.IonFab> {}
  interface IonFabButtonProps extends Partial<IonicJSX.IonFabButton> {}
  
  interface IonModalProps extends Partial<IonicJSX.IonModal> {
    isOpen?: boolean;
    onDidDismiss?: () => void;
    className?: string;
  }
  
  interface IonAlertProps extends Partial<IonicJSX.IonAlert> {
    isOpen?: boolean;
    onDidDismiss?: () => void;
    header?: string;
    message?: string;
    buttons?: Array<{
      text: string;
      role?: string;
    }>;
  }
} 