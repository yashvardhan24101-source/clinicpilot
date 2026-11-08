import { PoolClient } from "pg";

export interface DoctorRow {
  id: string;
  clinic_id: string;
  name: string;
  specialty: string;
  phone?: string | null;
  email?: string | null;
  registration_number?: string | null;
  color?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const doctorsRepo = {
  async listDoctors(client: PoolClient, clinicId: string): Promise<DoctorRow[]> {
    const res = await client.query(
      `SELECT id, clinic_id, name, specialty, phone, email, registration_number, color, is_active, created_at, updated_at
       FROM doctors
       WHERE clinic_id = $1
       ORDER BY name ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getDoctorById(client: PoolClient, clinicId: string, doctorId: string): Promise<DoctorRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, name, specialty, phone, email, registration_number, color, is_active, created_at, updated_at
       FROM doctors
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, doctorId]
    );
    return res.rows[0] || null;
  },

  async createDoctor(
    client: PoolClient,
    clinicId: string,
    data: { name: string; specialty: string; phone?: string; email?: string; registration_number?: string; color?: string }
  ): Promise<DoctorRow> {
    const res = await client.query(
      `INSERT INTO doctors (clinic_id, name, specialty, phone, email, registration_number, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, clinic_id, name, specialty, phone, email, registration_number, color, is_active, created_at, updated_at;`,
      [clinicId, data.name, data.specialty, data.phone ?? null, data.email ?? null, data.registration_number ?? null, data.color ?? null]
    );
    return res.rows[0];
  },
};
