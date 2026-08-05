# Android Wrapper — the Play Store path (TWA)

**The plan (founder 2026-08-04):** no Kotlin port of the club. The Android
app is a thin Trusted Web Activity that loads `smartscott.online` full-screen,
keeps the session, and shows up in the Play Store as a real app. One source
of truth — the web app — and the mobile app *is* the site, which already
looks and works great on a phone.

The old native attempt (`cheeky-app-android/cheeky-app-mobile`, a Compose
port) can be retired or repurposed — its package id is reused below.

## What's already done (this repo)
- **PWA manifest** — `app/manifest.ts` (served at `/manifest.webmanifest`).
- **Service worker** — `public/sw.js`, registered by
  `components/ui/PWA/ServiceWorkerRegister.tsx` (network-first + cache
  fallback). Satisfies the installability criteria TWA requires.
- **Icons** — `public/icons/icon-192.png` + `icon-512.png` (cropped from
  `persona_assets/app.png` via sharp).
- **Digital Asset Links** — `public/.well-known/assetlinks.json`, package
  `com.clubcheeky.app`, with a placeholder fingerprint to fill in below.

## The steps (yours to run — ~30 minutes)

### 1. Create the release signing key (one time, keep it safe)
```bash
keytool -genkey -v -keystore club-cheeky.keystore -alias clubcheeky \
  -keyalg RSA -keysize 2048 -validity 10000
```
Store the keystore + passwords somewhere safe — you need the SAME key for
every future update.

### 2. Get the SHA-256 fingerprint of that cert
```bash
keytool -list -v -keystore club-cheeky.keystore -alias clubcheeky \
  | grep "SHA256:"
```
Take the fingerprint, strip the colons (`AA:BB` → `AABB`), and paste it into
`public/.well-known/assetlinks.json` (replacing the placeholder). Commit +
push — it serves at `https://smartscott.online/.well-known/assetlinks.json`.

### 3. Build the wrapper with Bubblewrap (Google's tool)
```bash
npx @bubblewrap/cli init --manifest https://smartscott.online/manifest.webmanifest
# it will ask for the app id: com.clubcheeky.app
# ...point it at your keystore + fingerprint when asked...
npx @bubblewrap/cli build
```
Bubblewrap generates the Android project and an AAB/APK ready for upload.

### 4. Create the Play Console listing
- Developer account: `https://play.google.com/console` (one-time $25).
- Create the app, upload the AAB from step 3.
- **Data safety** + **privacy policy URL**: `https://smartscott.online/privacy`.
- Store listing: name "Club Cheeky", the screenshots, and the description
  from the landing page. Content rating questionnaire (dating app: 17+).

### 5. Ship updates the easy way
Every change lives in the web app. The wrapper rarely changes — rebuild it
only when the keystore/package/fingerprint changes. Optionally enable Play
App Signing so Google holds the key.

## Notes
- The fingerprint must match the **release** signing key (or Play App
  Signing's upload key) exactly, or Android won't hand the URL to the app.
- The web app needs `smartscott.online` reachable over HTTPS — already true.
- If you'd rather hand-roll the wrapper instead of Bubblewrap, a minimal
  TWA is ~100 lines of Kotlin around
  `androidx.browser.trusted.TwaLauncher` — the doc can be extended.
