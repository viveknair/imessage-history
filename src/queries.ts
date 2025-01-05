import { Database } from "sqlite3";
import { Message, Handle, Chat } from "./types";

// Helper function to search for a contact
export function findContactByName(
  db: Database,
  name: string
): Promise<Handle[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT DISTINCT
        handle.ROWID as id,
        handle.id as contact_id,
        handle.service
      FROM handle
      JOIN message ON message.handle_id = handle.ROWID
      JOIN chat_handle_join ON chat_handle_join.handle_id = handle.ROWID
      JOIN chat ON chat.ROWID = chat_handle_join.chat_id
      WHERE handle.id LIKE ?
      OR chat.display_name LIKE ?
    `,
      [`%${name}%`, `%${name}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Handle[]);
      }
    );
  });
}

// Get messages with a specific contact
export function getMessagesWithContact(
  db: Database,
  contactId: string,
  limit = 100
): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        message.ROWID as id,
        message.guid,
        message.text,
        message.handle_id,
        message.service,
        datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as formatted_date,
        message.date,
        message.is_from_me,
        message.cache_roomnames,
        handle.id as contact_identifier
      FROM message 
      JOIN handle ON message.handle_id = handle.ROWID
      WHERE handle.id = ?
      ORDER BY message.date DESC
      LIMIT ?
    `,
      [contactId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Message[]);
      }
    );
  });
}

export function getRecentMessages(
  db: Database,
  limit = 100
): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        message.ROWID as id,
        message.guid,
        message.text,
        message.handle_id,
        message.service,
        datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as formatted_date,
        message.date,
        message.is_from_me,
        message.cache_roomnames
      FROM message 
      ORDER BY date DESC 
      LIMIT ?
    `,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Message[]);
      }
    );
  });
}

export function getContactHandles(db: Database): Promise<Handle[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        handle.ROWID as id,
        handle.id as contact_id,
        handle.service
      FROM handle
      ORDER BY handle.id
    `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Handle[]);
      }
    );
  });
}

export function getChats(db: Database): Promise<Chat[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        chat.guid,
        chat.chat_identifier,
        chat.display_name,
        chat.service_name
      FROM chat
      ORDER BY chat.display_name
    `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Chat[]);
      }
    );
  });
}

export function getMessagesByChat(
  db: Database,
  chatGuid: string,
  limit = 100
): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        message.ROWID as id,
        message.guid,
        message.text,
        message.handle_id,
        message.service,
        datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as formatted_date,
        message.date,
        message.is_from_me,
        message.cache_roomnames
      FROM message 
      JOIN chat_message_join ON chat_message_join.message_id = message.ROWID
      WHERE chat_message_join.chat_id = ?
      ORDER BY message.date DESC
      LIMIT ?
    `,
      [chatGuid, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Message[]);
      }
    );
  });
}
