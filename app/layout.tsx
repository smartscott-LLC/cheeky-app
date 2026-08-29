import { Metadata } from 'next';
import Footer from '@/components/ui/Footer';
import Navbar from '@/components/ui/Navbar';
import TikiTaskbar from '@/components/ui/Taskbar/TikiTaskbar';
import StreamChatOverlay from '@/components/ui/ClubChat/StreamChatOverlay';
import { Toaster } from '@/components/ui/Toasts/toaster';
import Concierge from '@/components/ui/Agent/Concierge';
import ClubAudio from '@/components/ui/Audio/ClubAudio';
import ServiceWorkerRegister from '@/components/ui/PWA/ServiceWorkerRegister';
import InstallPrompt from '@/components/ui/PWA/InstallPrompt';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { PropsWithChildren, Suspense } from 'react';
import localFont from 'next/font/local';
import { Great_Vibes } from 'next/font/google';
import { getURL } from '@/utils/helpers';
import 'styles/main.css';
import 'styles/lounge-animations.css';

// The nightclub type system (founder): Fascinate for heroes, Damion for
// headers, Rancho for body. All three are single-weight display fonts —
// main.css sets font-synthesis: none on headings so weight utilities never
// fake-bold them.
const hero = localFont({
  src: '../styles/fonts/Fascinate-Regular.ttf',
  variable: '--font-hero',
  display: 'swap'
});
const header = localFont({
  src: '../styles/fonts/Damion-Regular.ttf',
  variable: '--font-header',
  display: 'swap'
});
const body = localFont({
  src: '../styles/fonts/Rancho-Regular.ttf',
  variable: '--font-body',
  display: 'swap'
});
// The wordmark — the club's logo, gold metallic gradient. It's art; it stays
// on Great_Vibes regardless of the type system.
const script = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap'
});

const title = 'Club Cheeky — The Club for Real Connections';
const description =
  'A dating app built like a nightclub. Get in free with a verified ID. Live events, real matches, no gouging.';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: title,
  description: description,
  // iOS "Add to Home Screen" ignores manifest icons — it needs this link,
  // or it screenshots the page as the icon. 192 works (iOS scales to 180).
  icons: {
    apple: '/icons/icon-192.png',
    icon: '/icons/icon-192.png'
  },
  openGraph: {
    title: title,
    description: description
  }
};

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${hero.variable} ${header.variable} ${body.variable} ${script.variable}`}>
      <body className="bg-black">
        <ServiceWorkerRegister />
        <InstallPrompt />
        <Navbar />
        <main
          id="skip"
          className="min-h-[calc(100dvh-4rem)] md:min-h[calc(100dvh-5rem)]"
        >
          <Suspense>
            <TikiTaskbar />
          </Suspense>
          {children}
        </main>
        <Footer />
        <Suspense>
          <Toaster />
        </Suspense>
        <Suspense>
          <Concierge />
        </Suspense>
        <Suspense>
          <StreamChatOverlay />
        </Suspense>
        <Suspense>
          <ClubAudio />
        </Suspense>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
