// The Club Cheeky HUD — floating expandable panel that replaces the taskbar.
// Shows status at a glance, expands for full details. Cross-app state sync.
'use client';

import { useState } from 'react';
import { useHudStore, TabId } from '@/utils/store/hudStore';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'limits', icon: '📋', label: 'Limits' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'character', icon: '👤', label: 'Me' },
  { id: 'game', icon: '🎮', label: 'Game' },
  { id: 'wallet', icon: '🪙', label: 'Wallet' },
  { id: 'help', icon: '🎭', label: 'Help' },
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Unread alert count for badge
  const unreadCount = alerts.filter((a) => !a.read).length;

  // Quick summary values for collapsed state
  const messagesLeft = 30 - dailyLimits.messagesSent;
  const swipesLeft = 15 - dailyLimits.swipesUsed;
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
              ? 'border-gold bg-zinc-900 text-gold'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400'
        }`}
        style={{ boxShadow: hasActivity ? '0 0 25px rgba(255,215,0,0.3)' : '0 4px 20px rgba(0,0,0,0.5)' }}
        aria-label="Open Club Cheeky HUD"
      >
        <span className="text-xl">☰</span>
        <span className="hidden sm:inline font-hero text-xs">Club</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-club text-xs font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Expanded Panel — positioned to the LEFT of the button */}
      {expanded && (
        <div
          className="fixed bottom-16 right-6 z-50 w-[320px] max-h-[520px] rounded-2xl border-2 border-gold bg-zinc-950/98 shadow-[0_0_50px_rgba(255,215,0,0.25)] backdrop-blur-xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gold/40 px-5 py-3.5 bg-gradient-to-r from-zinc-900 to-zinc-950">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full border border-gold/60 bg-zinc-800 flex items-center justify-center">
                <span className="text-lg">🎪</span>
              </div>
              <div>
                <h2 className="font-hero text-gold text-sm tracking-widest">CLUB CHEEKY</h2>
                <p className="font-body text-club/70 text-[10px]">Your command center</p>
              </div>
            </div>
            <button
              onClick={toggleExpand}
              className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Close HUD"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gold/20 bg-zinc-900/50">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? 'text-gold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className={`text-lg transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gold rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {activeTab === 'limits' && <LimitsTab dailyLimits={dailyLimits} />}
            {activeTab === 'chat' && <ChatTab alerts={alerts} />}
            {activeTab === 'character' && <CharacterTab />}
            {activeTab === 'game' && <GameTab />}
            {activeTab === 'wallet' && <WalletTab wallet={wallet} inventory={inventory} />}
            {activeTab === 'help' && <HelpTab />}
          </div>

          {/* Footer with Delete Button */}
          <div className="border-t border-gold/20 bg-zinc-900/80 px-4 py-2.5 flex-shrink-0">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 hover:border-red-500/50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
              Delete All My Data
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-500 bg-zinc-950 p-6 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 border border-red-500/50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-header text-red-400 text-xl">Delete All Data?</h3>
                <p className="text-zinc-500 text-xs">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 mb-4">
              <p className="text-sm text-red-300/90 font-body">
                This will permanently delete:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-300/70 font-body">
                <li>• Your token balance</li>
                <li>• All inventory items</li>
                <li>• Daily progress and limits</li>
                <li>• Saved preferences</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block font-header text-cyan text-sm mb-2">
                Type <span className="text-red-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition"
                placeholder="Type DELETE here"
                autoFocus
              />
              {deleteError && (
                <p className="mt-2 text-xs text-red-400">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteInput('');
                  setDeleteError('');
                }}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-400 transition hover:border-zinc-500 hover:text-white"
              >
                Keep My Data
              </button>
              <button
                onClick={() => {
                  const success = useHudStore.getState().clearAllData(deleteInput, '');
                  if (!success) {
                    setDeleteError('Incorrect confirmation. Type DELETE exactly.');
                    return;
                  }
                  setShowDeleteModal(false);
                  setDeleteInput('');
                  setDeleteError('');
                }}
                disabled={deleteInput.toUpperCase() !== 'DELETE'}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete Everything
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
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-header text-gold text-base">Daily Limits</h3>
        <span className="text-[10px] font-body text-zinc-500 uppercase tracking-wider">Resets midnight CST</span>
      </div>

      <div className="space-y-3">
        <LimitRow label="Messages" used={dailyLimits.messagesSent} max={30} />
        <LimitRow label="Swipes" used={dailyLimits.swipesUsed} max={15} />
        <LimitRow label="Matchmaker" used={dailyLimits.matchmakerPlays} max={3} />
        <LimitRow label="L³ Trios" used={dailyLimits.l3TriosUsed} max={4} />
        <LimitRow label="Icebreakers" used={dailyLimits.icebreakersUsed} max={5} />
      </div>

      <div className="border-t border-gold/20 pt-4">
        <h4 className="font-header text-cyan text-sm mb-3">Free Event Access</h4>
        <div className="grid grid-cols-2 gap-2">
          <EventPill label="Dance" remaining={dailyLimits.danceFreeRemaining} />
          <EventPill label="Speed" remaining={dailyLimits.speedFreeRemaining} />
          <EventPill label="Rooftop" remaining={dailyLimits.rooftopFreeRemaining} />
          <EventPill label="Blind Date" remaining={dailyLimits.blindDateJoins} />
        </div>
      </div>
    </div>
  );
}

