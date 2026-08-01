'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { updateProfile } from '@/app/account/actions';

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
  photos: ProfilePhoto[];
  photoBase: string;
  photoLimit?: number;
}

const MAX_PHOTOS = 3;

export default function ProfileForm({
  userId,
  displayName,
  bio,
  photos: initialPhotos,
  photoBase,
  photoLimit = MAX_PHOTOS
}: ProfileFormProps) {
  const supabase = createClient();
  const [name, setName] = useState(displayName);
  const [bioText, setBioText] = useState(bio);
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
    setUploading(true);

    const storagePath = `${userId}/${crypto.randomUUID()}`;
    const { error: upErr } = await supabase.storage
      .from('profiles')
      .upload(storagePath, file);
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const isFirst = photos.length === 0;
    const { data, error: insErr } = await supabase
      .from('photos')
      .insert({
        user_id: userId,
        storage_path: storagePath,
        position: photos.length,
        is_primary: isFirst
      })
      .select('id')
      .single();

    if (insErr) {
      await supabase.storage.from('profiles').remove([storagePath]);
      setError(insErr.message);
      setUploading(false);
      return;
    }

    setPhotos([
      ...photos,
      {
        id: data.id,
        storage_path: storagePath,
        is_primary: isFirst,
        position: photos.length
      }
    ]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (photo: ProfilePhoto) => {
    await supabase.from('photos').delete().eq('id', photo.id);
    await supabase.storage.from('profiles').remove([photo.storage_path]);
    const next = photos.filter((p) => p.id !== photo.id);
    if (photo.is_primary && next.length > 0) {
      await supabase.from('photos').update({ is_primary: true }).eq('id', next[0].id);
      next[0] = { ...next[0], is_primary: true };
    }
    setPhotos(next);
  };

  const handleSetPrimary = async (photo: ProfilePhoto) => {
    await supabase
      .from('photos')
      .update({ is_primary: false })
      .eq('user_id', userId);
    await supabase.from('photos').update({ is_primary: true }).eq('id', photo.id);
    setPhotos(
      photos.map((p) => ({ ...p, is_primary: p.id === photo.id }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await updateProfile(name, bioText);
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
      <h2 className="text-xl font-bold">Your profile</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Up to {photoLimit} photos on this floor. This is what the club sees.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
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
            Display name
          </label>
          <input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          />
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
