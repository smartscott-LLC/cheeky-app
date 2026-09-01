import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { Database } from '@/types_db';

type Client = SupabaseClient<Database, 'public', Database['public']>;

export const getUser = cache(async (supabase: Client) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: Client) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  return subscription;
});

export const getProducts = cache(async (supabase: Client) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

export const getUserDetails = cache(async (supabase: Client) => {
  const { data: userDetails } = await supabase
    .from('users')
    .select('*')
    .single();
  return userDetails;
});

export const getProfile = cache(async (supabase: Client, userId: string) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return profile;
});

export const getTokenBalance = cache(async (supabase: Client) => {
  const { data: rows } = await supabase.from('token_ledger').select('delta');
  return (rows ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0);
});
