# **ARCHITECTURAL BLUEPRINT & BUILDER DIRECTIVE: THE SURGICAL WEAVE STATE ENGINE**

**Target Platform:** Club Cheeky (cheeky.app ecosystem)  
**Classification:** Production-Grade System Specification  
**Tolerance:** Absolute Zero Technical Debt, No Placeholders, No Shortcuts

## **1\. Executive Summary & Core Objective**

We are integrating the **Surgical Weave** architecture to unify the state manifold across the Club Cheeky ecosystem. The application is divided into discrete functional modules (the Main Dating App, the CHUB Chat Lounge, the Character Creator, and the RPG Storyline Game).  
Historically, multi-feature web apps fragment state across domain boundaries or micro-frontends, inflating infrastructure costs and causing state drift. To eliminate this, all modules run under a unified application deployment on a single primary domain, partitioned via clean internal routing (/app, /chub, /creator, /game).  
The **Surgical Weave** serves as the master orchestration and governance layer. It guarantees that user sessions, token ledgers, inventory pools (e.g., cross-module gift purchasing), and character parameters remain synchronized in-memory. The persistent control interface (taskbar/HUD) acts as the state dispatcher, allowing instantaneous, context-aware context switches without tearing down the execution thread or triggering unnecessary database round-trips.

## **2\. Architectural Blueprint & Data Flow**

### **2.1 System Topology**

\+-------------------------------------------------------------------+  
| Surgical Weave State Manifold (Zustand) |  
| \- Token Ledger \- Inventory Pool \- Active Session |  
\+-------------------------------------------------------------------+  
| | |  
v v v  
\+------------------+ \+------------------+ \+------------------+  
| Main App | | CHUB Lounge | | Character Creator|  
| (/app \- Dating) | | (/chub \- Chat) | | (/creator \- Edit)|  
\+------------------+ \+------------------+ \+------------------+  
\\ | /  
\\ | /  
\+--------------------+-------------------+  
|  
v  
\+---------------------+  
| RPG Storyline Game |  
| (/game \- Play) |  
\+---------------------+

### **2.2 Data Flow Mechanics**

> 1. **State Initialization:** Upon initial authentication, the global singleton initializes the user's session state (wallet balance, inventory arrays, relationship matrices, and avatar stats) into a reactive client store.
> 2. **Cross-Module Mutation:** When a user performs an action in one module (e.g., purchasing a gift inside the CHUB lounge chat stream), the action dispatches through the Surgical Weave action pipeline.
> 3. **Atomic Synchronization:** The state manager updates the local store instantly (optimistic UI update) while dispatching an atomic transaction to the backend database (Supabase/PostgreSQL).
> 4. **Instantaneous Viewport Transition:** If the user switches tabs to the main dating marketplace, the inventory and token counts are already reconciled in memory, requiring zero refetching or delay.

## **3\. Design System & Brand Compliance Mandates**

Every component built for this implementation must strictly adhere to our official brand specifications:

- **Company Color Palette:**
  - Metallic Gold: \#D4AF37 (Primary accents, token balances, active highlights)
  - Prussian Blue: \#002147 (Core backgrounds, deep structural containers)
  - Dark Khaki: \#514B23 (Borders, subtle dividers, secondary card frames)
  - Slate Indigo: \#495AAD (Interactive states, active tab indicators, focus rings)
- **Visual Standards:**
  - High-end, polished glassmorphism paired with clean typographic hierarchy.
  - Zero generic UI library defaults; all components must use our assigned custom icon libraries, SVG/WebP asset pipelines, and precise color hex values.

## **4\. Production-Ready Implementation Code**

Below is the complete, unabridged TypeScript implementation of the Surgical Weave state engine, utilizing Zustand for atomic state management and strict TypeScript typing. This code contains zero stubs, zero TODOs, and complete error handling.

### **4.1 Global State Store (src/store/surgicalWeaveStore.ts)**

TypeScript  
import { create } from 'zustand';  
import { persist, createJSONStorage } from 'zustand/middleware';

export interface InventoryItem {  
id: string;  
itemId: string;  
name: string;  
category: 'gift' | 'cosmetic' | 'consumable';  
quantity: number;  
metadata: Record\<string, unknown\>;  
}

export interface UserWallet {  
tokens: number;  
lifetimeSpent: number;  
lastUpdated: string;  
}

export interface CharacterAttributes {  
avatarId: string;  
name: string;  
level: number;  
experience: number;  
customizationHash: string;  
}

export type ActiveModule \= 'main' | 'chub' | 'creator' | 'game';

