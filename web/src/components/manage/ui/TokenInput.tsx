'use client';

import { useState, useCallback, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

export interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  onValid?: (valid: boolean) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  name?: string;
}

/**
 * Input para direcciones de Solana con validación en tiempo real.
 * 
 * - Validación base58 + PublicKey constructor
 * - Estados visuales: idle, validating, valid, invalid
 * - Botón de copiar cuando es válido
 * - ARIA labels para accesibilidad
 */
export function TokenInput({
  value,
  onChange,
  onValid,
  disabled = false,
  label = 'Address',
  placeholder = 'Enter Solana address',
  helpText,
  required = false,
  name,
}: TokenInputProps) {
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [copied, setCopied] = useState(false);

  const validateAddress = useCallback((addr: string) => {
    if (!addr.trim()) {
      setValidationState('idle');
      onValid?.(false);
      return;
    }

    try {
      new PublicKey(addr);
      setValidationState('valid');
      onValid?.(true);
    } catch {
      setValidationState('invalid');
      onValid?.(false);
    }
  }, [onValid]);

  useEffect(() => {
    validateAddress(value);
  }, [value, validateAddress]);

  const handleCopy = useCallback(async () => {
    if (validationState !== 'valid') return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [value, validationState]);

  const getBorderColor = () => {
    if (disabled) return 'border-surface-border/50';
    if (validationState === 'invalid') return 'border-error border-2';
    if (validationState === 'valid') return 'border-success';
    return 'border-surface-border';
  };

  const getIcon = () => {
    if (validationState === 'valid') {
      return (
        <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (validationState === 'invalid') {
      return (
        <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-foreground-secondary"
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          id={name}
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={validationState === 'invalid'}
          aria-describedby={helpText ? `${name}-help` : undefined}
          className={`
            w-full px-4 py-3 pr-12 rounded-xl
            bg-background-secondary border text-foreground
            focus:ring-2 focus:ring-primary focus:border-transparent
            transition-all duration-200
            hover:border-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getBorderColor()}
          `}
        />
        
        {getIcon() && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getIcon()}
          </div>
        )}
        
        {validationState === 'valid' && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Copy address"
            title="Copy address"
          >
            {copied ? (
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
      
      {helpText && (
        <p id={`${name}-help`} className="text-xs text-foreground-muted">
          {helpText}
        </p>
      )}
      
      {validationState === 'invalid' && (
        <p className="text-xs text-error" role="alert">
          Invalid Solana address. Please enter a valid public key.
        </p>
      )}
    </div>
  );
}
