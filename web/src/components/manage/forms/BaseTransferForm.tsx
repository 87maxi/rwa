'use client';

import { useState, useCallback } from 'react';
import { ActionCard, TransactionButton, TokenInput, AmountInput } from '@/components/manage/ui';
import type { TransactionResult } from '@/hooks/useTransferOperations';

export type TransferOperationType = 'transfer' | 'mint' | 'burn';

export interface BaseTransferFormProps {
  operation: TransferOperationType;
  recipient: string;
  onRecipientChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  onExecute: (recipient: string, amount: number) => Promise<TransactionResult>;
  isLoading: boolean;
  maxAmount?: number;
  decimals?: number;
}

const OPERATION_CONFIG: Record<TransferOperationType, {
  title: string;
  description: string;
  recipientLabel: string;
  amountLabel: string;
  buttonText: string;
  buttonVariant: 'primary' | 'danger';
  inputVariant: 'default' | 'danger';
}> = {
  transfer: {
    title: 'Transfer Tokens',
    description: 'Send tokens to another Solana address.',
    recipientLabel: 'Recipient Address',
    amountLabel: 'Amount to Transfer',
    buttonText: 'Transfer Tokens',
    buttonVariant: 'primary',
    inputVariant: 'default',
  },
  mint: {
    title: 'Mint New Tokens',
    description: 'Create new tokens and send to a recipient.',
    recipientLabel: 'Recipient Address',
    amountLabel: 'Amount to Mint',
    buttonText: 'Mint Tokens',
    buttonVariant: 'primary',
    inputVariant: 'default',
  },
  burn: {
    title: 'Burn Tokens',
    description: 'Permanently remove tokens from circulation.',
    recipientLabel: 'From Address',
    amountLabel: 'Amount to Burn',
    buttonText: 'Burn Tokens',
    buttonVariant: 'danger',
    inputVariant: 'danger',
  },
};

/**
 * Formulario base reutilizable para Transfer, Mint y Burn.
 * 
 * Compartido entre TransferTab, MintTab y BurnTab.
 */
export function BaseTransferForm({
  operation,
  recipient,
  onRecipientChange,
  amount,
  onAmountChange,
  onExecute,
  isLoading,
  maxAmount,
  decimals = 9,
}: BaseTransferFormProps) {
  const [isRecipientValid, setIsRecipientValid] = useState(false);
  const config = OPERATION_CONFIG[operation];

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!recipient || !amount || !isRecipientValid) return;
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) return;
    
    await onExecute(recipient, amountValue);
  }, [recipient, amount, isRecipientValid, onExecute]); // operation is stable

  const handleReset = useCallback(() => {
    // Could be passed from parent if needed
  }, []);

  return (
    <ActionCard
      title={config.title}
      description={config.description}
      variant={config.inputVariant}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <TokenInput
          name="recipient"
          label={config.recipientLabel}
          value={recipient}
          onChange={onRecipientChange}
          onValid={setIsRecipientValid}
          placeholder="Enter Solana address"
          helpText="Must be a valid Solana public key"
          required
        />
        
        <AmountInput
          name="amount"
          label={config.amountLabel}
          value={amount}
          onChange={onAmountChange}
          maxAmount={maxAmount}
          decimals={decimals}
          symbol={operation === 'burn' ? 'tokens' : 'tokens'}
          required
        />
        
        <TransactionButton
          onClick={handleSubmit}
          loading={isLoading}
          variant={config.buttonVariant}
          disabled={!isRecipientValid || !amount || parseFloat(amount) <= 0}
        >
          {config.buttonText}
        </TransactionButton>
      </form>
    </ActionCard>
  );
}
