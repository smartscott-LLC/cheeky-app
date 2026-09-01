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
  photos: ProfilePhoto[];
  photoBase: string;
  photoLimit?: number;
}

const MAX_PHOTOS = 3;

export default function ProfileForm({
  userId,
  displayName,
  bio,
  interestedIn = 'everyone',
  gender = null,
  oneLiner = null,
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      honeypot
    );
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="font-header text-cyan text-xl">Your profile</h2>
      <p className="mt-1 text-sm text-club">
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
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-club/60 bg-club/5 text-3xl font-bold text-club transition hover:border-club hover:bg-club/10"
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
            if (file) handleUpload(file);
          }}
        />
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-1">
          <label htmlFor="displayName" className="text-sm font-semibold">
            Choose your avatar name
          </label>
          <p className="text-xs text-club">
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
          <label htmlFor="oneLiner" className="text-sm font-semibold">
            Your one-liner
          </label>
          <input
            id="oneLiner"
            value={oneLinerText}
            onChange={(e) => setOneLinerText(e.target.value)}
            maxLength={80}
            placeholder="What's your best pickup line?"
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
          <p className="text-xs text-club">
            A little insight goes a long way. SPARX shows it under your
            name.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="gender" className="text-sm font-semibold">
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
          <p className="text-xs text-club">
            The club pairs real gentlemen and real ladies. This tells the floor
            who you are — required, and never shown as a label.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="interestedIn" className="text-sm font-semibold">
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
          <p className="text-xs text-club">
            Who you&apos;re here to meet — personal, and never shown publicly.
            It groups you with the right company at events and guides the
            club&apos;s suggestions.
          </p>
        </div>
        <div className="grid gap-1">
          <label htmlFor="bio" className="text-sm font-semibold">
            Bio
          </label>
          <textarea
            id="bio"
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-club">{error}</p>}
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
