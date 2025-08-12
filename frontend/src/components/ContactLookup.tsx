import React, { useState, useEffect } from 'react';

interface Contact {
  id: number;
  name: string;
  address: string;
  balance: number;
}

interface ContactLookupProps {
  onContactSelect: (contact: Contact) => void;
  currentRecipient?: string;
}

const ContactLookup: React.FC<ContactLookupProps> = ({ onContactSelect, currentRecipient }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');


  // Mock contacts for demo - in real app, fetch from backend
  const mockContacts: Contact[] = [
    { id: 1, name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQg', balance: 1000 },
    { id: 2, name: 'Bob', address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', balance: 500 },
    { id: 3, name: 'Charlie', address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59K', balance: 750 },
    { id: 4, name: 'Dave', address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', balance: 300 }
  ];

  useEffect(() => {
    // Load contacts
    setContacts(mockContacts);
    
    // If we have a current recipient, try to find it
    if (currentRecipient) {
      const found = mockContacts.find(c => 
        c.name.toLowerCase() === currentRecipient.toLowerCase()
      );
      if (found) {
        onContactSelect(found);
      }
    }
  }, [currentRecipient, onContactSelect]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactSelect = (contact: Contact) => {
    onContactSelect(contact);
    setSearchTerm('');
  };

  const addNewContact = () => {
    const name = prompt('Enter contact name:');
    if (name && name.trim()) {
      const address = prompt('Enter contact address:');
      if (address && address.trim()) {
        const newContact: Contact = {
          id: Date.now(),
          name: name.trim(),
          address: address.trim(),
          balance: 0
        };
        setContacts(prev => [...prev, newContact]);
        onContactSelect(newContact);
      }
    }
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: '#fafafa'
    }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Contact Lookup</h4>
      
      {/* Search */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Search contacts by name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Contact List */}
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {filteredContacts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            {searchTerm ? 'No contacts found' : 'No contacts available'}
          </p>
        ) : (
          filteredContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => handleContactSelect(contact)}
              style={{
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                marginBottom: '8px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {contact.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                  {contact.address.substring(0, 10)}...{contact.address.substring(contact.address.length - 8)}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {contact.balance} DOT
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Contact Button */}
      <button
        onClick={addNewContact}
        style={{
          width: '100%',
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
      >
        ➕ Add New Contact
      </button>


    </div>
  );
};

export default ContactLookup;