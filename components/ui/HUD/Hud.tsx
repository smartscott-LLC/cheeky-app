// The Club Cheeky HUD — floating expandable panel that replaces the taskbar.
// Shows status at a glance, expands for full details. Cross-app state sync.
'use client';

import { useState } from 'react';
import { useHudStore, TabId } from '@/utils/store/hudStore';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'limits', icon: '📋', label: 'Daily Limits' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'character', icon: '👤', label: 'Character' },
  { id: 'game', icon: '🎮', label: 'Game' },
  { id: 'wallet', icon: '🪙', label: 'Wallet' },
];

export default function Hud() {
  const {
    activeTab,
    expanded,
    toggleExpand,
    setActiveTab,
    dailyLimits,
    wallet,
    inventory,
    alerts,
  } = useHudStore();

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const [clearError, setClearError] = useState('');

  // Unread alert count for badge
  const unreadCount = alerts.filter((a) => !a.read).length;

  // Quick summary values for collapsed state
  const messagesLeft = 30 - dailyLimits.messagesSent; // silver base
  const swipesLeft = 15 - dailyLimits.swipesUsed; // silver base
  const hasActivity = messagesLeft < 30 || swipesLeft < 15 || unreadCount > 0;

  return (
    <>
      {/* HUD Trigger Button — floating right */}
      <button
        onClick={toggleExpand}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border-2 px-4 py-3 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105 ${
          expanded
            ? 'border-gold bg-zinc-900 text-gold'
            : hasActivity
              ? 'border-gold bg-zinc-900 text-gold animate-pulse'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400'
        }`}
        aria-label="Open Club Cheeky HUD"
      >
        <span className="text-xl">☰</span>
        <span className="hidden sm:inline">Club HUD</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-gold bg-zinc-950/95 shadow-[0_0_40px_rgba(255,215,0,0.2)] backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gold/30 px-4 py-3">
            <h2 className="font-hero text-gold text-sm tracking-wide">
              Club Cheeky
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClearModal(true)}
                className="rounded px-2 py-1 text-xs text-zinc-500 transition hover:text-red-400"
                title="Clear all data"
              >
                🗑 Clear
              </button>
              <button
                onClick={toggleExpand}
                className="rounded px-2 py-1 text-xs text-zinc-400 transition hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gold/20">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-gold text-gold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {activeTab === 'limits' && (
              <LimitsTab dailyLimits={dailyLimits} />
            )}
            {activeTab === 'chat' && <ChatTab alerts={alerts} />}
            {activeTab === 'character' && <CharacterTab />}
            {activeTab === 'game' && <GameTab />}
            {activeTab === 'wallet' && <WalletTab wallet={wallet} inventory={inventory} />}
          </div>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-500/50 bg-zinc-950 p-6">
            <h3 className="font-header text-red-400 text-xl">Clear All Data?</h3>
            <p className="mt-2 font-body text-club text-sm">
              This will permanently delete your tokens, inventory, and saved progress.
              This cannot be undone.
            </p>
            <div className="mt-4">
              <label className="block font-header text-cyan text-sm">
                Type <span className="text-gold">CLEAR</span> to confirm:
              </label>
              <input
                type="text"
                value={clearInput}
                onChange={(e) => setClearInput(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-gold focus:outline-none"
                placeholder="Type CLEAR here"
                autoFocus
              />
              {clearError && (
                <p className="mt-1 text-xs text-red-400">{clearError}</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowClearModal(false);
                  setClearInput('');
                  setClearError('');
                }}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const success = useHudStore.getState().clearAllData(clearInput, '');
                  if (!success) {
                    setClearError('Incorrect confirmation. Type CLEAR exactly.');
                    return;
                  }
                  setShowClearModal(false);
                  setClearInput('');
                  setClearError('');
                }}
                disabled={clearInput.toUpperCase() !== 'CLEAR'}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function LimitsTab({ dailyLimits }: { dailyLimits: { messagesSent: number; swipesUsed: number; matchmakerPlays: number; l3TriosUsed: number; icebreakersUsed: number; blindDateJoins: number; danceFreeRemaining: number; speedFreeRemaining: number; rooftopFreeRemaining: number } }) {
  return (
    <div className="space-y-3">
      <h3 className="font-header text-cyan text-base">Daily Limits</h3>
      
      <LimitRow label="Messages Sent" used={dailyLimits.messagesSent} max={30} />
      <LimitRow label="Swipes Used" used={dailyLimits.swipesUsed} max={15} />
      <LimitRow label="Matchmaker Plays" used={dailyLimits.matchmakerPlays} max={3} />
      <LimitRow label="L³ Trios Used" used={dailyLimits.l3TriosUsed} max={4} />
      <LimitRow label="Icebreakers Used" used={dailyLimits.icebreakersUsed} max={5} />
      
      <div className="mt-4 border-t border-zinc-800 pt-3">
        <h4 className="font-header text-club text-sm">Free Events</h4>
        <div className="mt-2 space-y-1 text-sm font-body text-club">
          <p>Dance Floor: {dailyLimits.danceFreeRemaining} left</p>
          <p>Speed Dating: {dailyLimits.speedFreeRemaining} left</p>
          <p>Rooftop: {dailyLimits.rooftopFreeRemaining} left</p>
        </div>
      </div>
    </div>
  );
}

function LimitRow({ label, used, max }: { label: string; used: number; max: number }) {
  const remaining = max - used;
  const pct = (used / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-body text-club">{label}</span>
        <span className="font-header text-cyan">{remaining} left</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChatTab({ alerts }: { alerts: import('@/utils/store/hudStore').Alert[] }) {
  const recentAlerts = alerts.filter((a) => a.type === 'message' || a.type === 'wave').slice(0, 5);
  
  return (
    <div className="space-y-3">
      <h3 className="font-header text-cyan text-base">Recent Activity</h3>
      {recentAlerts.length === 0 ? (
        <p className="font-body text-zinc-500 text-sm">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {recentAlerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="font-body text-club text-sm">{alert.message}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterTab() {
  return (
    <div className="space-y-3">
      <h3 className="font-header text-cyan text-base">Character</h3>
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="h-24 w-24 rounded-full bg-zinc-800 border-2 border-gold flex items-center justify-center">
          <span className="text-4xl">👤</span>
        </div>
        <p className="font-body text-zinc-500 text-sm">Avatar editor coming soon</p>
      </div>
    </div>
  );
}

function GameTab() {
  return (
    <div className="space-y-3">
      <h3 className="font-header text-cyan text-base">Game</h3>
      <div className="py-8 text-center">
        <p className="font-body text-zinc-500">RPG storyline coming soon</p>
      </div>
    </div>
  );
}

function WalletTab({
  wallet,
  inventory,
}: {
  wallet: import('@/utils/store/hudStore').WalletState;
  inventory: import('@/utils/store/hudStore').InventoryItem[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-header text-cyan text-base">Wallet</h3>
      
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-center">
        <p className="font-hero text-gold text-3xl">{wallet.tokens}</p>
        <p className="font-body text-club text-sm">tokens</p>
      </div>
      
      {inventory.length > 0 && (
        <div className="mt-4">
          <h4 className="font-header text-club text-sm">Inventory</h4>
          <div className="mt-2 space-y-1">
            {inventory.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between text-sm">
                <span className="font-body text-club">{item.name}</span>
                <span className="font-header text-cyan">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
