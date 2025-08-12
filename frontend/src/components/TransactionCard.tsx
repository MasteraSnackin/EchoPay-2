import React from 'react';

interface TransactionCardProps {
  transaction: {
    id: number;
    type: string;
    amount: number;
    recipient: string;
    recipientAddress?: string;
    currency: string;
    status: string;
    confidence?: number;
    timestamp: string;
    txHash: string;
    processingMethods?: string[];
  };
  onExecute?: () => void;
  showExecuteButton?: boolean;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ 
  transaction, 
  onExecute, 
  showExecuteButton = false 
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#f44336';
      case 'broadcasted':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      case 'broadcasted':
        return '📡';
      default:
        return '❓';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash: string, length: number = 10) => {
    if (hash.length <= length * 2) return hash;
    return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
  };

  return (
    <div className="transaction-card" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      padding: '20px',
      margin: '15px 0',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            backgroundColor: getStatusColor(transaction.status),
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {getStatusIcon(transaction.status)} {transaction.status.toUpperCase()}
          </span>
          
          <span style={{
            backgroundColor: '#f0f0f0',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            {transaction.type}
          </span>
        </div>

        {transaction.confidence && (
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#1976d2'
          }}>
            AI: {(transaction.confidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Transaction Details */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px'
        }}>
          <div>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              <strong>Amount:</strong>
            </p>
            <p style={{ 
              margin: '5px 0', 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: '#2e7d32'
            }}>
              {formatAmount(transaction.amount, transaction.currency)}
            </p>
          </div>
          
          <div>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              <strong>Recipient:</strong>
            </p>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              {transaction.recipient}
            </p>
          </div>
        </div>

        {transaction.recipientAddress && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              <strong>Address:</strong>
            </p>
            <code style={{
              backgroundColor: '#f5f5f5',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {truncateHash(transaction.recipientAddress)}
            </code>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div style={{
        borderTop: '1px solid #e0e0e0',
        paddingTop: '15px',
        marginBottom: '15px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div>
            <strong>Time:</strong> {formatDate(transaction.timestamp)}
          </div>
          <div>
            <strong>Hash:</strong> {truncateHash(transaction.txHash)}
          </div>
        </div>

        {transaction.processingMethods && (
          <div style={{ marginTop: '10px' }}>
            <strong>AI Methods:</strong> {transaction.processingMethods.join(', ')}
          </div>
        )}
      </div>

      {/* Action Button */}
      {showExecuteButton && onExecute && transaction.status === 'pending' && (
        <div style={{
          borderTop: '1px solid #e0e0e0',
          paddingTop: '15px',
          textAlign: 'center'
        }}>
          <button
            onClick={onExecute}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            🚀 Execute Transaction
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;