// The Surgical Weave — Club Cheeky's cross-module state engine.
// Zustand store with localStorage persistence + Supabase sync.
// All modules (main app, lounge, avatar creator, game) read/write here.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActiveModule = 'main' | 'chub' | 'creator' | 'game';
export type Tier = 'guest' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type TabId = 'limits' | 'chat' | 'character' | 'game' | 'wallet' | 'help';

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  category: 'gift' | 'cosmetic' | 'consumable' | 'collectible';
  quantity: number;
  metadata?: Record<string, unknown>;
}

export interface DailyLimits {
  messagesSent: number;
  newPeople: number;
  swipesUsed: number;
  matchmakerPlays: number;
  l3TriosUsed: number;
  icebreakersUsed: number;
  blindDateJoins: number;
  giftCooldownExpires: string | null;
  hornCooldownExpires: string | null;
  danceFreeRemaining: number;
  speedFreeRemaining: number;
  rooftopFreeRemaining: number;
}

export interface WalletState {
  tokens: number;
  lifetimeSpent: number;
  lastUpdated: string;
}

export interface CharacterState {
  avatarId: string | null;
  displayName: string;
  tier: Tier;
  verified: boolean;
  // Game/RPG fields — placeholder for now
  level: number;
  experience: number;
}

export interface Alert {
  id: string;
  type: 'match' | 'message' | 'wave' | 'gift' | 'system' | 'event';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface HudState {
  // Core
  activeTab: TabId;
  expanded: boolean;
  
  // Session
  userId: string | null;
  displayName: string | null;
  tier: Tier;
  verified: boolean;
  
  // Daily limits (synced from taskbar_state RPC)
  dailyLimits: DailyLimits;
  
  // Wallet
  wallet: WalletState;
  
  // Inventory
  inventory: InventoryItem[];
  
  // Alerts
  alerts: Alert[];
  
  // Sync state
  isSyncing: boolean;
  lastSync: string | null;
  
  // Actions
  setActiveTab: (tab: TabId) => void;
  toggleExpand: () => void;
  setExpanded: (expanded: boolean) => void;
  updateDailyLimits: (limits: Partial<DailyLimits>) => void;
  updateWallet: (wallet: Partial<WalletState>) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (itemId: string, quantity: number) => boolean;
  addAlert: (alert: Omit<Alert, 'id' | 'read' | 'timestamp'>) => void;
  markAlertRead: (alertId: string) => void;
  clearAllAlerts: () => void;
  clearAllData: (confirmation: string, userDisplayName: string) => boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const initialState = {
  activeTab: 'limits' as TabId,
  expanded: false,
  userId: null as string | null,
  displayName: null as string | null,
  tier: 'silver' as Tier,
  verified: false,
  dailyLimits: {
    messagesSent: 0,
    newPeople: 0,
    swipesUsed: 0,
    matchmakerPlays: 0,
    l3TriosUsed: 0,
    icebreakersUsed: 0,
    blindDateJoins: 0,
    giftCooldownExpires: null,
    hornCooldownExpires: null,
    danceFreeRemaining: 1,
    speedFreeRemaining: 0,
    rooftopFreeRemaining: 0,
  },
  wallet: {
    tokens: 0,
    lifetimeSpent: 0,
    lastUpdated: new Date().toISOString(),
  },
  inventory: [] as InventoryItem[],
  alerts: [] as Alert[] as Alert[],
  isSyncing: false,
  lastSync: null as string | null,
};

export const useHudStore = create<HudState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      toggleExpand: () => set((state) => ({ expanded: !state.expanded })),
      
      setExpanded: (expanded) => set({ expanded }),
      
      updateDailyLimits: (limits) =>
        set((state) => ({
          dailyLimits: { ...state.dailyLimits, ...limits },
        })),
      
      updateWallet: (wallet) =>
        set((state) => ({
          wallet: { ...state.wallet, ...wallet },
        })),
      
      addInventoryItem: (item) =>
        set((state) => {
          const existing = state.inventory.find((i) => i.itemId === item.itemId);
          if (existing) {
            return {
              inventory: state.inventory.map((i) =>
                i.itemId === item.itemId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { inventory: [...state.inventory, item] };
        }),
      
      removeInventoryItem: (itemId, quantity) => {
        const state = get();
        const item = state.inventory.find((i) => i.itemId === itemId);
        if (!item || item.quantity < quantity) {
          return false;
        }
        set((state) => ({
          inventory: state.inventory
            .map((i) =>
              i.itemId === itemId ? { ...i, quantity: i.quantity - quantity } : i
            )
            .filter((i) => i.quantity > 0),
        }));
        return true;
      },
      
      addAlert: (alertData) =>
        set((state) => ({
          alerts: [
            {
              ...alertData,
              id: Math.random().toString(36).slice(2),
              read: false,
              timestamp: new Date().toISOString(),
            },
            ...state.alerts,
          ].slice(0, 50), // Keep last 50
        })),
      
      markAlertRead: (alertId) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, read: true } : a
          ),
        })),
      
      clearAllAlerts: () => set({ alerts: [] }),
      
      clearAllData: (confirmation, userDisplayName) => {
        const state = get();
        // Require typing "CLEAR" or their display name
        const validConfirmation =
          confirmation.toUpperCase() === 'CLEAR' ||
          confirmation.trim().toLowerCase() === state.displayName?.toLowerCase() ||
          confirmation.trim() === userDisplayName;
        
        if (!validConfirmation) {
          return false;
        }
        
        // Clear localStorage
        localStorage.removeItem('cheeky-weave');
        
        // Clear runtime state
        set({
          userId: null,
          displayName: null,
          tier: 'silver',
          verified: false,
          dailyLimits: initialState.dailyLimits,
          wallet: initialState.wallet,
          inventory: [],
          alerts: [],
          lastSync: null,
        });
        
        return true;
      },
    }),
    {
      name: 'cheeky-weave',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        expanded: state.expanded,
        dailyLimits: state.dailyLimits,
        wallet: state.wallet,
        inventory: state.inventory,
        alerts: state.alerts,
      }),
    }
  )
);

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export async function syncFromSupabase(_userId: string) {
  // This would call taskbar_state RPC and update the store
  // For now, returns a promise that resolves after a delay
  return new Promise<void>((resolve) => setTimeout(resolve, 500));
}
