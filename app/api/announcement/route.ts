import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** The currently-live announcement, or null. Public read. */
export async function GET() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('announcements')
    .select('message, display_style, link')
    .eq('active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    message: data?.message ?? null,
    display_style: data?.display_style ?? 'scroll',
    link: data?.link ?? null
  });
}
