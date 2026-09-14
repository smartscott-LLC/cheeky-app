'use client';

import { useRef, useState } from 'react';
import {
  deleteProfilePhoto,
  setPrimaryPhoto,
  updateProfile,
  uploadProfilePhoto
} from '@/app/account/actions';

export interface ProfilePhoto {
  id: string;
  storage_path: string;
  is_primary: boolean;
  position: number;
}

interface ProfileFormProps {
  userId: string;
  displayName: string;
  bio: string;
  interestedIn?: 'women' | 'men' | 'everyone';
  gender?: 'gentleman' | 'lady' | null;
  oneLiner?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  religion?: string | null;
  hasKids?: boolean | null;
  livesAtHome?: boolean | null;
  livingArrangement?: 'own' | 'rent' | 'parents' | 'roommates' | 'other' | null;
  hobbies?: string[] | null;
  photos: ProfilePhoto[];
  photoBase: string;
  photoLimit?: number;
}

const MAX_PHOTOS = 3;

const AI_CHARACTERS = [
  {
    key: 'trixie',
    name: 'Trixie',
    floor: 'Platinum',
    desc: 'Sharp, confident'
  },
  { key: 'bartender', name: 'Roxy', floor: 'Gold', desc: 'Playful, dangerous' },
  {
    key: 'hostess',
    name: 'Valentina',
    floor: 'Diamond',
    desc: 'High standards'
  }
] as const;

const HOME_OPTIONS = [
  'own place',
  'rents',
  'with roommates',
  "it's complicated"
];