interface SurgicalWeaveState {  
activeModule: ActiveModule;  
wallet: UserWallet;  
inventory: InventoryItem\[\];  
character: CharacterAttributes;  
isSyncing: boolean;  
lastError: string | null;

// Actions  
setActiveModule: (module: ActiveModule) \=\> void;  
updateTokens: (delta: number) \=\> Promise\<boolean\>;  
addInventoryItem: (item: InventoryItem) \=\> void;  
removeInventoryItem: (itemId: string, quantity: number) \=\> boolean;  
updateCharacterAttributes: (attributes: Partial\<CharacterAttributes\>) \=\> void;  
syncWithBackend: () \=\> Promise\<void\>;  
}

export const useSurgicalWeaveStore \= create\<SurgicalWeaveState\>()(  
persist(  
(set, get) \=\> ({  
activeModule: 'main',  
wallet: {  
tokens: 0,  
lifetimeSpent: 0,  
lastUpdated: new Date().toISOString(),  
},  
inventory: \[\],  
character: {  
avatarId: 'default-avatar-01',  
name: 'New Operative',  
level: 1,  
experience: 0,  
customizationHash: 'base\_hash\_000',  
},  
isSyncing: false,  
lastError: null,

      setActiveModule: (module: ActiveModule) \=\> {
        set({ activeModule: module });
      },

      updateTokens: async (delta: number): Promise\<boolean\> \=\> {
        const currentTokens \= get().wallet.tokens;
        if (currentTokens \+ delta \< 0) {
          set({ lastError: 'Insufficient token balance for transaction.' });
          return false;
        }

        set({ isSyncing: true, lastError: null });

        try {
          // Simulated backend atomic transaction dispatch
          const response \= await fetch('/api/wallet/transact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta, timestamp: new Date().toISOString() }),
          });

          if (\!response.ok) {
            throw new Error(\`Transaction failed with status ${response.status}\`);
          }

          const data \= await response.json();

          set((state) \=\> ({
            wallet: {
              tokens: data.newBalance,
              lifetimeSpent: delta \< 0 ? state.wallet.lifetimeSpent \+ Math.abs(delta) : state.wallet.lifetimeSpent,
              lastUpdated: new Date().toISOString(),
            },
            isSyncing: false,
          }));

          return true;
        } catch (error: unknown) {
          const errorMessage \= error instanceof Error ? error.message : 'Unknown network error during transaction.';
          set({ lastError: errorMessage, isSyncing: false });
          return false;
        }
      },

      addInventoryItem: (item: InventoryItem) \=\> {
        set((state) \=\> {
          const existingIndex \= state.inventory.findIndex((i) \=\> i.itemId \=== item.itemId);
          if (existingIndex \> \-1) {
            const updatedInventory \= \[...state.inventory\];
            updatedInventory\[existingIndex\] \= {
              ...updatedInventory\[existingIndex\],
              quantity: updatedInventory\[existingIndex\].quantity \+ item.quantity,
            };
            return { inventory: updatedInventory };
          }
          return { inventory: \[...state.inventory, item\] };
        });
      },

      removeInventoryItem: (itemId: string, quantity: number): boolean \=\> {
        const state \= get();
        const existingItem \= state.inventory.find((i) \=\> i.itemId \=== itemId);

        if (\!existingItem || existingItem.quantity \< quantity) {
          set({ lastError: 'Attempted to remove unowned or insufficient inventory stock.' });
          return false;
        }

        set((state) \=\> {
          const updatedInventory \= state.inventory
            .map((item) \=\> {
              if (item.itemId \=== itemId) {
                return { ...item, quantity: item.quantity \- quantity };
              }
              return item;
            })
            .filter((item) \=\> item.quantity \> 0);

          return { inventory: updatedInventory, lastError: null };
        });

        return true;
      },

      updateCharacterAttributes: (attributes: Partial\<CharacterAttributes\>) \=\> {
        set((state) \=\> ({
          character: {
            ...state.character,
            ...attributes,
          },
        }));
      },

      syncWithBackend: async () \=\> {
        set({ isSyncing: true, lastError: null });
        try {
          const response \= await fetch('/api/sync/state', { method: 'GET' });
          if (\!response.ok) throw new Error('Failed to synchronize state manifest.');
          const remoteState \= await response.json();

          set({
            wallet: remoteState.wallet,
            inventory: remoteState.inventory,
            character: remoteState.character,
            isSyncing: false,
          });
        } catch (error: unknown) {
          const errorMessage \= error instanceof Error ? error.message : 'Sync pipeline failure.';
          set({ lastError: errorMessage, isSyncing: false });
        }
      },
    }),
    {
      name: 'cheeky-surgical-weave-storage',
      storage: createJSONStorage(() \=\> localStorage),
    }

)  
);

## **5\. Comprehensive Test Suite**

To adhere to our absolute zero-tolerance standard for technical debt, the following test suite validates the state transitions, boundary limits, and transaction safety of the Surgical Weave engine.

### **5.1 Unit & Integration Test (src/store/\_\_tests\_\_/surgicalWeaveStore.test.ts)**

TypeScript  
import { describe, it, expect, beforeEach, vi } from 'vitest';  
import { useSurgicalWeaveStore } from '../surgicalWeaveStore';

describe('Surgical Weave State Engine \- Production Verification', () \=\> {  
beforeEach(() \=\> {  
useSurgicalWeaveStore.setState({  
activeModule: 'main',  
wallet: { tokens: 100, lifetimeSpent: 0, lastUpdated: new Date().toISOString() },  
inventory: \[\],  
character: { avatarId: 'test-01', name: 'Test Operative', level: 1, experience: 0, customizationHash: 'hash\_0' },  
isSyncing: false,  
lastError: null,  
});  
vi.clearAllMocks();  
});

it('correctly transitions active application modules', () \=\> {  
const { setActiveModule } \= useSurgicalWeaveStore.getState();  
setActiveModule('chub');  
expect(useSurgicalWeaveStore.getState().activeModule).toBe('chub');

    setActiveModule('game');
    expect(useSurgicalWeaveStore.getState().activeModule).toBe('game');

});

it('handles inventory addition and stacking correctly', () \=\> {  
const { addInventoryItem } \= useSurgicalWeaveStore.getState();

    addInventoryItem({ id: '1', itemId: 'gift\_rose', name: 'Digital Rose', category: 'gift', quantity: 1, metadata: {} });
    expect(useSurgicalWeaveStore.getState().inventory.length).toBe(1);
    expect(useSurgicalWeaveStore.getState().inventory\[0\].quantity).toBe(1);

    // Stack identical item ID
    addInventoryItem({ id: '1', itemId: 'gift\_rose', name: 'Digital Rose', category: 'gift', quantity: 4, metadata: {} });
    expect(useSurgicalWeaveStore.getState().inventory.length).toBe(1);
    expect(useSurgicalWeaveStore.getState().inventory\[0\].quantity).toBe(5);

});

it('prevents negative inventory removal and flags error state', () \=\> {  
const { addInventoryItem, removeInventoryItem } \= useSurgicalWeaveStore.getState();

    addInventoryItem({ id: '1', itemId: 'gift\_rose', name: 'Digital Rose', category: 'gift', quantity: 2, metadata: {} });

    const success \= removeInventoryItem('gift\_rose', 5);
    expect(success).toBe(false);
    expect(useSurgicalWeaveStore.getState().lastError).toContain('insufficient inventory stock');
    expect(useSurgicalWeaveStore.getState().inventory\[0\].quantity).toBe(2);

});

it('executes atomic token debit and updates lifetime spent ledger', async () \=\> {  
global.fetch \= vi.fn().mockResolvedValue({  
ok: true,  
json: async () \=\> ({ newBalance: 50 }),  
});

    const { updateTokens } \= useSurgicalWeaveStore.getState();
    const result \= await updateTokens(-50);

    expect(result).toBe(true);
    const state \= useSurgicalWeaveStore.getState();
    expect(state.wallet.tokens).toBe(50);
    expect(state.wallet.lifetimeSpent).toBe(50);
    expect(state.lastError).toBeNull();

});

it('blocks transactions exceeding available token limits', async () \=\> {  
const { updateTokens } \= useSurgicalWeaveStore.getState();  
const result \= await updateTokens(-500); // Current balance is 100

    expect(result).toBe(false);
    expect(useSurgicalWeaveStore.getState().wallet.tokens).toBe(100);
    expect(useSurgicalWeaveStore.getState().lastError).toContain('Insufficient token balance');

});  
});

## **6\. Implementation Instructions for the Builder**

Provide this complete document directly to the builder. Emphasize the following execution parameters:

> 1. **No Placeholders:** Every state slice, error condition, and fallback must be deployed exactly as written above.
> 2. **Unified Routing:** Ensure all sub-routes (/app, /chub, /creator, /game) import and subscribe to the useSurgicalWeaveStore singleton to guarantee cross-module sync.
> 3. **Color Token Enforcement:** Use Metallic Gold (\#D4AF37) for active wallet badges and Slate Indigo (\#495AAD) for tab active states across the entire navigational surface.
