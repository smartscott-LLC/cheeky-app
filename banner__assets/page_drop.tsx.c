// app/page.tsx
import AnnouncementBanner from '@/components/AnnouncementBanner';

export default function Home() {
  return (
    <main>
      <AnnouncementBanner />
      <h1 className="p-8 text-3xl">Welcome to your site</h1>
    </main>
  );
}   