export default function ProfileForm({
  userId: _userId,
  displayName,
  bio,
  interestedIn = 'everyone',
  gender = null,
  oneLiner = null,
  smoking = null,
  drinking = null,
  religion = null,
  hasKids = false,
  livingArrangement = null,
  hobbies: initialHobbies,
  photos: initialPhotos,
  photoBase,
  photoLimit = MAX_PHOTOS
}: ProfileFormProps) {
  const [name, setName] = useState(displayName);
  const [bioText, setBioText] = useState(bio);
  const [oneLinerText, setOneLinerText] = useState(oneLiner ?? '');
  const [pref, setPref] = useState<'women' | 'men' | 'everyone'>(interestedIn);
  const [identity, setIdentity] = useState<'gentleman' | 'lady' | null>(gender);
  const [honeypot, setHoneypot] = useState('');
  const [photos, setPhotos] = useState<ProfilePhoto[]>(initialPhotos);
  const [smokingSel, setSmokingSel] = useState(smoking ?? '');
  const [drinkingSel, setDrinkingSel] = useState(drinking ?? '');
  const [religionSel, setReligionSel] = useState(religion ?? '');
  const [hasKidsSel, setHasKidsSel] = useState(Boolean(hasKids));
  const [livingSel, setLivingSel] = useState<
    'own' | 'rent' | 'parents' | 'roommates' | 'other'
  >(
    (livingArrangement as 'own' | 'rent' | 'parents' | 'roommates' | 'other') ??
      'own'
  );
  const [hobbiesSel, setHobbiesSel] = useState(
    (initialHobbies ?? []).join(', ')
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [selectedChar, setSelectedChar] = useState('trixie');
  const [draftInput, setDraftInput] = useState<{
    vices: string;
    home: string;
    extra: string;
  }>({ vices: '', home: '', extra: '' });
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const handleUpload = async (file: File) => {
    if (photos.length >= photoLimit) {
      setError(`Max ${photoLimit} photos on this floor.`);
      return;
    }
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError('file too large (10MB max)');
      return;
    }
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('position', String(photos.length));
      formData.append('isFirst', photos.length === 0 ? 'true' : 'false');

      const res = await uploadProfilePhoto(formData);
      if (res.error) {
        setError(res.error);
        return;
      }

      const isFirst = photos.length === 0;
      setPhotos([
        ...photos,
        {
          id: res.id!,
          storage_path: res.storagePath!,
          is_primary: isFirst,
          position: photos.length
        }
      ]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error('upload threw:', err);
      setError('upload failed — please try again');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: ProfilePhoto) => {
    try {
      await deleteProfilePhoto(photo.id, photo.storage_path);
      const next = photos.filter((p) => p.id !== photo.id);
      if (photo.is_primary && next.length > 0) {
        await setPrimaryPhoto(next[0].id);
        next[0] = { ...next[0], is_primary: true };
      }
      setPhotos(next);
    } catch (err) {
      console.error('delete threw:', err);
      setError('could not delete photo');
    }
  };

  const handleSetPrimary = async (photo: ProfilePhoto) => {
    try {
      await setPrimaryPhoto(photo.id);
      setPhotos(photos.map((p) => ({ ...p, is_primary: p.id === photo.id })));
    } catch (err) {
      console.error('setPrimary threw:', err);
      setError('could not update photo');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    if (!identity) {
      setError('The club needs to know who you are — gentleman or lady.');
      setSaving(false);
      return;
    }
    const res = await updateProfile(
      name,
      bioText,
      pref,
      identity,
      oneLinerText,
      honeypot,
      smokingSel as 'never' | 'socially' | 'quit' | undefined,
      drinkingSel as 'never' | 'socially' | 'regularly' | undefined,
      religionSel || undefined,
      hasKidsSel,
      livingSel,
      hobbiesSel
    );
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAiDraft = async () => {
    setAiBusy(true);
    setError(null);
    const res = await (
      await import('@/app/api/bio-draft/route')
    ).getBioDraft(
      {
        personality: selectedChar,
        vices: draftInput.vices,
        home: draftInput.home,
        hobbies: draftInput.extra
      },
      bioText
    );
    setAiBusy(false);
    if (res.error) {
      setError(
        res.error === 'ai_unavailable'
          ? 'The cast is on break — fill it in yourself.'
          : res.error
      );
      return;
    }
    if (res.draft) {
      setAiDraft(res.draft);
      setError(null);
    }
  };

  const acceptDraft = () => {
    if (aiDraft) {
      setBioText(aiDraft);
      setDraftMode(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="font-header text-cyan text-xl">Your profile</h2>
      <p className="mt-1 text-sm font-body text-club">
        Up to {photoLimit} photos on this floor. This is what the club sees.
      </p>

      <div className="mt-5 grid grid-cols-4 gap-2.5 sm:grid-cols-5">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${photoBase}${photo.storage_path}`}
              alt="Profile"
              className="h-full w-full object-cover"
            />
            {photo.is_primary && (
              <span className="absolute left-1 top-1 rounded-full bg-club px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Main
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition group-hover:opacity-100">
              {!photo.is_primary && (
                <button
                  onClick={() => handleSetPrimary(photo)}
                  className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-bold text-black"
                >
                  Main
                </button>
              )}
              <button
                onClick={() => handleDelete(photo)}
                className="rounded-md bg-club px-2 py-1 text-xs font-bold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {photos.length < photoLimit && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-club/60 bg-club/5 text-3xl font-bold font-body text-club transition hover:border-club hover:bg-club/10"
          >
            {uploading ? '…' : '+'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
      </div>

      {/* AI Bio Draft — sits between photos and bio fields */}
      <div className="mt-6">
        <button
          onClick={() => setDraftMode(!draftMode)}
          className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-bold text-gold transition hover:bg-gold/20"
        >
          {draftMode ? '✎ Write it yourself' : '✨ AI Bio Draft'}
        </button>
        {draftMode && (
          <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
            <h3 className="font-header text-gold text-base">
              Pick a crew member to write it for you
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {AI_CHARACTERS.map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => setSelectedChar(ch.key)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    selectedChar === ch.key
                      ? 'border-gold bg-gold/20'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-header text-gold text-sm">
                    {ch.name}
                  </span>
                  <span className="ml-2 text-[11px] font-body text-club/70">
                    ({ch.floor}) — {ch.desc}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-vices"
                  className="text-xs font-semibold text-cyan"
                >
                  Vices / habits
                </label>
                <select
                  id="profile-vices"
                  value={draftInput.vices}
                  onChange={(e) =>
                    setDraftInput({ ...draftInput, vices: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg bg-zinc-800 p-2.5 text-sm text-white outline-none ring-club/50 focus:ring-2"
                >
                  <option value="">None of your business</option>
                  <option value="non-drinker">Non-drinker</option>
                  <option value="social drinker">Social drinker</option>
                  <option value="party person">Party person</option>
                  <option value="smoker">Smoker</option>
                  <option value="non-smoker">Never smoked</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="profile-home"
                  className="text-xs font-semibold text-cyan"
                >
                  Living situation
                </label>
                <select
                  id="profile-home"
                  value={draftInput.home}
                  onChange={(e) =>
                    setDraftInput({ ...draftInput, home: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg bg-zinc-800 p-2.5 text-sm text-white outline-none ring-club/50 focus:ring-2"
                >
                  {HOME_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label
                htmlFor="profile-extra"
                className="text-xs font-semibold text-cyan"
              >
                Anything else to add?
              </label>
              <input
                id="profile-extra"
                value={draftInput.extra}
                onChange={(e) =>
                  setDraftInput({ ...draftInput, extra: e.target.value })
                }
                placeholder="Hobbies, quirks, deal-breakers..."
                maxLength={200}
                className="mt-1 w-full rounded-lg bg-zinc-800 p-2.5 text-sm text-white outline-none ring-club/50 focus:ring-2"
              />
            </div>
            {aiDraft && (
              <div className="mt-3 rounded-lg border border-club/40 bg-club/10 p-3">
                <span className="font-body text-club text-sm">{aiDraft}</span>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={acceptDraft}
                    className="rounded-lg bg-club px-3 py-1.5 text-xs font-bold text-white transition hover:bg-club-cotton"
                  >
                    Use this
                  </button>
                  <button
                    onClick={() => setAiDraft(null)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-cyan hover:border-zinc-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={handleAiDraft}
              disabled={aiBusy}
              className="mt-3 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black transition hover:bg-gold-royal disabled:opacity-50"
            >
              {aiBusy ? 'Thinking…' : '✨ Generate draft'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-1">
          <label
            htmlFor="displayName"
            className="font-header text-cyan text-base"
          >
            Name
          </label>
          <p className="text-xs font-body text-club">
            This is the name the club calls you. Your real name stays private
            unless you put it here.
          </p>
          <input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="oneLiner" className="font-header text-cyan text-base">
            One-liner
          </label>
          <input
            id="oneLiner"
            value={oneLinerText}
            onChange={(e) => setOneLinerText(e.target.value)}
            maxLength={80}
            placeholder="What's your best pickup line?"
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
          <p className="text-xs font-body text-club">
            A little insight goes a long way. SPARX shows it under your name.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="gender" className="font-header text-cyan text-base">
            What are you?
          </label>
          <select
            id="gender"
            value={identity ?? ''}
            onChange={(e) =>
              setIdentity(e.target.value as 'gentleman' | 'lady' | null)
            }
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          >
            <option value="" disabled>
              Choose one
            </option>
            <option value="gentleman">Gentleman</option>
            <option value="lady">Lady</option>
          </select>
          <p className="text-xs font-body text-club">
            The club pairs real gentlemen and real ladies. This tells the floor
            who you are — required, and never shown as a label.
          </p>
        </div>
        <div className="grid gap-1">
          <label
            htmlFor="interestedIn"
            className="font-header text-cyan text-base"
          >
            Dating preference
          </label>
          <select
            id="interestedIn"
            value={pref}
            onChange={(e) =>
              setPref(e.target.value as 'women' | 'men' | 'everyone')
            }
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          >
            <option value="everyone">Both</option>
            <option value="women">Ladies</option>
            <option value="men">Gentlemen</option>
          </select>
          <p className="text-xs font-body text-club">
            Who you&apos;re here to meet — personal, and never shown publicly.
            It groups you with the right company at events and guides the
            club&apos;s suggestions.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="smoking" className="font-header text-cyan text-base">
            Smoking
          </label>
          <select
            id="smoking"
            value={smokingSel}
            onChange={(e) => setSmokingSel(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          >
            <option value="">Prefer not to say</option>
            <option value="never">Never</option>
            <option value="socially">Socially</option>
            <option value="quit">Quit</option>
          </select>
          <p className="text-xs font-body text-club">
            Optional — helps matches know the vibe. 50 char limit.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="drinking" className="font-header text-cyan text-base">
            Drinking
          </label>
          <select
            id="drinking"
            value={drinkingSel}
            onChange={(e) => setDrinkingSel(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          >
            <option value="">Prefer not to say</option>
            <option value="never">Never</option>
            <option value="socially">Socially</option>
            <option value="regularly">Regularly</option>
          </select>
          <p className="text-xs font-body text-club">
            Optional — helps matches know what to order. 50 char limit.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="religion" className="font-header text-cyan text-base">
            Religion
          </label>
          <input
            id="religion"
            value={religionSel}
            onChange={(e) => setReligionSel(e.target.value)}
            placeholder="e.g. Christianity, Buddhism, none"
            maxLength={100}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
          <p className="text-xs font-body text-club">
            Optional — share only if it matters to you. Max 100 characters.
          </p>
        </div>
        <div className="grid gap-1">
          <label
            htmlFor="profile-kids"
            className="font-header text-cyan text-base"
          >
            Kids?
          </label>
          <div id="profile-kids" className="flex gap-4 mt-1">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                checked={!hasKidsSel}
                onChange={() => setHasKidsSel(false)}
                className="accent-club"
              />
              No kids
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                checked={!!hasKidsSel}
                onChange={() => setHasKidsSel(true)}
                className="accent-club"
              />
              Has kids
            </label>
          </div>
          <p className="text-xs font-body text-club">
            Optional — important for compatibility.
          </p>
        </div>
        <div className="grid gap-1">
          <label
            htmlFor="profile-living"
            className="font-header text-cyan text-base"
          >
            Living situation
          </label>
          <select
            id="profile-living"
            value={livingSel}
            onChange={(e) =>
              setLivingSel(
                e.target.value as
                  'own' | 'rent' | 'parents' | 'roommates' | 'other'
              )
            }
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          >
            <option value="own">Own a place</option>
            <option value="rent">Rent</option>
            <option value="parents">Living with parents</option>
            <option value="roommates">Living with roommates</option>
            <option value="other">Other</option>
          </select>
          <p className="text-xs font-body text-club">
            Optional — helps matches understand your situation.
          </p>
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <label htmlFor="hobbies" className="font-header text-cyan text-base">
            Hobbies
          </label>
          <input
            id="hobbies"
            value={hobbiesSel}
            onChange={(e) => setHobbiesSel(e.target.value)}
            placeholder="hiking, cooking, vinyl, etc."
            maxLength={300}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
          <p className="text-xs font-body text-club">
            List your interests — they show on your profile card. Max 300
            characters.
          </p>
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <label
            htmlFor="bio"
            className="font-header text-cyan text-base flex items-center gap-2"
          >
            Bio
            {aiDraft && (
              <button
                onClick={() => setAiDraft(null)}
                className="text-xs text-club/60 hover:text-club"
                title="Clear AI draft"
              >
                ✕ clear
              </button>
            )}
          </label>
          <textarea
            id="bio"
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder={
              aiDraft
                ? aiDraft
                : 'Say something that makes them want to match...'
            }
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
          {bioText.length > 400 && (
            <span className="text-xs font-body text-club/60">
              {bioText.length}/500
            </span>
          )}
          <p className="text-xs font-body text-club">
            Your bio is public — make it count. Max 500 characters. No explicit
            content allowed; all images are AI-reviewed.
          </p>
        </div>

        {/* Content warning */}
        <div className="mt-4 rounded-lg border border-club/30 bg-club/5 px-4 py-3">
          <p className="font-header text-cyan text-sm">Note</p>
          <p className="text-xs font-body text-club mt-1">
            Explicit or pornographic content is not allowed on Club Cheeky. All
            photos undergo AI review before appearing on profiles. Violations
            result in immediate removal.
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-body text-club">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-400">Saved.</p>}

      {/* Honeypot — hidden from humans, irresistible to bots. */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton"
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
