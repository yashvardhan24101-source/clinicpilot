import { PoolClient } from "pg";

export interface FollowupRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id?: string | null;
  last_visit_date: string;
  due_date: string;
  status: string;
  created_at: string;
  // Joins
  patient_name?: string;
  patient_phone?: string;
}

export const followupsRepo = {
  async listDueFollowups(client: PoolClient, clinicId: string): Promise<FollowupRow[]> {
    const res = await client.query(
      `SELECT 
        f.id, f.clinic_id, f.patient_id, f.service_id, f.last_visit_date, f.due_date, f.status, f.created_at,
        p.name AS patient_name, p.phone AS patient_phone
      FROM followups f
      JOIN patients p ON f.patient_id = p.id
      WHERE f.clinic_id = $1
        AND f.status = 'due'
      ORDER BY f.due_date ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async updateFollowup(
    client: PoolClient,
    clinicId: string,
    followupId: string,
    data: { status: "due" | "sent" | "snoozed"; due_date?: string }
  ): Promise<FollowupRow | null> {
    const res = await client.query(
      `UPDATE followups
       SET status = COALESCE($3, status),
           due_date = COALESCE($4, due_date)
       WHERE clinic_id = $1 AND id = $2
       RETURNING id, clinic_id, patient_id, service_id, last_visit_date, due_date, status, created_at;`,
      [clinicId, followupId, data.status ?? null, data.due_date ?? null]
    );
    return res.rows[0] || null;
  },
};
