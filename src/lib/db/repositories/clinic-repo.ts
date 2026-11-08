import { PoolClient } from "pg";

export interface ClinicRow {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  city: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export const clinicRepo = {
  async getClinicById(client: PoolClient, clinicId: string): Promise<ClinicRow | null> {
    const res = await client.query(
      `SELECT id, name, slug, short_code, city, timezone, created_at, updated_at
       FROM clinics
       WHERE id = $1;`,
      [clinicId]
    );
    return res.rows[0] || null;
  },

  async listAllClinics(client: PoolClient): Promise<ClinicRow[]> {
    const res = await client.query(
      `SELECT id, name, slug, short_code, city, timezone, created_at, updated_at
       FROM clinics
       ORDER BY name ASC;`
    );
    return res.rows;
  },

  async updateClinic(client: PoolClient, clinicId: string, data: Partial<ClinicRow>): Promise<ClinicRow | null> {
    const res = await client.query(
      `UPDATE clinics
       SET name = COALESCE($2, name),
           city = COALESCE($3, city),
           timezone = COALESCE($4, timezone),
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, slug, short_code, city, timezone, created_at, updated_at;`,
      [clinicId, data.name ?? null, data.city ?? null, data.timezone ?? null]
    );
    return res.rows[0] || null;
  },
};
