declare module "node-mac-contacts" {
  export interface Contact {
    fullName?: string;
    phoneNumbers?: string[];
    emailAddresses?: string[];
    birthday?: string;
    identifier?: string;
    givenName?: string;
    familyName?: string;
  }

  export interface ContactsAPI {
    listener: {
      setup(): void;
      remove(): void;
      isListening(): boolean;
    };
    requestAccess(): Promise<boolean>;
    getAuthStatus(): Promise<string>;
    getAllContacts(): Promise<Contact[]>;
    getContactsByName(name: string): Promise<Contact[]>;
    addNewContact(contact: Contact): Promise<boolean>;
    deleteContact(contact: Contact): Promise<boolean>;
    updateContact(contact: Contact): Promise<boolean>;
  }

  const api: ContactsAPI;
  export default api;
}
