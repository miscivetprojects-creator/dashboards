import React from 'react';
import { Eye, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react';
import Modal from './Modal';
import { formatDateDisplay } from '../utils/dateUtils';

export default function RecordPreviewModal({
  isOpen,
  onClose,
  record,
  records,
  recordsList = [],
  currentIndex = 0,
  onNavigate,
  onNavigateRecord,
  title = 'Record Preview & Operational Audit Details'
}) {
  const list = (records && Array.isArray(records) && records.length > 0) 
    ? records 
    : ((recordsList && Array.isArray(recordsList) && recordsList.length > 0) ? recordsList : []);

  const currentIdx = Math.max(0, currentIndex >= 0 ? currentIndex : (record ? list.indexOf(record) : 0));
  const activeRecord = record || (list.length > 0 ? list[currentIdx] : null);

  if (!isOpen || !activeRecord) return null;

  const hasMultiple = list.length > 1;
  const navigateFn = onNavigate || onNavigateRecord;

  const handlePrev = () => {
    if (currentIdx > 0 && navigateFn) {
      navigateFn(currentIdx - 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < list.length - 1 && navigateFn) {
      navigateFn(currentIdx + 1);
    }
  };

  const dataObj = activeRecord.data && typeof activeRecord.data === 'object' ? activeRecord.data : {};
  const mergedRecord = { ...activeRecord, ...dataObj };

  const ignoredKeys = ['_id', 'id', 'history', '__v', 'is_latest', 'data'];
  const displayEntries = Object.entries(mergedRecord).filter(([k, v]) => {
    if (ignoredKeys.includes(k)) return false;
    if (v === null || v === undefined) return false;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {hasMultiple && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#0F2A4A',
            color: '#FFFFFF',
            borderRadius: '4px',
            fontSize: '11.5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={14} color="#D99A1E" />
              <span>Inspection: <strong>Record {currentIdx + 1}</strong> of <strong>{list.length}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIdx <= 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  fontWeight: '600',
                  color: currentIdx <= 0 ? '#94A3B8' : '#0F2A4A',
                  backgroundColor: currentIdx <= 0 ? '#1E3A5F' : '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '3px',
                  cursor: currentIdx <= 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={12} />
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIdx >= list.length - 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  fontWeight: '600',
                  color: currentIdx >= list.length - 1 ? '#94A3B8' : '#0F2A4A',
                  backgroundColor: currentIdx >= list.length - 1 ? '#1E3A5F' : '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '3px',
                  cursor: currentIdx >= list.length - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        <div style={{
          border: '1px solid #000000',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F4F6F9', borderBottom: '1px solid #000000' }}>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #000000', textAlign: 'left', width: '38%', color: '#0F2A4A', fontWeight: '700' }}>
                  Field / Parameter
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#0F2A4A', fontWeight: '700' }}>
                  Recorded Value
                </th>
              </tr>
            </thead>
            <tbody>
              {displayEntries.map(([k, val], index) => {
                let formattedVal = val;
                if (typeof val === 'object' && val !== null) {
                  formattedVal = JSON.stringify(val);
                } else if (k.includes('date')) {
                  formattedVal = formatDateDisplay(val);
                } else if (k.includes('amount') || k.includes('cost') || k.includes('rate') || k.includes('paid') || k.includes('price') || k.includes('balance')) {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    formattedVal = `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                } else if (k === 'quantity' || k.includes('quantity') || k.includes('hours') || k.includes('litres')) {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    formattedVal = `${num.toLocaleString('en-IN')}${k.includes('hours') ? ' hrs' : (k.includes('petrol') || k.includes('diesel') || k.includes('litres') || k === 'quantity' ? ' Ltrs' : '')}`;
                  }
                }

                return (
                  <tr
                    key={k}
                    style={{
                      borderBottom: index < displayEntries.length - 1 ? '1px solid #000000' : 'none',
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFD'
                    }}
                  >
                    <td style={{
                      padding: '7px 12px',
                      borderRight: '1px solid #000000',
                      fontWeight: '600',
                      color: '#475569',
                      textTransform: 'capitalize'
                    }}>
                      {k.replace(/_/g, ' ')}
                    </td>
                    <td style={{
                      padding: '7px 12px',
                      color: '#0F2A4A',
                      fontWeight: k.includes('amount') || k.includes('cost') || k === 'quantity' ? '700' : '500'
                    }}>
                      {String(formattedVal ?? '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ border: '1px solid #000000' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </Modal>
  );
}
