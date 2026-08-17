import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap } from './apiClient.js';

export async function getCreditOverview() {
  const [learners, transactions, resetRuns] = await Promise.all([
    getSupabase()
      .from('learners')
      .select('id,first_name,last_name,profession,apprenticeship_year,credit_balance,active')
      .order('last_name'),
    getSupabase()
      .from('credit_transactions')
      .select('*,learners(first_name,last_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    getSupabase()
      .from('credit_reset_runs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(20),
  ]);
  return {
    learners: unwrap(learners),
    transactions: unwrap(transactions),
    resetRuns: unwrap(resetRuns),
  };
}

export async function resetAllCredits() {
  return unwrap(await getSupabase().rpc('admin_reset_all_credits'));
}

export async function adjustLearnerCredits(learnerId, newBalance, note) {
  return unwrap(
    await getSupabase().rpc('admin_adjust_learner_credits', {
      p_learner_id: learnerId,
      p_new_balance: Number(newBalance),
      p_note: note,
    }),
  );
}
