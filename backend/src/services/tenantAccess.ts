import type { SupabaseClient } from '@supabase/supabase-js';

export async function requireTenantAccess(
  supabase: SupabaseClient,
  userId: string,
  tenantSlug: string,
  expectedUniversityId: string,
) {
  const { data: university, error: universityError } = await supabase
    .from('universities')
    .select('*')
    .eq('slug', tenantSlug)
    .eq('id', expectedUniversityId)
    .eq('active', true)
    .single();

  if (universityError || !university) {
    throw new Error('Tenant not found');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  if (profile.university_id !== university.id) {
    throw new Error('Tenant access denied');
  }

  return {
    university,
    profile,
  };
}