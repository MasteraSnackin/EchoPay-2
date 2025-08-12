import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import type { Contact } from '../ContactList';

const fuseOptions: IFuseOptions<Contact> = {
  includeScore: true,
  threshold: 0.35,
  keys: [
    { name: 'name', weight: 0.8 },
    { name: 'address', weight: 0.2 },
  ],
};

export function createContactSearcher(contacts: Contact[]) {
  const fuse = new Fuse(contacts, fuseOptions);
  return {
    searchByNameOrAddress(query: string): Contact | null {
      if (!query) return null;
      const results = fuse.search(query);
      if (results.length === 0) return null;
      return results[0].item;
    },
  };
}