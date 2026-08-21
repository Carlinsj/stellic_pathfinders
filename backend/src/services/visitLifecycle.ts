import type { SupabaseClient } from '@supabase/supabase-js';

interface AutoCloseScope {
  universityId: string;
  at?: string;
  facilityId?: string;
  userId?: string;
}

export const autoCloseElapsedVisits = async (
  db: SupabaseClient,
  scope: AutoCloseScope,
): Promise<number> => {
  const at = scope.at ?? new Date().toISOString();
  let query = db
    .from('visits')
    .update({
      status: 'auto_closed',
      checked_out_at: at,
      reliability_weight: 0.35,
      updated_at: at,
    })
    .eq('university_id', scope.universityId)
    .eq('status', 'checked_in')
    .lte('auto_close_at', at);

  if (scope.facilityId) query = query.eq('facility_id', scope.facilityId);
  if (scope.userId) query = query.eq('user_id', scope.userId);

  const { data: closedVisits, error } = await query.select('id, university_id, user_id');
  if (error) throw error;
  if (!closedVisits || closedVisits.length === 0) return 0;

  const { error: notificationError } = await db.from('notifications').insert(
    closedVisits.map((visit) => ({
      university_id: visit.university_id,
      user_id: visit.user_id,
      visit_id: visit.id,
      kind: 'auto_checkout',
      body: 'CampusFit automatically closed your visit after the configured grace period.',
      sent_at: at,
    })),
  );
  if (notificationError) throw notificationError;

  return closedVisits.length;
};
