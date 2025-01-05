import { connectToIMessageDB } from "./db";
import { findContactByName, getMessagesWithContact } from "./queries";

async function main() {
  try {
    const db = await connectToIMessageDB();
    const searchName = "Nandika";

    // Find contact
    console.log(`🔍 Searching for contact with name: ${searchName}...`);
    const contacts = await findContactByName(db, searchName);

    if (contacts.length === 0) {
      console.log("❌ No contacts found with that name");
      db.close();
      return;
    }

    console.log("✅ Found contacts:", contacts);

    // Get messages for each matching contact
    for (const contact of contacts) {
      console.log(`\n💬 Fetching messages with ${contact.contact_id}...`);
      const messages = await getMessagesWithContact(db, contact.contact_id);

      console.log(`Found ${messages.length} messages:`);
      messages.forEach((msg) => {
        const direction = msg.is_from_me ? "→" : "←";
        console.log(
          `${msg.formatted_date} ${direction} ${msg.text || "[media message]"}`
        );
      });
    }

    db.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
