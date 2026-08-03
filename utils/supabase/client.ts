import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';
import { supabaseUrl, supabaseAnonKey } from '@/utils/supabase/keys';

// Define a function to create a Supabase client for client-side operations
export const createClient = () =>
  createBrowserClient<Database>(
    // Pass Supabase URL and anonymous key from the environment to the client
    supabaseUrl,
    supabaseAnonKey
  );
