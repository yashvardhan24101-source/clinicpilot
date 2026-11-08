import { PoolClient } from "pg";

export interface ServiceRow {
  id: string;
  clinic_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const servicesRepo = {
  async listServices(client: PoolClient, clinicId: string): Promise<ServiceRow[]> {
    const res = await client.query(
      `SELECT id, clinic_id, name, duration_minutes, price, category, is_active, created_at, updated_at
       FROM services
       WHERE clinic_id = $1
       ORDER BY name ASC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getServiceById(client: PoolClient, clinicId: string, serviceId: string): Promise<ServiceRow | null> {
    const res = await client.query(
      `SELECT id, clinic_id, name, duration_minutes, price, category, is_active, created_at, updated_at
       FROM services
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, serviceId]
    );
    return res.rows[0] || null;
  },
};
