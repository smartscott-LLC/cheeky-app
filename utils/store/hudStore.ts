// The Surgical Weave — Club Cheeky's cross-module state engine.
// Zustand store with localStorage persistence + Supabase sync.
// All modules (main app, lounge, avatar creator, game) read/write here.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActiveModule = 'main' | 'chub' | 'creator' | 'game';
export type Tier = 'guest' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type TabId = 'daily' | 'profile' | 'wallet' | 'help';
export type ViewMode = 'button' | 'taskbar' | 'hud';

export const TIER_LABELS: Record<Tier, string> = {
  guest: 'Guest',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond'
};

export const TIER_CAPS: Record<
  Tier,
  {
    messages: number | null;
    swipes: number;
    matchmakerPlays: number;
    l3Trios: number;
    icebreakers: number | null;
  }
> = {
  guest: {
    messages: 0,
    swipes: 0,
    matchmakerPlays: 0,
    l3Trios: 0,
    icebreakers: 0
  },
  silver: {
    messages: 30,
    swipes: 15,
    matchmakerPlays: 3,
    l3Trios: 4,
    icebreakers: 5
  },
  gold: {
    messages: 75,
    swipes: 30,
    matchmakerPlays: 5,
    l3Trios: 8,
    icebreakers: 10
  },
  platinum: {
    messages: Infinity,
    swipes: 50,
    matchmakerPlays: 8,
    l3Trios: 12,
    icebreakers: Infinity
  },
  diamond: {
    messages: Infinity,
    swipes: 100,
    matchmakerPlays: 12,
    l3Trios: 20,
    icebreakers: Infinity
  }
};

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
  viewMode: ViewMode;

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

  // Cheeky Chats (1-on-1 dating messages) — separate from lounge
  cheekyChatUnread: number;

  // Sync state
  isSyncing: boolean;
  lastSync: string | null;

  // Actions
  setActiveTab: (tab: TabId) => void;
  toggleExpand: () => void;
  setExpanded: (expanded: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;
  updateDailyLimits: (limits: Partial<DailyLimits>) => void;
  updateWallet: (wallet: Partial<WalletState>) => void;
  updateTier: (tier: Tier) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (itemId: string, quantity: number) => boolean;
  addAlert: (alert: Omit<Alert, 'id' | 'read' | 'timestamp'>) => void;
  markAlertRead: (alertId: string) => void;
  clearAllAlerts: () => void;
  setCheekyChatUnread: (count: number) => void;
  syncHudData: () => Promise<void>;
  clearAllData: (confirmation: string, userDisplayName: string) => boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const initialState = {
  activeTab: 'daily' as TabId,
  expanded: false,
  viewMode: 'button' as ViewMode,
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
    rooftopFreeRemaining: 0
  },
  wallet: {
    tokens: 0,
    lifetimeSpent: 0,
    lastUpdated: new Date().toISOString()
  },
  inventory: [] as InventoryItem[],
  alerts: [] as Alert[] as Alert[],
  cheekyChatUnread: 0,
  isSyncing: false,
  lastSync: null as string | null
};

export const useHudStore = create<HudState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveTab: (tab) => set({ activeTab: tab }),

      toggleExpand: () => set((state) => ({ expanded: !state.expanded })),

      setExpanded: (expanded) => set({ expanded }),

      setViewMode: (mode) => set({ viewMode: mode }),

      cycleViewMode: () =>
        set((state) => ({
          viewMode:
            state.viewMode === 'button'
              ? 'taskbar'
              : state.viewMode === 'taskbar'
                ? 'hud'
                : 'button'
        })),

      updateDailyLimits: (limits) =>
        set((state) => ({
          dailyLimits: { ...state.dailyLimits, ...limits }
        })),

      updateWallet: (wallet) =>
        set((state) => ({
          wallet: { ...state.wallet, ...wallet }
        })),

      addInventoryItem: (item) =>
        set((state) => {
          const existing = state.inventory.find(
            (i) => i.itemId === item.itemId
          );
          if (existing) {
            return {
              inventory: state.inventory.map((i) =>
                i.itemId === item.itemId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              )
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
              i.itemId === itemId
                ? { ...i, quantity: i.quantity - quantity }
                : i
            )
            .filter((i) => i.quantity > 0)
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
              timestamp: new Date().toISOString()
            },
            ...state.alerts
          ].slice(0, 50) // Keep last 50
        })),

      markAlertRead: (alertId) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, read: true } : a
          )
        })),

      clearAllAlerts: () => set({ alerts: [] }),

      setCheekyChatUnread: (count) => set({ cheekyChatUnread: count }),

      updateTier: (tier) => set({ tier }),

      syncHudData: async () => {
        try {
          const res = await fetch('/api/taskbar');
          const data = await res.json();
          if (!data.tier || !data.tiles) return;

          set({ tier: data.tier as Tier });

          // API returns REMAINING counts (not used). Compute used = cap - remaining.
          const caps = TIER_CAPS[data.tier as Tier] ?? TIER_CAPS.silver;
          const limits: Partial<DailyLimits> = {};
          for (const tile of data.tiles) {
            if (tile.unlimited) {
              // Unlimited tier — don't cap, show ∞ in UI
              if (tile.key === 'chats') limits.messagesSent = Infinity;
              else if (tile.key === 'l3') limits.l3TriosUsed = Infinity;
              else if (tile.key === 'icebreakers')
                limits.icebreakersUsed = Infinity;
            } else if (typeof tile.count === 'number') {
              // Remaining → used = cap - remaining
              if (tile.key === 'chats')
                limits.messagesSent = (caps.messages ?? 0) - tile.count;
              else if (tile.key === 'swipes')
                limits.swipesUsed = caps.swipes - tile.count;
              else if (tile.key === 'l3')
                limits.l3TriosUsed = caps.l3Trios - tile.count;
              else if (tile.key === 'matchmaker')
                limits.matchmakerPlays = caps.matchmakerPlays - tile.count;
              else if (tile.key === 'icebreakers')
                limits.icebreakersUsed = (caps.icebreakers ?? 0) - tile.count;
            }
          }
          if (Object.keys(limits).length > 0)
            set({ dailyLimits: { ...get().dailyLimits, ...limits } });

          // Token balance
          if (typeof data.tokenBalance === 'number') {
            set({
              wallet: {
                ...get().wallet,
                tokens: data.tokenBalance,
                lastUpdated: new Date().toISOString()
              }
            });
          }
        } catch (e) {
          console.error('syncHudData failed:', e);
        }
      },

      clearAllData: (confirmation, userDisplayName) => {
        const state = get();
        // Require typing "CLEAR" or their display name
        const validConfirmation =
          confirmation.toUpperCase() === 'CLEAR' ||
          confirmation.trim().toLowerCase() ===
            state.displayName?.toLowerCase() ||
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
          cheekyChatUnread: 0,
          lastSync: null
        });

        return true;
      }
    }),
    {
      name: 'cheeky-weave',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        expanded: state.expanded,
        viewMode: state.viewMode,
        dailyLimits: state.dailyLimits,
        wallet: state.wallet,
        inventory: state.inventory,
        alerts: state.alerts,
        cheekyChatUnread: state.cheekyChatUnread
      })
    }
  )
);

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export async function syncFromSupabase(_userId: string) {
  // Use the new syncHudData instead
  void useHudStore.getState().syncHudData();
}
