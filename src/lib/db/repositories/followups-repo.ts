import { PoolClient } from "pg";

export interface FollowupRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  rule_id?: string | null;
  due_date: string;
  status: string;
  notes?: string | null;
  snoozed_until?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  patient_name?: string;
  patient_phone?: string;
}

export const followupsRepo = {
  async listDueFollowups(client: PoolClient, clinicId: string): Promise<FollowupRow[]> {
    const res = await client.query(
      `SELECT 
        f.id, f.clinic_id, f.patient_id, f.rule_id, f.due_date, f.status,
        f.notes, f.snoozed_until, f.sent_at, f.created_at, f.updated_at,
        p.name AS patient_name, p.phone AS patient_phone
      FROM followups f
      JOIN patients p ON f.patient_id = p.id
      WHERE f.clinic_id = $1
        AND f.status = 'pending'
        AND (f.snoozed_until IS NULL OR f.snoozed_until <= now())
      ORDER BY f.due_date ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async updateFollowup(
    client: PoolClient,
    clinicId: string,
    followupId: string,
    data: Partial<FollowupRow>
  ): Promise<FollowupRow | null> {
    const res = await client.query(
      `UPDATE followups
       SET status = COALESCE($3, status),
           notes = COALESCE($4, notes),
           snoozed_until = COALESCE($5, snoozed_until),
           sent_at = COALESCE($6, sent_at),
           updated_at = now()
       WHERE clinic_id = $1 AND id = $2
       RETURNING id, clinic_id, patient_id, rule_id, due_date, status, notes, snoozed_until, sent_at, created_at, updated_at;`,
      [
        clinicId,
        followupId,
        data.status ?? null,
        data.notes ?? null,
        data.snoozed_until ?? null,
        data.sent_at ?? null,
      ]
    );
    return res.rows[0] || null;
  },
};
