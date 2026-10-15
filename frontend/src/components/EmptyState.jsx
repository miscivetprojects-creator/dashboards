import React from 'react';
import { Database, FileSpreadsheet } from 'lucide-react';

export default function EmptyState({ 
  title = 'No Records Found', 
  message = 'There is currently no approved operational data matching the selected filter criteria.', 
  actionText, 
  onAction,
  icon: Icon = Database 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
      background: '#FFFFFF',
      border: '1px dashed #D9DEE5',
      borderRadius: '4px',
      minHeight: '220px'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: '#F4F6F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px'
      }}>
        <Icon size={22} color="#8395A7" />
      </div>

      <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#0F2A4A', marginBottom: '6px' }}>
        {title}
      </h3>

      <p style={{ fontSize: '11.5px', color: '#576574', maxWidth: '420px', marginBottom: actionText ? '14px' : '0' }}>
        {message}
      </p>

      {actionText && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          <FileSpreadsheet size={13} />
          {actionText}
        </button>
      )}
    </div>
  );
}
