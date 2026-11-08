import { PoolClient } from "pg";

export interface StaffUserRow {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const staffRepo = {
  async listStaff(client: PoolClient, clinicId: string): Promise<StaffUserRow[]> {
    const res = await client.query(
      `SELECT id, clinic_id, name, email, phone, role, is_active, created_at, updated_at
       FROM staff_users
       WHERE clinic_id = $1
       ORDER BY name ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getStaffById(client: PoolClient, clinicId: string, staffId: string): Promise<StaffUserRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, name, email, phone, role, is_active, created_at, updated_at
       FROM staff_users
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, staffId]
    );
    return res.rows[0] || null;
  },

  async createStaff(
    client: PoolClient,
    clinicId: string,
    data: { name: string; email: string; phone?: string; role: string; password_hash: string }
  ): Promise<StaffUserRow> {
    const res = await client.query(
      `INSERT INTO staff_users (clinic_id, name, email, phone, role, password_hash)
       VALUES ($1, $2, lower($3), $4, $5, $6)
       RETURNING id, clinic_id, name, email, phone, role, is_active, created_at, updated_at;`,
      [clinicId, data.name, data.email, data.phone ?? null, data.role, data.password_hash]
    );
    return res.rows[0];
  },
};
