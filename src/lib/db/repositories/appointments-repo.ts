import { PoolClient } from "pg";

export interface AppointmentRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  service_id?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  source: string;
  token_number?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  patient_name?: string;
  patient_phone?: string;
  doctor_name?: string;
  service_name?: string;
}

export interface AppointmentFilters {
  doctorId?: string | null;
  status?: string | null;
  date?: string | null; // YYYY-MM-DD
}

export const appointmentsRepo = {
  async listAppointments(
    client: PoolClient,
    clinicId: string,
    filters?: AppointmentFilters
  ): Promise<AppointmentRow[]> {
    let query = `
      SELECT 
        a.id, a.clinic_id, a.patient_id, a.doctor_id, a.service_id,
        a.scheduled_start, a.scheduled_end, a.status, a.source, a.token_number,
        a.notes, a.created_at, a.updated_at,
        p.name AS patient_name, p.phone AS patient_phone,
        d.name AS doctor_name,
        s.name AS service_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.clinic_id = $1
    `;
    const params: any[] = [clinicId];

    if (filters?.doctorId && filters.doctorId !== "all") {
      params.push(filters.doctorId);
      query += ` AND a.doctor_id = $${params.length}`;
    }

    if (filters?.status && filters.status !== "all") {
      params.push(filters.status);
      query += ` AND a.status = $${params.length}`;
    }

    if (filters?.date) {
      params.push(filters.date);
      query += ` AND (a.scheduled_start::date = $${params.length}::date)`;
    }

    query += ` ORDER BY a.scheduled_start ASC;`;

    const res = await client.query(query, params);
    return res.rows;
  },

  async getAppointmentById(
    client: PoolClient,
    clinicId: string,
    appointmentId: string
  ): Promise<AppointmentRow | null> {
    const res = await client.query(
      `SELECT 
        a.id, a.clinic_id, a.patient_id, a.doctor_id, a.service_id,
        a.scheduled_start, a.scheduled_end, a.status, a.source, a.token_number,
        a.notes, a.created_at, a.updated_at,
        p.name AS patient_name, p.phone AS patient_phone,
        d.name AS doctor_name,
        s.name AS service_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.clinic_id = $1 AND a.id = $2;`,
      [clinicId, appointmentId]
    );
    return res.rows[0] || null;
  },

  async createAppointment(
    client: PoolClient,
    clinicId: string,
    data: {
      patient_id: string;
      doctor_id: string;
      service_id?: string | null;
      scheduled_start: string;
      scheduled_end: string;
      status?: string;
      source?: string;
      token_number?: number | null;
      notes?: string | null;
    }
  ): Promise<AppointmentRow> {
    const res = await client.query(
      `INSERT INTO appointments (
        clinic_id, patient_id, doctor_id, service_id, scheduled_start,
        scheduled_end, status, source, token_number, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'booked'), COALESCE($8, 'walkin'), $9, $10)
      RETURNING id, clinic_id, patient_id, doctor_id, service_id, scheduled_start,
                scheduled_end, status, source, token_number, notes, created_at, updated_at;`,
      [
        clinicId,
        data.patient_id,
        data.doctor_id,
        data.service_id ?? null,
        data.scheduled_start,
        data.scheduled_end,
        data.status ?? null,
        data.source ?? null,
        data.token_number ?? null,
        data.notes ?? null,
      ]
    );
    return res.rows[0];
  },

  async updateAppointment(
    client: PoolClient,
    clinicId: string,
    appointmentId: string,
    data: Partial<AppointmentRow>
  ): Promise<AppointmentRow | null> {
    const res = await client.query(
      `UPDATE appointments
       SET status = COALESCE($3, status),
           scheduled_start = COALESCE($4, scheduled_start),
           scheduled_end = COALESCE($5, scheduled_end),
           token_number = COALESCE($6, token_number),
           notes = COALESCE($7, notes),
           updated_at = now()
       WHERE clinic_id = $1 AND id = $2
       RETURNING id, clinic_id, patient_id, doctor_id, service_id, scheduled_start,
                 scheduled_end, status, source, token_number, notes, created_at, updated_at;`,
      [
        clinicId,
        appointmentId,
        data.status ?? null,
        data.scheduled_start ?? null,
        data.scheduled_end ?? null,
        data.token_number ?? null,
        data.notes ?? null,
      ]
    );
    return res.rows[0] || null;
  },

  async deleteAppointment(
    client: PoolClient,
    clinicId: string,
    appointmentId: string
  ): Promise<boolean> {
    const res = await client.query(
      `DELETE FROM appointments WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, appointmentId]
    );
    return (res.rowCount ?? 0) > 0;
  },
};
