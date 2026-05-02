'use client';

import { useState, useCallback } from 'react';

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  decimals?: number;
  maxAmount?: number;
  label?: string;
  symbol?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
}

/**
 * Input para cantidades con botones rápidos y validación.
 * 
 * - Botones rápidos: 25%, 50%, 75%, 100% del maxAmount
 * - Validación de formato numérico
 * - Display del símbolo y decimales
 */
export function AmountInput({
  value,
  onChange,
  decimals = 9,
  maxAmount,
  label = 'Amount',
  symbol = 'tokens',
  placeholder = '0.0',
  required = false,
  name,
}: AmountInputProps) {
  const [focused, setFocused] = useState(false);

  const handleQuickAmount = useCallback((percentage: number) => {
    if (!maxAmount) return;
    const amount = (maxAmount * percentage / 100).toFixed(decimals);
    onChange(amount);
  }, [maxAmount, decimals, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only numbers and decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  }, [onChange]);

  const quickActions = maxAmount ? [
    { label: '25%', value: 25 },
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: '100%', value: 100 },
  ] as const : [];

  const hasMax = maxAmount !== undefined && maxAmount > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <label 
            htmlFor={name}
            className="block text-sm font-medium text-foreground-secondary"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        {hasMax && (
          <span className="text-xs text-foreground-muted">
            Max: {maxAmount.toFixed(decimals)} {symbol}
          </span>
        )}
      </div>
      
      <div className="relative">
        <input
          id={name}
          type="text"
          name={name}
          inputMode="decimal"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          aria-describedby={hasMax ? `${name}-max` : undefined}
          className={`
            w-full px-4 py-3 pr-20 rounded-xl
            bg-background-secondary border border-surface-border text-foreground
            focus:ring-2 focus:ring-primary focus:border-transparent
            transition-all duration-200
            hover:border-primary/50
          `}
        />
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground-muted pointer-events-none">
          {symbol}
        </div>
      </div>
      
      {hasMax && focused && (
        <div className="flex gap-2">
          {quickActions.map(({ label: btnLabel, value: pct }) => (
            <button
              key={pct}
              type="button"
              onClick={() => handleQuickAmount(pct)}
              className="flex-1 px-3 py-1.5 text-xs font-medium
                bg-background-secondary border border-surface-border
                text-foreground-secondary rounded-lg
                hover:bg-primary/10 hover:border-primary/30 hover:text-primary
                focus:ring-2 focus:ring-primary focus:outline-none
                transition-all duration-200"
            >
              {btnLabel}
            </button>
          ))}
        </div>
      )}
      
      {hasMax && (
        <p id={`${name}-max`} className="text-xs text-foreground-muted">
          Maximum available: {maxAmount.toFixed(decimals)} {symbol}
        </p>
      )}
    </div>
  );
}
