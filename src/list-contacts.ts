import { connectToIMessageDB } from "./db.js";

export async function listContacts() {
  const db = connectToIMessageDB();

  try {
    const contacts = db
      .prepare(
        `
        SELECT 
          handle.id,
          COUNT(DISTINCT message.ROWID) as message_count,
          MAX(datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')) as last_message
        FROM handle
        JOIN message ON message.handle_id = handle.ROWID
        GROUP BY handle.id
        ORDER BY message_count DESC
      `
      )
      .all() as { id: string; message_count: number; last_message: string }[];

    console.log(
      `\n📱 Found ${contacts.length} contacts with message history:\n`
    );
    contacts.forEach((contact) => {
      console.log(`${contact.id}`);
      console.log(`  Messages: ${contact.message_count}`);
      console.log(
        `  Last message: ${new Date(contact.last_message).toLocaleString()}\n`
      );
    });
  } finally {
    db.close();
  }
}

// Default export for backward compatibility
export default listContacts;
