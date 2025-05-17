import { IonToast } from '@ionic/react';

interface ToastOptions {
  message: string;
  duration?: number;
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark';
  position?: 'top' | 'bottom' | 'middle';
  buttons?: Array<{
    text: string;
    handler?: () => void;
  }>;
}

export const toast = (options: ToastOptions) => {
  const toast = document.createElement('ion-toast');
  toast.message = options.message;
  toast.duration = options.duration || 3000;
  toast.color = options.color || 'primary';
  toast.position = options.position || 'bottom';
  toast.buttons = options.buttons || [];
  toast.cssClass = 'custom-toast';
  
  document.body.appendChild(toast);
  return toast.present();
}; 