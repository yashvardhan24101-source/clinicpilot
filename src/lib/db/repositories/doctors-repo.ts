import { PoolClient } from "pg";

export interface DoctorRow {
  id: string;
  clinic_id: string;
  name: string;
  specialty: string;
  qualifications?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  video_fee?: number | null;
  color_tag: string;
  active: boolean;
  phone?: string | null;
  created_at: string;
}

export const doctorsRepo = {
  async listDoctors(client: PoolClient, clinicId: string): Promise<DoctorRow[]> {
    const res = await client.query(
      `SELECT id, clinic_id, name, specialty, qualifications, experience_years, consultation_fee, video_fee, color_tag, active, phone, created_at
       FROM doctors
       WHERE clinic_id = $1
       ORDER BY name ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getDoctorById(client: PoolClient, clinicId: string, doctorId: string): Promise<DoctorRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, name, specialty, qualifications, experience_years, consultation_fee, video_fee, color_tag, active, phone, created_at
       FROM doctors
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, doctorId]
    );
    return res.rows[0] || null;
  },

  async createDoctor(
    client: PoolClient,
    clinicId: string,
    data: {
      name: string;
      specialty: string;
      qualifications?: string;
      experience_years?: number;
      consultation_fee?: number;
      video_fee?: number;
      color_tag?: string;
      phone?: string;
    }
  ): Promise<DoctorRow> {
    const res = await client.query(
      `INSERT INTO doctors (clinic_id, name, specialty, qualifications, experience_years, consultation_fee, video_fee, color_tag, phone)
       VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, '#3B82F6'), $9)
       RETURNING id, clinic_id, name, specialty, qualifications, experience_years, consultation_fee, video_fee, color_tag, active, phone, created_at;`,
      [
        clinicId,
        data.name,
        data.specialty,
        data.qualifications ?? null,
        data.experience_years ?? null,
        data.consultation_fee ?? null,
        data.video_fee ?? null,
        data.color_tag ?? null,
        data.phone ?? null,
      ]
    );
    return res.rows[0];
  },
};
