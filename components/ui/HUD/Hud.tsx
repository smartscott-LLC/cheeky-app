// The Club Cheeky HUD — floating expandable panel that replaces the taskbar.
// Shows status at a glance, expands for full details. Cross-app state sync.
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useHudStore,
  TabId,
  TIER_CAPS,
  TIER_LABELS
} from '@/utils/store/hudStore';
import { useQuestStore } from '@/utils/store/questStore';
import { usePathname } from 'next/navigation';
import { ASSETS } from '@/utils/assets';
import TikiTaskbar from '@/components/ui/Taskbar/TikiTaskbar';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'daily', icon: '💓', label: 'Daily' },
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'wallet', icon: '🪙', label: 'Wallet' },
  { id: 'help', icon: '🎭', label: 'Help' }
];

const SPARK_MODES = [
  { id: 'spark', label: 'Spark', icon: '🔥', slug: 'spark' },
  { id: 'l3', label: 'L³', icon: ASSETS.icons.neonHeart, slug: 'l3' },
  {
    id: 'mm',
    label: 'Match',
    icon: ASSETS.icons.heartAndKey,
    slug: 'matchmaker'
  }
];

export default function Hud() {
  const pathname = usePathname();
  const [pulsePhase, setPulsePhase] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 4);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const {
    activeTab,
    toggleExpand,
    setActiveTab,
    tier,
    dailyLimits,
    wallet,
    inventory,
    alerts,
    cheekyChatUnread,
    viewMode,
    cycleViewMode
  } = useHudStore();

  // Sync real data from API on mount AND every 60s — MUST be before any early return
  useEffect(() => {
    void useHudStore.getState().syncHudData();
    const interval = setInterval(
      () => useHudStore.getState().syncHudData(),
      60000
    );
    return () => clearInterval(interval);
  }, []);

  // All hooks above — site-page guard goes after everything
  const sitePages = [
    '/',
    '/signin',
    '/verify',
    '/terms',
    '/privacy',
    '/aup',
    '/refunds',
    '/best-practices',
    '/law-enforcement',
    '/sitemap',
    '/contact',
    '/owner',
    '/pricing'
  ];
  if (sitePages.includes(pathname) || pathname.startsWith('/api')) return null;

  const unreadCount = alerts.filter((a) => !a.read).length;
  const caps = TIER_CAPS[tier] ?? TIER_CAPS.silver;
  // Diamond = Infinity messages, so don't subtract from Infinity
  const messagesLeft =
    (caps.messages ?? Infinity) === Infinity
      ? Infinity
      : Math.max(0, caps.messages! - dailyLimits.messagesSent);
  const swipesLeft = Math.max(0, caps.swipes - dailyLimits.swipesUsed);
  const hasActivity =
    (messagesLeft !== Infinity && messagesLeft < (caps.messages ?? Infinity)) ||
    swipesLeft < caps.swipes ||
    unreadCount > 0 ||
    cheekyChatUnread > 0;

  const recentActivity = alerts.slice(0, 3).map((a) => ({
    type: a.type,
    message: a.message,
    time: new Date(a.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }));

  const pulseScale = 1 + Math.sin((pulsePhase * Math.PI) / 2) * 0.08;
  const glowIntensity = 0.15 + (hasActivity ? 0.2 : 0);

  return (
    <>
      {/* ─── Trigger Button ─────────────────────────────────────────── */}
      <button
        onClick={cycleViewMode}
        className={`fixed bottom-5 right-5 z-9999 flex items-center gap-3 rounded-full border transition-all duration-300 ${
          viewMode === 'hud'
            ? 'border-gold bg-zinc-900/95 text-gold shadow-[0_0_30px_rgba(255,215,0,0.4)]'
            : hasActivity
              ? 'border-gold/80 bg-zinc-900/90 text-gold hover:border-gold'
              : 'border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-500'
        }`}
        style={{
          padding: '12px 20px',
          transform:
            hasActivity && viewMode === 'button'
              ? `scale(${pulseScale})`
              : 'scale(1)',
          boxShadow:
            hasActivity && viewMode === 'button'
              ? `0 0 ${20 + glowIntensity * 30}px rgba(255,215,0,${glowIntensity}), 0 4px 20px rgba(0,0,0,0.6)`
              : '0 4px 20px rgba(0,0,0,0.5)'
        }}
        aria-label="Cycle Club Cheeky HUD"
      >
        {/* Token count */}
        <span className="font-hero text-gold text-base leading-none">
          {wallet.tokens}
        </span>
        <span className="w-px h-5 bg-zinc-700" />
        {/* HUD label */}
        <span className="font-hero text-gold text-sm tracking-widest hidden sm:inline">
          CHEEKY HUD
        </span>
        {/* Menu icon */}
        <span
          className={`text-lg transition-transform duration-200 ${viewMode === 'hud' ? 'rotate-90' : ''}`}
        >
          ☰
        </span>
        {/* Badges */}
        {cheekyChatUnread > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-club text-xs font-bold text-white flex items-center justify-center animate-pulse">
            {cheekyChatUnread}
          </span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-gold text-zinc-900 text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Taskbar State ─────────────────────────────────────────── */}
      {viewMode === 'taskbar' && <TikiTaskbar />}

      {/* ─── Full HUD Panel ─────────────────────────────────────────── */}
      {viewMode === 'hud' && (
        <div
          className="fixed z-9999 rounded-2xl border-2 border-gold bg-zinc-950/98 shadow-[0_0_60px_rgba(255,215,0,0.3)] backdrop-blur-xl flex flex-col overflow-hidden"
          style={{
            bottom: '76px',
            right: '24px',
            width: '520px',
            maxHeight: '640px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top Bar ── */}
          <div className="px-5 py-3 border-b border-gold/30 bg-linear-to-r from-zinc-900/80 to-zinc-950/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Image
                  src={ASSETS.icons.neonHeart}
                  alt=""
                  width={20}
                  height={20}
                  className="opacity-90"
                />
                <span className="font-hero text-gold text-sm tracking-widest">
                  CLUB CHEEKY
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-hero text-gold">{wallet.tokens}</span>
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold uppercase tracking-wider">
                  {TIER_LABELS[tier]}
                </span>
                {cheekyChatUnread > 0 && (
                  <span className="flex items-center gap-1.5 text-club">
                    <Image
                      src={ASSETS.icons.cheekyChats}
                      alt=""
                      width={16}
                      height={16}
                    />
                    <span className="font-header text-club">
                      {cheekyChatUnread}
                    </span>
                  </span>
                )}
                <button
                  onClick={toggleExpand}
                  className="p-1.5 text-zinc-500 hover:text-white transition"
                  aria-label="Close HUD"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Activity strip */}
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`font-body ${messagesLeft === Infinity ? 'text-gold' : messagesLeft < 5 ? 'text-red-400' : 'text-zinc-400'}`}
              >
                💬{' '}
                {messagesLeft === Infinity ? '∞' : `${messagesLeft} msgs left`}
              </span>
              <span className="text-zinc-700">|</span>
              <span
                className={`font-body ${swipesLeft < 3 ? 'text-red-400' : 'text-zinc-400'}`}
              >
                👆 {swipesLeft} swipes left
              </span>
              {recentActivity.length > 0 && (
                <>
                  <span className="text-zinc-700">|</span>
                  <span className="text-zinc-500 font-body truncate">
                    {recentActivity[0].message}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Quick Access Bar ── */}
          <div className="px-5 py-3 border-b border-gold/20 bg-zinc-900/30">
            <p className="text-xs font-body text-zinc-500 uppercase tracking-wider mb-2.5">
              Quick Access
            </p>
            <div className="flex gap-2">
              {SPARK_MODES.map((mode) => (
                <Link
                  key={mode.slug}
                  href={`/browse#${mode.slug}`}
                  onClick={toggleExpand}
                  className="flex-1 flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 text-center transition hover:border-gold/40 hover:bg-gold/5 group"
                >
                  <Image
                    src={mode.icon}
                    alt={mode.label}
                    width={28}
                    height={28}
                    className="opacity-75 group-hover:opacity-100 transition"
                  />
                  <span className="font-body text-sm text-zinc-400 group-hover:text-gold transition">
                    {mode.label}
                  </span>
                </Link>
              ))}
              <Link
                href="/events"
                onClick={toggleExpand}
                className="flex-1 flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 text-center transition hover:border-gold/40 hover:bg-gold/5 group"
              >
                <span className="text-2xl">⚡</span>
                <span className="font-body text-sm text-zinc-400 group-hover:text-gold transition">
                  Events
                </span>
              </Link>
              <Link
                href="/gifts"
                onClick={toggleExpand}
                className="flex-1 flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 text-center transition hover:border-gold/40 hover:bg-gold/5 group"
              >
                <Image
                  src={ASSETS.icons.gift}
                  alt="Gifts"
                  width={28}
                  height={28}
                  className="opacity-75 group-hover:opacity-100 transition"
                />
                <span className="font-body text-sm text-zinc-400 group-hover:text-gold transition">
                  Gifts
                </span>
              </Link>
              <Link
                href="/quest"
                onClick={toggleExpand}
                className="flex-1 flex flex-col items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 py-2.5 text-center transition hover:border-gold hover:bg-gold/10 group"
              >
                <span className="text-2xl">⚔️</span>
                <span className="font-body text-sm text-zinc-400 group-hover:text-gold transition">
                  Quest
                </span>
              </Link>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gold/20 bg-zinc-900/20">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-1 px-3 py-3 text-sm transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? 'text-gold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className={`text-lg transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gold rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div
            className="flex-1 overflow-y-auto min-h-0 p-5"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#66ffff #18181b',
              paddingRight: '12px'
            }}
          >
            {activeTab === 'daily' && (
              <DailyTab dailyLimits={dailyLimits} caps={caps} />
            )}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'wallet' && (
              <WalletTab wallet={wallet} inventory={inventory} />
            )}
            {activeTab === 'help' && <HelpTab />}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gold/20 bg-zinc-900/50 px-5 py-3 shrink-0 flex items-center justify-between">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1 rounded border border-red-500/20 bg-red-500/5 px-1.5 py-0.5 text-[10px] font-bold text-red-400/60 transition hover:bg-red-500/15 hover:border-red-500/40"
            >
              <svg
                className="h-2 w-2 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete All My Data
            </button>
            <span className="text-xs font-body text-zinc-600">
              Midnight CST reset
            </span>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-500 bg-zinc-950 p-6 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 border border-red-500/50">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-red-500"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <div>
                <h3 className="font-header text-red-400 text-xl">
                  Delete All Data?
                </h3>
                <p className="text-zinc-500 text-sm">
                  This action cannot be undone
                </p>
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
              </ul>
            </div>
            <div className="mb-4">
              <label className="block font-header text-cyan text-sm mb-2">
                Type <span className="text-red-400 font-bold">DELETE</span> to
                confirm:
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition"
                placeholder="Type DELETE here"
                
              />
              {deleteError && (
                <p className="mt-2 text-sm text-red-400">{deleteError}</p>
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
                  const success = useHudStore
                    .getState()
                    .clearAllData(deleteInput, '');
                  if (!success) {
                    setDeleteError('Incorrect. Type DELETE exactly.');
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

function DailyTab({
  dailyLimits,
  caps
}: {
  dailyLimits: {
    messagesSent: number;
    swipesUsed: number;
    matchmakerPlays: number;
    l3TriosUsed: number;
    icebreakersUsed: number;
    blindDateJoins: number;
    danceFreeRemaining: number;
    speedFreeRemaining: number;
    rooftopFreeRemaining: number;
  };
  caps: {
    messages: number | null;
    swipes: number;
    matchmakerPlays: number;
    l3Trios: number;
    icebreakers: number | null;
  };
}) {
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-header text-gold text-lg">Daily Limits</h3>
        <span className="text-xs font-body text-zinc-500 uppercase tracking-wider">
          Resets midnight CST
        </span>
      </div>
      <div className="space-y-3">
        <LimitRow
          label="Messages"
          used={dailyLimits.messagesSent}
          max={caps.messages ?? Infinity}
        />
        <LimitRow
          label="Swipes"
          used={dailyLimits.swipesUsed}
          max={caps.swipes}
        />
        <LimitRow
          label="Matchmaker"
          used={dailyLimits.matchmakerPlays}
          max={caps.matchmakerPlays}
        />
        <LimitRow
          label="L³ Trios"
          used={dailyLimits.l3TriosUsed}
          max={caps.l3Trios}
        />
        <LimitRow
          label="Icebreakers"
          used={dailyLimits.icebreakersUsed}
          max={caps.icebreakers ?? Infinity}
        />
      </div>
      <div className="border-t border-gold/20 pt-4">
        <h4 className="font-header text-cyan text-base mb-3">Free Events</h4>
        <div className="grid grid-cols-2 gap-3">
          <EventPill label="Dance" remaining={dailyLimits.danceFreeRemaining} />
          <EventPill label="Speed" remaining={dailyLimits.speedFreeRemaining} />
          <EventPill
            label="Rooftop"
            remaining={dailyLimits.rooftopFreeRemaining}
          />
          <EventPill
            label="Blind Date"
            remaining={dailyLimits.blindDateJoins}
          />
        </div>
      </div>
    </div>
  );
}

function LimitRow({
  label,
  used,
  max
}: {
  label: string;
  used: number;
  max: number;
}) {
  const remaining = max === Infinity ? Infinity : Math.max(0, max - used);
  const pct = max === Infinity ? 0 : Math.min(100, (used / max) * 100);
  const isLow = remaining !== Infinity && remaining <= 2;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-body text-club text-base">{label}</span>
        <span
          className={`font-header text-base ${isLow ? 'text-red-400' : remaining === Infinity ? 'text-gold' : 'text-cyan'}`}
        >
          {remaining === Infinity ? '∞' : `${remaining} left`}
        </span>
      </div>
      {max !== Infinity && (
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-gold'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function EventPill({ label, remaining }: { label: string; remaining: number }) {
  const empty = remaining === 0;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${empty ? 'border-zinc-800 bg-zinc-900/50' : 'border-gold/30 bg-gold/5'}`}
    >
      <p className="font-body text-club text-sm">{label}</p>
      <p
        className={`font-header text-base ${empty ? 'text-zinc-600' : 'text-gold'}`}
      >
        {empty ? '—' : remaining}
      </p>
    </div>
  );
}

function ProfileTab() {
  const { avatar } = useQuestStore();
  const classColors: Record<string, string> = {
    romantic: '#FF69B4',
    adventurer: '#FFD700',
    scholar: '#00E5FF',
    mystic: '#9B59B6',
    champion: '#E74C3C'
  };

  return (
    <div className="p-5">
      <h3 className="font-header text-gold text-lg mb-5">Your Avatar</h3>
      <div className="flex flex-col items-center gap-4 py-3">
        <div className="relative">
          {avatar?.imageUrl ? (
            <Image
              src={avatar.imageUrl}
              alt="Quest avatar"
              width={112}
              height={112}
              className="rounded-full object-cover border-2 border-gold/60 shadow-[0_0_30px_rgba(255,215,0,0.3)]"
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-linear-to-br from-zinc-800 to-zinc-900 border-2 border-gold/60 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
              <span className="text-5xl">👤</span>
            </div>
          )}
          {avatar?.rpgClass && (
            <div
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-zinc-950 flex items-center justify-center"
              style={{
                backgroundColor: classColors[avatar.rpgClass] || '#FFD700'
              }}
            >
              <span className="text-sm">✨</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-body text-white text-lg">
            {avatar?.name || 'Your Avatar'}
          </p>
          <p className="font-body text-club text-sm mt-1">
            {avatar?.rpgClass
              ? `The ${avatar.rpgClass.charAt(0).toUpperCase() + avatar.rpgClass.slice(1)}`
              : 'Coming soon — forge your look'}
          </p>
          {!avatar && (
            // oxlint-disable-next-line next/no-html-link-for-pages
            <a
              href="/quest"
              onClick={() => {
                const { toggleExpand } = useHudStore.getState();
                toggleExpand();
              }}
              className="mt-3 inline-block rounded-lg border border-gold/50 bg-gold/10 px-4 py-2 text-sm font-bold text-gold transition hover:bg-gold/20"
            >
              ⚔️ Forge Your Hero
            </a>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 mb-5">
        <p className="font-header text-cyan text-sm mb-3">Quick Stats</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-hero text-gold text-xl">0</p>
            <p className="font-body text-zinc-500 text-sm">Matches</p>
          </div>
          <div>
            <p className="font-hero text-gold text-xl">0</p>
            <p className="font-body text-zinc-500 text-sm">Messages</p>
          </div>
          <div>
            <p className="font-hero text-gold text-xl">—</p>
            <p className="font-body text-zinc-500 text-sm">Streak</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-center">
        <p className="text-4xl mb-3">🎮</p>
        <h4 className="font-header text-gold text-base mb-2">RPG Story Mode</h4>
        <p className="font-body text-zinc-500 text-sm mb-4">
          Build your character and start your story.
        </p>
        <button className="rounded-lg border border-gold/50 bg-gold/10 px-5 py-2.5 text-sm font-bold text-gold transition hover:bg-gold/20">
          Coming Soon
        </button>
      </div>
    </div>
  );
}

function WalletTab({
  wallet,
  inventory
}: {
  wallet: import('@/utils/store/hudStore').WalletState;
  inventory: import('@/utils/store/hudStore').InventoryItem[];
}) {
  return (
    <div className="p-5">
      <h3 className="font-header text-gold text-lg mb-5">Your Wallet</h3>
      <div className="rounded-xl border border-gold/40 bg-linear-to-br from-gold/10 to-transparent p-5 text-center mb-5">
        <p className="font-body text-club text-sm mb-1">Available Tokens</p>
        <p className="font-hero text-gold text-5xl">{wallet.tokens}</p>
        <p className="font-body text-zinc-500 text-sm mt-3">
          Lifetime spent: {wallet.lifetimeSpent}
        </p>
      </div>
      <div className="flex gap-3 mb-5">
        <button className="flex-1 rounded-lg border border-gold/50 bg-gold/10 py-2.5 text-sm font-bold text-gold transition hover:bg-gold/20">
          Buy Tokens
        </button>
        <button className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white">
          History
        </button>
      </div>
      {inventory.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h4 className="font-header text-cyan text-sm mb-3">
            Inventory ({inventory.length})
          </h4>
          <div className="space-y-2">
            {inventory.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {item.category === 'gift'
                      ? '🎁'
                      : item.category === 'cosmetic'
                        ? '👕'
                        : '🧊'}
                  </span>
                  <span className="font-body text-club text-sm">
                    {item.name}
                  </span>
                </div>
                <span className="font-header text-cyan text-sm">
                  ×{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpTab() {
  const handleContactUs = () =>
    window.open('https://forms.smartscott.online/forms/cheeky', '_blank');

  return (
    <div className="p-5">
      <h3 className="font-header text-gold text-lg mb-5">Help & Support</h3>
      <div className="rounded-xl border border-club/30 bg-linear-to-br from-club/10 to-transparent p-4 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <Image
            src="/personas/chaz/portrait.webp"
            alt="Chaz"
            width={56}
            height={56}
            className="rounded-full border-2 border-club/60 object-cover"
          />
          <div>
            <p className="font-header text-club text-lg">Chaz</p>
            <p className="font-body text-club/70 text-sm">
              Club Manager & AI Assistant
            </p>
          </div>
          <span className="ml-auto rounded-full bg-club/20 px-3 py-1 text-xs font-bold text-club">
            ONLINE
          </span>
        </div>
        <p className="font-body text-club/80 text-sm mb-4">
          Need help? Chaz is here to answer your questions about the club, your
          account, or anything else.
        </p>
        <button className="w-full rounded-lg bg-club py-2.5 text-sm font-bold text-white transition hover:bg-club-cotton">
          Chat with Chaz
        </button>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-5">
        <h4 className="font-header text-cyan text-sm mb-2">Contact Us</h4>
        <p className="font-body text-zinc-500 text-sm mb-4">
          Have a question, suggestion, or need support?
        </p>
        <button
          onClick={handleContactUs}
          className="w-full rounded-lg border border-cyan/30 bg-cyan/10 py-2.5 text-sm font-bold text-cyan transition hover:bg-cyan/20"
        >
          📧 Send us a Message
        </button>
      </div>
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="font-header text-zinc-500 text-xs uppercase tracking-wider mb-3">
          Quick Links
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {['/terms', '/privacy', '/best-practices', '/contact'].map((href) => (
            <a
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center transition hover:border-gold/30 hover:bg-gold/5"
            >
              <p className="font-body text-club text-sm">
                {href.replace('/', '').replace('-', ' ')}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
