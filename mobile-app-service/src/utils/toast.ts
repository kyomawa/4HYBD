import { toastController } from "@ionic/core";

interface ToastOptions {
  message: string;
  duration?: number;
  color?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "danger" | "light" | "medium" | "dark";
  position?: "top" | "bottom" | "middle";
  buttons?: Array<{
    text?: string;
    role?: string;
    icon?: string;
    handler?: () => void;
  }>;
  cssClass?: string | string[];
  showCloseButton?: boolean;
  closeButtonText?: string;
  animated?: boolean;
}

export const toast = async (options: ToastOptions): Promise<void> => {
  const toast = await toastController.create({
    message: options.message,
    duration: options.duration || 3000,
    color: options.color,
    position: options.position || "bottom",
    buttons: options.buttons,
    cssClass: options.cssClass,
    animated: options.animated !== undefined ? options.animated : true,
  });

  await toast.present();
};

export const successToast = async (message: string, duration: number = 2000): Promise<void> => {
  await toast({
    message,
    duration,
    color: "success",
  });
};

export const errorToast = async (message: string, duration: number = 3000): Promise<void> => {
  await toast({
    message,
    duration,
    color: "danger",
  });
};

export const warningToast = async (message: string, duration: number = 3000): Promise<void> => {
  await toast({
    message,
    duration,
    color: "warning",
  });
};

export const infoToast = async (message: string, duration: number = 2500): Promise<void> => {
  await toast({
    message,
    duration,
    color: "primary",
  });
};