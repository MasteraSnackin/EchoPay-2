import React from 'react';

export interface Contact { // Add export
  name: string;
  address: string;
}

// Mock contact data - replace with real data source later
export const mockContacts: Contact[] = [ // Add export
  { name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
  { name: 'Bob', address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' },
  { name: 'Charlie', address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59K' },
  { name: 'Dave', address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy' },
];

const ContactList: React.FC = () => {
  return (
    <div className="contact-list">
      <h2>Contacts</h2>
      {mockContacts.length === 0 ? (
        <p>No contacts available.</p>
      ) : (
        <ul>
          {mockContacts.map((contact) => (
            <li key={contact.address}>
              <strong>{contact.name}</strong>
              <br />
              <small title={contact.address}>
                {contact.address.substring(0, 8)}...{contact.address.substring(contact.address.length - 8)}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContactList;
