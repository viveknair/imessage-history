import { Database } from "better-sqlite3";
import { Message, Handle, Chat } from "./types";

// Helper function to search for a contact
export async function findContactByName(
  db: Database,
  name: string
): Promise<Handle[]> {
  // @ts-ignore
  return db
    .prepare(
      `
    SELECT DISTINCT 
      handle.ROWID as id,
      handle.id as contact_id,
      handle.service
    FROM handle
    LEFT JOIN chat_handle_join ON chat_handle_join.handle_id = handle.ROWID
    LEFT JOIN chat ON chat.ROWID = chat_handle_join.chat_id
    WHERE 
      handle.id LIKE ? OR
      chat.display_name LIKE ?
  `
    )
    .all(`%${name}%`, `%${name}%`);
}

// Get all messages with a specific contact
export async function getMessagesWithContact(
  db: Database,
  contactId: string,
  limit = 1000
): Promise<Message[]> {
  // @ts-ignore
  return db
    .prepare(
      `
    SELECT 
      message.ROWID as id,
      message.guid,
      message.text,
      message.handle_id,
      message.service,
      datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as date,
      message.is_from_me,
      message.cache_roomnames,
      handle.id as contact_id
    FROM message 
    JOIN handle ON handle.ROWID = message.handle_id
    WHERE handle.id = ?
    ORDER BY message.date DESC
    LIMIT ?
  `
    )
    .all(contactId, limit);
}

// Get all contact handles
export async function getContactHandles(db: Database): Promise<Handle[]> {
  // @ts-ignore
  return db
    .prepare(
      `
    SELECT 
      ROWID as id,
      guid,
      service
    FROM handle
    ORDER BY id
  `
    )
    .all();
}

// Get all chats
export async function getChats(db: Database): Promise<Chat[]> {
  // @ts-ignore
  return db
    .prepare(
      `
    SELECT 
      chat.guid,
      chat.chat_identifier,
      chat.display_name,
      chat.service_name
    FROM chat
    ORDER BY chat.display_name
  `
    )
    .all();
}

// Get messages by chat
export async function getMessagesByChat(
  db: Database,
  chatGuid: string,
  limit = 100
): Promise<Message[]> {
  // @ts-ignore
  return db
    .prepare(
      `
    SELECT 
      message.ROWID as id,
      message.guid,
      message.text,
      message.handle_id,
      message.service,
      datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as date,
      message.is_from_me,
      message.cache_roomnames,
      handle.id as contact_id
    FROM message 
    JOIN chat_message_join ON chat_message_join.message_id = message.ROWID
    JOIN handle ON handle.ROWID = message.handle_id
    WHERE chat_message_join.chat_id = ?
    ORDER BY message.date DESC
    LIMIT ?
  `
    )
    .all(chatGuid, limit);
}
