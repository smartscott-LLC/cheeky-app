'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Redeems a swag code. Runs as the signed-in member through the
 * authenticated RPC — the engine validates the code, applies the benefit,
 * and writes the audit row.
 */
export async function redeemSwagCode(code: string): Promise<{
  ok?: boolean;
  benefitType?: string;
  benefitValue?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('redeem_swag_code', {
    p_code: code
  });
  if (error) return { error: error.message };
  return {
    ok: true,
    benefitType: data?.[0]?.benefit_type,
    benefitValue: data?.[0]?.benefit_value
  };
}
