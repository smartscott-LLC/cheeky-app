import localFont from 'next/font/local';
import '@/styles/globals.css';

const hero = localFont({
  src: '../../styles/fonts/Fascinate-Regular.ttf',
  variable: '--font-hero',
  display: 'swap'
});
const header = localFont({
  src: '../../styles/fonts/Damion-Regular.ttf',
  variable: '--font-header',
  display: 'swap'
});
const body = localFont({
  src: '../../styles/fonts/Rancho-Regular.ttf',
  variable: '--font-body',
  display: 'swap'
});

export const metadata = {
  title: 'Quest for Love — Avatar Creator',
  description: 'Forge your Pixar-quality RPG avatar.'
};

export default function QuestLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${hero.variable} ${header.variable} ${body.variable}`}
    >
      <body className="bg-[#080B1A] antialiased">{children}</body>
    </html>
  );
}
