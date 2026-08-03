// Supabase renamed its keys: anon → "publishable", service_role → "secret".
// The dashboard/integration may generate either name, so resolve both. The
// values are identical — only the variable names changed.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';
