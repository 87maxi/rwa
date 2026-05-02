'use client';

import { useState, useCallback } from 'react';

export interface ResultField {
  label: string;
  value: string | number | null | undefined;
  copyable?: boolean;
  link?: string;
  linkText?: string;
}

export interface ResultDisplayProps {
  data: ResultField[];
  title?: string;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Display para resultados on-chain con formato consistente.
 * 
 * - Grid dinámico de key-value pairs
 * - Formato de direcciones (short + copy)
 * - Enlace a explorador opcional
 * - Animación de entrada
 */
export function ResultDisplay({
  data,
  title,
  onRefresh,
  loading = false,
  className = '',
}: ResultDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback(async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, []);

  const shortenAddress = (addr: string, chars = 6): string => {
    if (addr.length <= chars * 2 + 2) return addr;
    return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
  };

  const formatValue = (field: ResultField) => {
    if (field.value === null || field.value === undefined) {
      return '-';
    }
    
    const strValue = String(field.value);
    
    // Check if looks like a Solana address (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(strValue)) {
      return shortenAddress(strValue);
    }
    
    return strValue;
  };

  if (loading) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-foreground-muted">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className={`glass-card p-6 ${className}`}>
      {(title || onRefresh) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h4 className="text-lg font-bold text-foreground">{title}</h4>}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              aria-label="Refresh data"
              title="Refresh data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.map((field, index) => {
          const fieldName = typeof field.label === 'string' ? field.label.toLowerCase().replace(/\s+/g, '-') : `field-${index}`;
          const displayValue = formatValue(field);
          const fullValue = String(field.value ?? '');
          
          return (
            <div 
              key={fieldName}
              className="bg-background-secondary rounded-xl p-4 border border-surface-border"
            >
              <p className="text-xs text-foreground-tertiary mb-1">{field.label}</p>
              <div className="flex items-center gap-2">
                {field.link ? (
                  <a
                    href={field.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-primary hover:text-primary-light transition-colors break-all"
                  >
                    {displayValue}
                  </a>
                ) : (
                  <span className="text-sm font-mono text-foreground break-all">
                    {displayValue}
                  </span>
                )}
                
                {field.copyable && typeof field.value === 'string' && (
                  <button
                    onClick={() => handleCopy(fullValue, fieldName)}
                    className="flex-shrink-0 p-1 rounded hover:bg-primary/10 text-foreground-muted hover:text-primary transition-colors"
                    aria-label={`Copy ${field.label}`}
                    title="Copy to clipboard"
                  >
                    {copiedField === fieldName ? (
                      <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              {field.link && field.linkText && (
                <a
                  href={field.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary-light transition-colors"
                >
                  View on explorer
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
