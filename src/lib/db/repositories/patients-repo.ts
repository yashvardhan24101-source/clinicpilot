import { PoolClient } from "pg";

export interface PatientRow {
  id: string;
  clinic_id: string;
  name: string;
  phone: string;
  language: string;
  total_visits: number;
  last_visit?: string | null;
  created_at: string;
}

export const patientsRepo = {
  async listPatients(client: PoolClient, clinicId: string, search?: string): Promise<PatientRow[]> {
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const res = await client.query(
        `SELECT id, clinic_id, name, phone, language, total_visits, last_visit, created_at
         FROM patients
         WHERE clinic_id = $1 AND (name ILIKE $2 OR phone ILIKE $2)
         ORDER BY name ASC;`,
        [clinicId, term]
      );
      return res.rows;
    }

    const res = await client.query(
      `SELECT id, clinic_id, name, phone, language, total_visits, last_visit, created_at
       FROM patients
       WHERE clinic_id = $1
       ORDER BY name ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getPatientById(client: PoolClient, clinicId: string, patientId: string): Promise<PatientRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, name, phone, language, total_visits, last_visit, created_at
       FROM patients
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, patientId]
    );
    return res.rows[0] || null;
  },

  async createPatient(
    client: PoolClient,
    clinicId: string,
    data: { name: string; phone: string; language?: string }
  ): Promise<PatientRow> {
    const res = await client.query(
      `INSERT INTO patients (clinic_id, name, phone, language)
       VALUES ($1, $2, $3, COALESCE($4, 'en'))
       RETURNING id, clinic_id, name, phone, language, total_visits, last_visit, created_at;`,
      [clinicId, data.name, data.phone, data.language ?? null]
    );
    return res.rows[0];
  },

  async updatePatient(
    client: PoolClient,
    clinicId: string,
    patientId: string,
    data: Partial<PatientRow>
  ): Promise<PatientRow | null> {
    const res = await client.query(
      `UPDATE patients
       SET name = COALESCE($3, name),
           phone = COALESCE($4, phone),
           language = COALESCE($5, language)
       WHERE clinic_id = $1 AND id = $2
       RETURNING id, clinic_id, name, phone, language, total_visits, last_visit, created_at;`,
      [clinicId, patientId, data.name ?? null, data.phone ?? null, data.language ?? null]
    );
    return res.rows[0] || null;
  },
};
