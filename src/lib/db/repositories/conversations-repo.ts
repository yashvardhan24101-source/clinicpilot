import { PoolClient } from "pg";

export interface ConversationRow {
  id: string;
  clinic_id: string;
  patient_id?: string | null;
  patient_phone: string;
  patient_name?: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  clinic_id: string;
  conversation_id: string;
  sender_type: string;
  sender_id?: string | null;
  content: string;
  media_url?: string | null;
  status: string;
  created_at: string;
}

export const conversationsRepo = {
  async listConversations(client: PoolClient, clinicId: string): Promise<ConversationRow[]> {
    const res = await client.query(
      `SELECT id, clinic_id, patient_id, patient_phone, patient_name, status, last_message_at, created_at, updated_at
       FROM conversations
       WHERE clinic_id = $1
       ORDER BY last_message_at DESC;`,
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
      `SELECT id, clinic_id, patient_id, patient_phone, patient_name, status, last_message_at, created_at, updated_at
       FROM conversations
       WHERE clinic_id = $1 AND id = $2;`,
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
      `SELECT id, clinic_id, conversation_id, sender_type, sender_id, content, media_url, status, created_at
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
      sender_type: string;
      sender_id?: string | null;
      content: string;
      media_url?: string | null;
    }
  ): Promise<MessageRow> {
    const res = await client.query(
      `INSERT INTO messages (clinic_id, conversation_id, sender_type, sender_id, content, media_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'delivered')
       RETURNING id, clinic_id, conversation_id, sender_type, sender_id, content, media_url, status, created_at;`,
      [
        clinicId,
        data.conversation_id,
        data.sender_type,
        data.sender_id ?? null,
        data.content,
        data.media_url ?? null,
      ]
    );

    // Update last_message_at on the conversation
    await client.query(
      `UPDATE conversations
       SET last_message_at = now(), updated_at = now()
       WHERE clinic_id = $1 AND id = $2;`,
      [clinicId, data.conversation_id]
    );

    return res.rows[0];
  },
};
