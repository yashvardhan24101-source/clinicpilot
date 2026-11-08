import { PoolClient } from "pg";

export interface ConversationRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  state: string;
  last_message?: string | null;
  last_message_time?: string | null;
  unread_count: number;
  created_at: string;
  // Join
  patient_name?: string;
  patient_phone?: string;
}

export interface MessageRow {
  id: string;
  clinic_id: string;
  conversation_id: string;
  sender: string;
  content: string;
  delivery_status: string;
  created_at: string;
}

export const conversationsRepo = {
  async listConversations(client: PoolClient, clinicId: string): Promise<ConversationRow[]> {
    const res = await client.query(
      `SELECT c.id, c.clinic_id, c.patient_id, c.state, c.last_message, c.last_message_time, c.unread_count, c.created_at,
              p.name AS patient_name, p.phone AS patient_phone
       FROM conversations c
       JOIN patients p ON c.patient_id = p.id
       WHERE c.clinic_id = $1
       ORDER BY c.last_message_time DESC;`,
      [clinicId]
    );
    return res.rows;
  },

  async getConversationById(
    client: PoolClient,
    clinicId: string,
    conversationId: string
  ): Promise<ConversationRow | null> {
    const res = await client.query(
      `SELECT c.id, c.clinic_id, c.patient_id, c.state, c.last_message, c.last_message_time, c.unread_count, c.created_at,
              p.name AS patient_name, p.phone AS patient_phone
       FROM conversations c
       JOIN patients p ON c.patient_id = p.id
       WHERE c.clinic_id = $1 AND c.id = $2;`,
      [clinicId, conversationId]
    );
    return res.rows[0] || null;
  },

  async listMessages(
    client: PoolClient,
    clinicId: string,
    conversationId: string
  ): Promise<MessageRow[]> {
    const res = await client.query(
      `SELECT id, clinic_id, conversation_id, sender, content, delivery_status, created_at
       FROM messages
       WHERE clinic_id = $1 AND conversation_id = $2
       ORDER BY created_at ASC;`,
      [clinicId, conversationId]
    );
    return res.rows;
  },

  async createMessage(
    client: PoolClient,
    clinicId: string,
    data: {
      conversation_id: string;
      sender: "patient" | "bot" | "staff";
      content: string;
    }
  ): Promise<MessageRow> {
    const res = await client.query(
      `INSERT INTO messages (clinic_id, conversation_id, sender, content, delivery_status)
       VALUES ($1, $2, $3, $4, 'delivered')
       RETURNING id, clinic_id, conversation_id, sender, content, delivery_status, created_at;`,
      [clinicId, data.conversation_id, data.sender, data.content]
    );

    // Update last_message on conversation
    await client.query(
      `UPDATE conversations
       SET last_message = $3, last_message_time = now()
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, data.conversation_id, data.content]
    );

    return res.rows[0];
  },
};
