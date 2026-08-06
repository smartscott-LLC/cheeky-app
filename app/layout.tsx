import { Metadata } from 'next';
import Footer from '@/components/ui/Footer';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import Concierge from '@/components/ui/Agent/Concierge';
import ClubAudio from '@/components/ui/Audio/ClubAudio';
import ServiceWorkerRegister from '@/components/ui/PWA/ServiceWorkerRegister';
import InstallPrompt from '@/components/ui/PWA/InstallPrompt';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import { Great_Vibes } from 'next/font/google';
import 'styles/main.css';

// The club's script wordmark — gold metallic gradient, per the UI style guide.
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
    <html lang="en" className={script.variable}>
      <body className="bg-black">
        <ServiceWorkerRegister />
        <InstallPrompt />
        <Navbar />
        <main
          id="skip"
          className="min-h-[calc(100dvh-4rem)] md:min-h[calc(100dvh-5rem)]"
        >
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
          <ClubAudio />
        </Suspense>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
