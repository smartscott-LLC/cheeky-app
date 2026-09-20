import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ioqeddpgdilyyajsygmz.supabase.co';
const BUCKET = 'quest-assets';

export async function GET(request: Request, { params }: { params: Promise<{ path: string }> }) {
  const { path: filePath } = await params;
  const decoded = decodeURIComponent(filePath);
  
  // Redirect to Supabase Storage
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/assets/${decoded}`;
  return NextResponse.redirect(url);
}
