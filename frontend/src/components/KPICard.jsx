import React from 'react';

export default function KPICard({ label, value, badge, icon: Icon, alert = false }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      border: alert ? '1px solid #F3C3C0' : '1px solid #000000',
      borderLeft: alert ? '4px solid #D9383A' : '4px solid #1F6FEB',
      borderRadius: '6px',
      height: '76px',
      padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#576574', fontWeight: '600', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
        {badge && <span className={`badge ${badge.type || 'badge-neutral'}`}>{badge.text}</span>}
        {Icon && <Icon size={14} color="#8395A7" />}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          color: alert ? '#C8423A' : '#071A2E',
          letterSpacing: '-0.2px',
          fontFamily: 'Segoe UI, Calibri, -apple-system, sans-serif',
          lineHeight: '1.2',
          whiteSpace: 'nowrap'
        }}>
          {value ?? '0'}
        </span>
      </div>
    </div>
  );
}