function LimitRow({ label, used, max }: { label: string; used: number; max: number }) {
  const remaining = Math.max(0, max - used);
  const pct = Math.min(100, (used / max) * 100);
  const isLow = remaining <= 2;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-body text-club text-sm">{label}</span>
        <span className={`font-header text-sm ${isLow ? 'text-red-400' : 'text-cyan'}`}>
          {remaining} left
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-gold'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EventPill({ label, remaining }: { label: string; remaining: number }) {
  const isEmpty = remaining === 0;
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${isEmpty ? 'border-zinc-800 bg-zinc-900/50' : 'border-gold/30 bg-gold/5'}`}>
      <p className="font-body text-club text-xs">{label}</p>
      <p className={`font-header text-sm ${isEmpty ? 'text-zinc-600' : 'text-gold'}`}>
        {isEmpty ? '—' : remaining}
      </p>
    </div>
  );
}

function ChatTab({ alerts }: { alerts: import('@/utils/store/hudStore').Alert[] }) {
  const recentAlerts = alerts.filter((a) => a.type === 'message' || a.type === 'wave').slice(0, 5);
  
  return (
    <div className="p-5">
      <h3 className="font-header text-gold text-base mb-4">Recent Activity</h3>
      {recentAlerts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">💬</p>
          <p className="font-body text-zinc-500 text-sm">No recent messages</p>
          <p className="font-body text-zinc-600 text-xs mt-1">Matches and waves will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentAlerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-body text-club text-sm flex-1">{alert.message}</p>
                <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterTab() {
  return (
    <div className="p-5">
      <h3 className="font-header text-gold text-base mb-4">Your Profile</h3>
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-gold/60 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
            <span className="text-5xl">👤</span>
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-club border-2 border-zinc-950 flex items-center justify-center">
            <span className="text-sm">✨</span>
          </div>
        </div>
        <div className="text-center">
          <p className="font-body text-white text-lg">Your Avatar</p>
          <p className="font-body text-club text-sm mt-1">Coming soon — customize your look</p>
        </div>
        <div className="w-full mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="font-header text-cyan text-sm mb-2">Quick Stats</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-hero text-gold text-xl">0</p>
              <p className="font-body text-zinc-500 text-xs">Matches</p>
            </div>
            <div>
              <p className="font-hero text-gold text-xl">0</p>
              <p className="font-body text-zinc-500 text-xs">Messages</p>
            </div>
            <div>
              <p className="font-hero text-gold text-xl">—</p>
              <p className="font-body text-zinc-500 text-xs">Streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GameTab() {
  return (
    <div className="p-5 text-center">
      <div className="py-8">
        <p className="text-6xl mb-4">🎮</p>
        <h3 className="font-header text-gold text-xl mb-2">RPG Story Mode</h3>
        <p className="font-body text-zinc-500 text-sm max-w-xs mx-auto">
          Your adventure awaits. Build your character and start your story.
        </p>
        <button className="mt-6 rounded-lg border border-gold/50 bg-gold/10 px-6 py-3 text-sm font-bold text-gold transition hover:bg-gold/20">
          Coming Soon
        </button>
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
    <div className="p-5">
      <h3 className="font-header text-gold text-base mb-4">Your Wallet</h3>
      
      <div className="rounded-xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-5 text-center mb-4">
        <p className="font-body text-club text-sm mb-1">Available Tokens</p>
        <p className="font-hero text-gold text-5xl">{wallet.tokens}</p>
        <p className="font-body text-zinc-500 text-xs mt-2">
          Lifetime spent: {wallet.lifetimeSpent}
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <button className="flex-1 rounded-lg border border-gold/50 bg-gold/10 py-2 text-sm font-bold text-gold transition hover:bg-gold/20">
          Buy Tokens
        </button>
        <button className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white">
          History
        </button>
      </div>

      {inventory.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h4 className="font-header text-cyan text-sm mb-3">Inventory ({inventory.length})</h4>
          <div className="space-y-2">
            {inventory.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.category === 'gift' ? '🎁' : item.category === 'cosmetic' ? '👕' : '🧊'}</span>
                  <span className="font-body text-club text-sm">{item.name}</span>
                </div>
                <span className="font-header text-cyan text-sm">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpTab() {
  const handleContactUs = () => {
    window.open('https://forms.smartscott.online/forms/cheeky', '_blank');
  };

  return (
    <div className="p-5">
      <h3 className="font-header text-gold text-base mb-4">Help & Support</h3>
      
      {/* Chaz — Club Manager */}
      <div className="rounded-xl border border-club/30 bg-gradient-to-br from-club/10 to-transparent p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-full border-2 border-club/60 bg-zinc-800 flex items-center justify-center overflow-hidden">
            <span className="text-2xl">🎭</span>
          </div>
          <div>
            <p className="font-header text-club text-base">Chaz</p>
            <p className="font-body text-club/70 text-xs">Club Manager & AI Assistant</p>
          </div>
          <span className="ml-auto rounded-full bg-club/20 px-2 py-1 text-[10px] font-bold text-club">ONLINE</span>
        </div>
        <p className="font-body text-club/80 text-sm mb-3">
          Need help? Chaz is here to answer your questions about the club, your account, or anything else.
        </p>
        <button className="w-full rounded-lg bg-club py-2.5 text-sm font-bold text-white transition hover:bg-club-cotton">
          Chat with Chaz
        </button>
      </div>

      {/* Contact Us */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h4 className="font-header text-cyan text-sm mb-3">Contact Us</h4>
        <p className="font-body text-zinc-500 text-xs mb-3">
          Have a question, suggestion, or need support? Fill out our form and we'll get back to you.
        </p>
        <button
          onClick={handleContactUs}
          className="w-full rounded-lg border border-cyan/30 bg-cyan/10 py-2.5 text-sm font-bold text-cyan transition hover:bg-cyan/20"
        >
          📧 Send us a Message
        </button>
      </div>

      {/* Quick Links */}
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <h4 className="font-header text-zinc-500 text-xs uppercase tracking-wider mb-3">Quick Links</h4>
        <div className="grid grid-cols-2 gap-2">
          <a href="/terms" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center transition hover:border-gold/30 hover:bg-gold/5">
            <p className="font-body text-club text-xs">Terms</p>
          </a>
          <a href="/privacy" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center transition hover:border-gold/30 hover:bg-gold/5">
            <p className="font-body text-club text-xs">Privacy</p>
          </a>
          <a href="/best-practices" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center transition hover:border-gold/30 hover:bg-gold/5">
            <p className="font-body text-club text-xs">Safety</p>
          </a>
          <a href="/contact" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center transition hover:border-gold/30 hover:bg-gold/5">
            <p className="font-body text-club text-xs">Contact</p>
          </a>
        </div>
      </div>
    </div>
  );
}
