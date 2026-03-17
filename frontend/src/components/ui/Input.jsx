import React from 'react';

export function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className={`form-group ${className}`}>
      {label && <label htmlFor={inputId} className="form-label">{label}</label>}
      <input
        id={inputId}
        className="form-input"
        style={{ borderColor: error ? 'var(--pk-danger)' : undefined }}
        {...props}
      />
      {error && <span className="text-xs" style={{ color: 'var(--pk-danger)', marginTop: '0.25rem' }}>{error}</span>}
    </div>
  );
}
