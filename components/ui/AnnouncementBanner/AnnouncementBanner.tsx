'use client';

import { useEffect, useRef, useState } from 'react';
import s from './AnnouncementBanner.module.css';

interface Announcement {
  id: number;
  message: string | null;
  display_style: 'scroll' | 'roll' | 'fade';
  link: string | null;
  ends_at: string | null;
  created_at: string;
}

/**
 * The marquee beneath each floor's name — cycles through up to 5 active
 * announcements. Each one plays its full animation (scroll/roll/fade) before
 * moving to the next. Posted from the Lions Den.
 */
export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duration for each animation style (ms) — long enough to read the full message.
  const ANIM_DURATION: Record<string, number> = {
    scroll: 18_000,
    roll: 14_000,
    fade: 12_000
  };

  const load = async () => {
    try {
      const res = await fetch('/api/announcement', { cache: 'no-store' });
      const data = await res.json();
      if (data?.all && Array.isArray(data.all)) {
        setAnnouncements(data.all);
        setCurrentIndex(0);
      } else if (data?.message) {
        // Backwards compat: single-announce response
        setAnnouncements([
          {
            id: 0,
            message: data.message,
            display_style: data.display_style as Announcement['display_style'],
            link: data.link,
            ends_at: null,
            created_at: new Date().toISOString()
          }
        ]);
        setCurrentIndex(0);
      } else {
        setAnnouncements([]);
      }
    } catch {
      // Silence failures — the marquee is a fixture, not a feature.
    }
  };

  useEffect(() => {
    void load();
    // Re-check so newly posted or expired announcements go live within a minute.
    const interval = setInterval(load, 60_000);

    const rotate = () => {
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % Math.max(announcements.length, 1));
        rotate();
      }, ANIM_DURATION[announcements[currentIndex]?.display_style ?? 'scroll']);
    };
    rotate();

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [announcements]); // re-start timer when the list changes

  const current = announcements[currentIndex];

  if (!current?.message) return null;

  const styleClass =
    current.display_style === 'roll'
      ? s.rollText
      : current.display_style === 'fade'
        ? s.fadeText
        : s.scrollText;

  const content = <span className={styleClass}>{current.message}</span>;

  return (
    <div className={s.banner}>
      {current.link ? (
        <a
          href={current.link}
          target="_blank"
          rel="noreferrer"
          className="font-body text-club w-full text-center"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
