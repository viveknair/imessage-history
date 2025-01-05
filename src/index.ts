import { connectToIMessageDB } from "./db";
import { findContactByName, getMessagesWithContact } from "./queries";

async function main() {
  // @ts-ignore
  const db = connectToIMessageDB();

  try {
    console.log('🔍 Searching for messages with "Nandika"...');
    // @ts-ignore
    const contacts = await findContactByName(db, "Nandika");

    if (contacts.length === 0) {
      console.log("No contacts found matching that name");
      return;
    }

    console.log(`Found ${contacts.length} matching contacts`);

    for (const contact of contacts) {
      console.log(`\nMessages with ${contact.id}:`);
      // @ts-ignore
      const messages = await getMessagesWithContact(db, contact.id);

      // @ts-ignore
      messages.forEach((msg) => {
        const date = new Date(msg.date).toLocaleString();
        const direction = msg.is_from_me ? "→" : "←";
        console.log(`[${date}] ${direction} ${msg.text || "[no text]"}`);
      });
    }
  } finally {
    db.close();
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}
