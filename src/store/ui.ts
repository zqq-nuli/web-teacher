import { create } from 'zustand';

interface UIState {
  // 浮窗状态
  isFloatingPanelVisible: boolean;
  floatingPanelPosition: { x: number; y: number };

  // 错误状态
  errorMessage: string | null;

  // 加载状态
  isLoading: boolean;
  loadingMessage: string | null;

  // Actions
  showFloatingPanel: () => void;
  hideFloatingPanel: () => void;
  toggleFloatingPanel: () => void;
  setFloatingPanelPosition: (position: { x: number; y: number }) => void;

  setError: (message: string | null) => void;
  clearError: () => void;

  setLoading: (isLoading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isFloatingPanelVisible: false,
  floatingPanelPosition: { x: window.innerWidth - 420, y: 20 },
  errorMessage: null,
  isLoading: false,
  loadingMessage: null,

  showFloatingPanel: () => set({ isFloatingPanelVisible: true }),
  hideFloatingPanel: () => set({ isFloatingPanelVisible: false }),
  toggleFloatingPanel: () =>
    set((state) => ({ isFloatingPanelVisible: !state.isFloatingPanelVisible })),

  setFloatingPanelPosition: (position) => set({ floatingPanelPosition: position }),

  setError: (message) => set({ errorMessage: message }),
  clearError: () => set({ errorMessage: null }),

  setLoading: (isLoading, message) =>
    set({ isLoading, loadingMessage: message || null }),
}));
