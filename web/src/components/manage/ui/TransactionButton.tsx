'use client';

import { useState, useCallback } from 'react';

export type TransactionButtonVariant = 'primary' | 'warning' | 'danger' | 'success';

export interface TransactionButtonProps {
  onClick: (e?: React.FormEvent) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: TransactionButtonVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const variantStyles: Record<TransactionButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-primary to-secondary shadow-glow hover:shadow-glow-secondary',
  warning: 'bg-gradient-to-r from-warning to-error',
  danger: 'bg-gradient-to-r from-error to-warning',
  success: 'bg-gradient-to-r from-success to-secondary',
};

/**
 * Botón para transacciones Solana con estados de loading y feedback visual.
 * 
 * - Previene double-submit
 * - Muestra spinner durante loading
 * - Feedback visual de éxito/error
 * - Variantes: primary, warning, danger, success
 */
export function TransactionButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  icon,
  className = '',
  'aria-label': ariaLabel,
}: TransactionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleClick = useCallback(async () => {
    if (loading || disabled) return;
    
    setStatus('idle');
    try {
      await onClick();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [onClick, loading, disabled]);

  const getStatusIcon = () => {
    if (status === 'success') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (status === 'error') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return null;
  };

  const getButtonClasses = () => {
    const base = `
      relative w-full px-6 py-4 rounded-xl font-semibold
      flex items-center justify-center gap-2
      transition-all duration-300
      min-h-[56px]
      focus:ring-2 focus:ring-primary focus:outline-none
    `;
    
    if (disabled || loading) {
      return `${base} opacity-50 cursor-not-allowed`;
    }
    
    if (status === 'success') {
      return `${base} bg-success text-white`;
    }
    
    if (status === 'error') {
      return `${base} bg-error text-white`;
    }
    
    return `${base} ${variantStyles[variant]} text-white hover:opacity-90`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={getButtonClasses()}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
          {getStatusIcon()}
        </>
      )}
    </button>
  );
}
