import React from 'react';
import { Menu } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

export default function TopHeader({
  filters = {},
  onFilterChange,
  toggleSidebar,
  locations = []
}) {
  return (
    <header className="civet-top-header">
      <div className="top-header-left">
        <button
          onClick={toggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#0F2A4A',
            cursor: 'pointer',
            display: 'flex',
            padding: '4px',
            borderRadius: '4px'
          }}
          title="Toggle Navigation"
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="top-header-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#576574' }}>Year:</span>
          <select
            value={filters.year || '2025'}
            onChange={e => {
              const val = e.target.value;
              if (val === '2026') {
                onFilterChange({
                  ...filters,
                  year: '2026',
                  from_date: '2026-01-01',
                  to_date: '2026-12-31'
                });
              } else {
                onFilterChange({
                  ...filters,
                  year: '2025',
                  from_date: '2025-01-01',
                  to_date: '2025-12-31'
                });
              }
            }}
            style={{
              height: '28px',
              padding: '0 8px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#0F2A4A',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
            title="Select Year"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#576574' }}>From:</span>
          <input
            type="date"
            value={filters.from_date || ''}
            onChange={e => onFilterChange({ ...filters, from_date: e.target.value })}
            style={{
              height: '28px',
              padding: '0 6px',
              fontSize: '11px',
              color: '#0F2A4A',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              outline: 'none'
            }}
            title="From Date"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#576574' }}>To:</span>
          <input
            type="date"
            value={filters.to_date || ''}
            onChange={e => onFilterChange({ ...filters, to_date: e.target.value })}
            style={{
              height: '28px',
              padding: '0 6px',
              fontSize: '11px',
              color: '#0F2A4A',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              outline: 'none'
            }}
            title="To Date"
          />
        </div>

        {(filters.from_date || filters.to_date) && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, from_date: '', to_date: '' })}
            className="btn btn-secondary btn-sm"
            style={{ height: '28px', padding: '0 7px', fontSize: '10.5px' }}
            title="Clear Dates"
          >
            Clear
          </button>
        )}

        <SearchableSelect
          value={filters.location || 'All'}
          onChange={e => onFilterChange({ ...filters, location: (e?.target ? e.target.value : e) })}
          style={{ height: '28px', minWidth: '140px', maxWidth: '180px', fontSize: '11px' }}
          title="Filter Cost Center"
          options={[
            { value: 'All', label: 'All Cost Centers' },
            ...locations.map(l => ({ value: l.name || l.code, label: l.name || l.code }))
          ]}
        />
      </div>
    </header>
  );
}
