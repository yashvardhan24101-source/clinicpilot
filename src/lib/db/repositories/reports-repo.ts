import { PoolClient } from "pg";

export interface ReportRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  title: string;
  category: string;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  patient_dob?: string | null;
  uploaded_at: string;
}

export const reportsRepo = {
  async listReports(
    client: PoolClient,
    clinicId: string,
    patientId?: string
  ): Promise<ReportRow[]> {
    if (patientId) {
      const res = await client.query(
        `SELECT id, clinic_id, patient_id, title, category, file_name, file_size_bytes, storage_path, patient_dob, uploaded_at
         FROM reports
         WHERE clinic_id = $1 AND patient_id = $2
         ORDER BY uploaded_at DESC;`,
        [clinicId, patientId]
      );
      return res.rows;
    }

    const res = await client.query(
      `SELECT id, clinic_id, patient_id, title, category, file_name, file_size_bytes, storage_path, patient_dob, uploaded_at
         FROM reports
         WHERE clinic_id = $1
         ORDER BY uploaded_at DESC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getReportById(
    client: PoolClient,
    clinicId: string,
    reportId: string
  ): Promise<ReportRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, patient_id, title, category, file_name, file_size_bytes, storage_path, patient_dob, uploaded_at
       FROM reports
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, reportId]
    );
    return res.rows[0] || null;
  },
};
