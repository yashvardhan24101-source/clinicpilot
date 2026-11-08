import { PoolClient } from "pg";

export interface PatientRow {
  id: string;
  clinic_id: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  age?: number | null;
  blood_group?: string | null;
  medical_history?: any;
  created_at: string;
  updated_at: string;
}

export const patientsRepo = {
  async listPatients(client: PoolClient, clinicId: string, search?: string): Promise<PatientRow[]> {
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const res = await client.query(
        `SELECT id, clinic_id, name, phone, email, gender, age, blood_group, medical_history, created_at, updated_at
         FROM patients
         WHERE clinic_id = $1 AND (name ILIKE $2 OR phone ILIKE $2)
         ORDER BY name ASC;`,
        [clinicId, term]
      );
      return res.rows;
    }

    const res = await client.query(
      `SELECT id, clinic_id, name, phone, email, gender, age, blood_group, medical_history, created_at, updated_at
       FROM patients
       WHERE clinic_id = $1
       ORDER BY name ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getPatientById(client: PoolClient, clinicId: string, patientId: string): Promise<PatientRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, name, phone, email, gender, age, blood_group, medical_history, created_at, updated_at
       FROM patients
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, patientId]
    );
    return res.rows[0] || null;
  },

  async createPatient(
    client: PoolClient,
    clinicId: string,
    data: { name: string; phone: string; email?: string; gender?: string; age?: number; blood_group?: string; medical_history?: any }
  ): Promise<PatientRow> {
    const res = await client.query(
      `INSERT INTO patients (clinic_id, name, phone, email, gender, age, blood_group, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, clinic_id, name, phone, email, gender, age, blood_group, medical_history, created_at, updated_at;`,
      [
        clinicId,
        data.name,
        data.phone,
        data.email ?? null,
        data.gender ?? null,
        data.age ?? null,
        data.blood_group ?? null,
        data.medical_history ? JSON.stringify(data.medical_history) : null,
      ]
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
           email = COALESCE($5, email),
           gender = COALESCE($6, gender),
           age = COALESCE($7, age),
           blood_group = COALESCE($8, blood_group),
           medical_history = COALESCE($9, medical_history),
           updated_at = now()
       WHERE clinic_id = $1 AND id = $2
       RETURNING id, clinic_id, name, phone, email, gender, age, blood_group, medical_history, created_at, updated_at;`,
      [
        clinicId,
        patientId,
        data.name ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.gender ?? null,
        data.age ?? null,
        data.blood_group ?? null,
        data.medical_history ? JSON.stringify(data.medical_history) : null,
      ]
    );
    return res.rows[0] || null;
  },
};
