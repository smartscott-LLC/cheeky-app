'use client';

import { useEffect, useState } from 'react';
import s from './AnnouncementBanner.module.css';

interface Announcement {
  message: string | null;
  display_style: 'scroll' | 'roll' | 'fade';
  link: string | null;
}

/**
 * The marquee beneath each floor's name — a permanent fixture that carries
 * the current announcement and rotates how it presents it (ticker / roll /
 * fade) so fresh messages read as new. Posted from the Lions Den.
 */
export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/announcement');
        const data: Announcement = await res.json();
        if (alive && data?.message) setAnnouncement(data);
      } catch {
        // The marquee is a fixture, not a feature — silence failures.
      }
    };
    load();
    // Re-check so a newly posted announcement goes live within a minute.
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!announcement?.message) return null;

  const styleClass =
    announcement.display_style === 'roll'
      ? s.rollText
      : announcement.display_style === 'fade'
        ? s.fadeText
        : s.scrollText;

  const content = <span className={styleClass}>{announcement.message}</span>;

  return (
    <div className={s.banner}>
      {announcement.link ? (
        <a
          href={announcement.link}
          target="_blank"
          rel="noreferrer"
          className="w-full text-center"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
