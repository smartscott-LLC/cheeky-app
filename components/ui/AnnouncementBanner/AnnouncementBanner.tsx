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

const ANIM_DURATION: Record<string, number> = {
  scroll: 18_000,
  roll: 14_000,
  fade: 12_000
};

/**
 * The marquee beneath each floor's name — cycles through up to 5 active
 * announcements. Each one plays its full animation before moving to the next.
 */
export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const announceRef = useRef(announcements);
  const indexRef = useRef(currentIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync so the rotation timer always reads current values.
  useEffect(() => {
    announceRef.current = announcements;
  }, [announcements]);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Load announcements from the API
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/announcement', { cache: 'no-store' });
        const data: {
          all?: Announcement[];
          message?: string | null;
          display_style?: Announcement['display_style'];
          link?: string | null;
        } = await res.json();
        if (!alive) return;
        if (data?.all && Array.isArray(data.all) && data.all.length > 0) {
          setAnnouncements(data.all);
          setCurrentIndex(0);
        } else if (data?.message) {
          // Backwards compat: single-announce response
          setAnnouncements([
            {
              id: 0,
              message: data.message,
              display_style:
                data.display_style ??
                ('scroll' as Announcement['display_style']),
              link: data.link ?? null,
              ends_at: null,
              created_at: new Date().toISOString()
            }
          ]);
          setCurrentIndex(0);
        } else {
          setAnnouncements([]);
          setCurrentIndex(0);
        }
      } catch {
        // Silence failures — the marquee is a fixture, not a feature.
      }
    };
    void load();
    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Refresh the list every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      // Re-fetch without touching state if already loading
      fetch('/api/announcement', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          if (data?.all && Array.isArray(data.all) && data.all.length > 0) {
            setAnnouncements(data.all);
            setCurrentIndex(0);
          } else if (data?.message) {
            setAnnouncements([
              {
                id: 0,
                message: data.message,
                display_style:
                  data.display_style ??
                  ('scroll' as Announcement['display_style']),
                link: data.link ?? null,
                ends_at: null,
                created_at: new Date().toISOString()
              }
            ]);
            setCurrentIndex(0);
          } else {
            setAnnouncements([]);
            setCurrentIndex(0);
          }
        })
        .catch(() => {
          /* ignore */
        });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Rotate through announcements using refs to avoid stale closures
  useEffect(() => {
    function rotate() {
      const list = announceRef.current;
      if (list.length === 0) return;
      const style = list[indexRef.current]?.display_style ?? 'scroll';
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev: number) => (prev + 1) % list.length);
        rotate();
      }, ANIM_DURATION[style]);
    }
    rotate();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
