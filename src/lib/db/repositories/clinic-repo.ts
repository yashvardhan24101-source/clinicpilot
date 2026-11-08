import { PoolClient } from "pg";

export interface ClinicRow {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city: string;
  pincode?: string | null;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export const clinicRepo = {
  async getClinicById(client: PoolClient, clinicId: string): Promise<ClinicRow | null> {
    const res = await client.query(
      `SELECT id, name, slug, short_code, phone, email, address, city, pincode, settings, created_at, updated_at
       FROM clinics
       WHERE id = $1;`,
      [clinicId]
    );
    return res.rows[0] || null;
  },

  async listAllClinics(client: PoolClient): Promise<ClinicRow[]> {
    const res = await client.query(
      `SELECT id, name, slug, short_code, phone, email, address, city, pincode, settings, created_at, updated_at
       FROM clinics
       ORDER BY name ASC;`
    );
    return res.rows;
  },

  async updateClinic(client: PoolClient, clinicId: string, data: Partial<ClinicRow>): Promise<ClinicRow | null> {
    const res = await client.query(
      `UPDATE clinics
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           pincode = COALESCE($7, pincode),
           settings = COALESCE($8, settings),
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, slug, short_code, phone, email, address, city, pincode, settings, created_at, updated_at;`,
      [
        clinicId,
        data.name ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.address ?? null,
        data.city ?? null,
        data.pincode ?? null,
        data.settings ? JSON.stringify(data.settings) : null,
      ]
    );
    return res.rows[0] || null;
  },
};
