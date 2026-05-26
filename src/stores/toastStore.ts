import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning';

type ToastState = {
  message: string | null;
  type: ToastType;
  visible: boolean;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
};

let toastTimeout: NodeJS.Timeout | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'success',
  visible: false,

  showToast: (message: string, type: ToastType = 'success', duration = 3000) => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    set({ message, type, visible: true });

    toastTimeout = setTimeout(() => {
      set({ visible: false });
    }, duration);
  },

  hideToast: () => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    set({ visible: false });
  },
}));
export const showGlobalToast = (message: string, type: ToastType = 'success') => {
  useToastStore.getState().showToast(message, type);
};
