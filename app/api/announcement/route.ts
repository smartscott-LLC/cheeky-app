import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface AnnouncementRow {
  id: number;
  message: string | null;
  display_style: 'scroll' | 'roll' | 'fade';
  link: string | null;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  created_at: string;
}

/** Fetch all active announcements, ordered newest-first. */
export async function GET() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = (await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(5)) as { data: AnnouncementRow[] | null };

  if (!data || data.length === 0) {
    return NextResponse.json({
      message: null,
      display_style: 'scroll' as const,
      link: null
    });
  }

  // Return the newest one as the "primary" (for backwards compat with single-announce callers)
  const primary = data[0];
  return NextResponse.json({
    message: primary.message,
    display_style: primary.display_style as 'scroll' | 'roll' | 'fade',
    link: primary.link,
    all: data.map((a) => ({
      id: a.id,
      message: a.message,
      display_style: a.display_style,
      link: a.link,
      ends_at: a.ends_at,
      created_at: a.created_at
    }))
  });
}
