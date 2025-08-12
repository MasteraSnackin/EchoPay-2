import { describe, it, expect } from 'vitest';
import { createContactSearcher } from '../../utils/contacts';
import type { Contact } from '../../ContactList';

const contacts: Contact[] = [
  { name: 'Alice', address: 'addr1' },
  { name: 'Bob', address: 'addr2' },
  { name: 'Charlie', address: 'addr3' },
];

describe('contact fuzzy searcher', () => {
  const searcher = createContactSearcher(contacts);

  it('finds exact name', () => {
    const c = searcher.searchByNameOrAddress('Alice');
    expect(c?.name).toBe('Alice');
  });

  it('finds fuzzy name', () => {
    const c = searcher.searchByNameOrAddress('Alis');
    expect(c?.name).toBe('Alice');
  });

  it('suggest returns ranked results', () => {
    const list = searcher.suggest('a');
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].contact.name).toBeDefined();
  });
});