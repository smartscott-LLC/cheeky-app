import type { MetadataRoute } from 'next';

const CDN = 'https://ioqeddpgdilyyajsygmz.supabase.co/storage/v1/object/public/cheeky-assets';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Club Cheeky',
    short_name: 'Club Cheeky',
    description:
      'A dating club built like a nightclub — every person with an ID is a VIP.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: `${CDN}/icons/entrance-logo.webp`, sizes: '192x192', type: 'image/png' },
      { src: `${CDN}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' }
    ]
  };
}
