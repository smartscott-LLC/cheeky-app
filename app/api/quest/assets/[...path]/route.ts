import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ioqeddpgdilyyajsygmz.supabase.co';
const BUCKET = 'quest-assets';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }
  
  const decoded = decodeURIComponent(path.join('/'));
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/assets/${decoded}`;
  return NextResponse.redirect(url);
}
