import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  style = {},
  className = '',
  disabled = false,
  title = '',
  name = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const getRawValue = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (val.target && val.target.value !== undefined) return String(val.target.value);
      if (val.value !== undefined) return String(val.value);
      return '';
    }
    return String(val);
  };

  const stringValue = getRawValue(value);

  const normalizedOptions = options.map(opt => {
    if (opt === null || opt === undefined) return { value: '', label: '' };
    if (typeof opt === 'object') {
      const val = opt.value !== undefined ? opt.value : (opt.code !== undefined ? opt.code : (opt.id !== undefined ? opt.id : (opt.name || '')));
      const lbl = opt.label !== undefined ? opt.label : (opt.name !== undefined ? opt.name : String(val));
      return { value: String(val), label: String(lbl) };
    }
    return { value: String(opt), label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(o => o.value === stringValue) || null;
  const displayLabel = selectedOption ? selectedOption.label : (stringValue ? stringValue : placeholder);

  const filteredOptions = normalizedOptions.filter(opt => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return opt.label.toLowerCase().includes(term) || opt.value.toLowerCase().includes(term);
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const scrollItemIntoView = (index) => {
    if (listRef.current && listRef.current.children && listRef.current.children[index]) {
      listRef.current.children[index].scrollIntoView({ block: 'nearest' });
    }
  };

  function handleSelect(optValue) {
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: optValue },
        currentTarget: { name, value: optValue },
        value: optValue,
        toString: () => String(optValue),
        valueOf: () => optValue
      };
      onChange(syntheticEvent, optValue);
    }
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex(prev => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          scrollItemIntoView(next);
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setHighlightedIndex(prev => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          scrollItemIntoView(next);
          return next;
        });
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        const targetIdx = (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) ? highlightedIndex : 0;
        handleSelect(filteredOptions[targetIdx].value);
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth: style.minWidth || '130px',
        maxWidth: style.maxWidth || '100%',
        width: style.width || 'auto',
        ...style
      }}
      title={title}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          }
        }}
        style={{
          width: '100%',
          height: style.height || '30px',
          padding: '0 8px',
          backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
          border: '1px solid #000000',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: style.fontSize || '11px',
          color: selectedOption ? '#0F2A4A' : '#576574',
          fontWeight: selectedOption ? '600' : '400',
          textAlign: 'left',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {displayLabel}
        </span>
        <ChevronDown size={13} color="#0F2A4A" style={{ flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          minWidth: '180px',
          marginTop: '2px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #000000',
          borderRadius: '3px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          zIndex: 9999,
          maxHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '6px',
            borderBottom: '1px solid #000000',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Search size={13} color="#64748B" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '11px',
                color: '#0F2A4A',
                padding: '2px 0'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  color: '#64748B'
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div
            ref={listRef}
            style={{
              overflowY: 'auto',
              maxHeight: '210px',
              padding: '2px 0'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '8px 12px',
                fontSize: '11px',
                color: '#64748B',
                textAlign: 'center'
              }}>
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = opt.value === stringValue;
                const isHighlighted = i === highlightedIndex;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isHighlighted ? '#DCEAFE' : (isSelected ? '#EBF3FE' : 'transparent'),
                      color: (isHighlighted || isSelected) ? '#1F6FEB' : '#1C2733',
                      fontWeight: (isHighlighted || isSelected) ? '600' : '400',
                      borderLeft: isHighlighted ? '3px solid #1F6FEB' : '3px solid transparent',
                      borderBottom: '1px solid #F1F5F9'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={12} color="#1F6FEB" style={{ flexShrink: 0, marginLeft: '6px' }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
