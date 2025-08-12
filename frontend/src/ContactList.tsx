import React from 'react';

export interface Contact {
  id: number;
  name: string;
  address: string;
  balance: number;
}

interface ContactListProps {
  contacts: Contact[];
}

const ContactList: React.FC<ContactListProps> = ({ contacts }) => {
  return (
    <div className="contact-list">
      <h2>Contacts ({contacts.length})</h2>
      {contacts.length === 0 ? (
        <div className="no-contacts">
          <p>No contacts available.</p>
          <p className="contact-hint">
            Try saying: "Add contact John" or "Create contact Sarah"
          </p>
        </div>
      ) : (
        <div className="contacts-container">
          {contacts.map((contact) => (
            <div key={contact.id} className="contact-item">
              <div className="contact-header">
                <strong className="contact-name">{contact.name}</strong>
                <span className="contact-balance">{contact.balance} WND</span>
              </div>
              <div className="contact-address">
                <code title={contact.address}>
                  {contact.address.substring(0, 8)}...{contact.address.substring(contact.address.length - 8)}
                </code>
              </div>
              <div className="contact-actions">
                <button className="contact-action-btn" title="Send payment">
                  💸
                </button>
                <button className="contact-action-btn" title="View details">
                  👁️
                </button>
                <button className="contact-action-btn" title="Remove contact">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="contact-help">
        <h4>Voice Commands for Contacts:</h4>
        <ul>
          <li><strong>Add:</strong> "Add contact John"</li>
          <li><strong>Remove:</strong> "Remove contact Alice"</li>
          <li><strong>Pay:</strong> "Pay 10 to Bob"</li>
          <li><strong>Recurring:</strong> "Set recurring payment 50 to Charlie"</li>
        </ul>
      </div>
    </div>
  );
};

export default ContactList;
