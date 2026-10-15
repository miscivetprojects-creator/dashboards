import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TablePagination({
  currentPage = 1,
  totalItems,
  totalRecords,
  pageSize = 10,
  onPageChange
}) {
  const count = Number(totalRecords !== undefined ? totalRecords : (totalItems || 0));
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const startIdx = count === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(count, currentPage * pageSize);

  if (count <= pageSize && currentPage === 1) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #000000',
        fontSize: '11px',
        color: '#576574'
      }}>
        <span>Showing {startIdx} to {endIdx} of {count} records</span>
        <span style={{ fontWeight: '600', color: '#0F2A4A' }}>Page 1 of 1</span>
      </div>
    );
  }

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '8px 14px',
      backgroundColor: '#F8FAFC',
      borderTop: '1px solid #000000',
      fontSize: '11px',
      color: '#576574'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Showing <strong style={{ color: '#0F2A4A' }}>{startIdx}</strong> to <strong style={{ color: '#0F2A4A' }}>{endIdx}</strong> of <strong style={{ color: '#0F2A4A' }}>{count}</strong> records</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '600',
            color: currentPage <= 1 ? '#94A3B8' : '#0F2A4A',
            backgroundColor: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
            border: '1px solid #000000',
            borderRadius: '4px',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ChevronLeft size={13} />
          Previous
        </button>

        <span style={{
          padding: '4px 10px',
          fontWeight: '700',
          fontSize: '11px',
          color: '#0F2A4A',
          backgroundColor: '#EAEFF5',
          border: '1px solid #CBD5E1',
          borderRadius: '4px'
        }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '600',
            color: currentPage >= totalPages ? '#94A3B8' : '#0F2A4A',
            backgroundColor: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
            border: '1px solid #000000',
            borderRadius: '4px',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
