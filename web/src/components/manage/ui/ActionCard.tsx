'use client';

export type ActionCardVariant = 'default' | 'warning' | 'danger' | 'success';

export interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: ActionCardVariant;
  children: React.ReactNode;
  className?: string;
}

const variantBorderColors: Record<ActionCardVariant, string> = {
  default: 'border-primary/20',
  warning: 'border-warning/20',
  danger: 'border-error/20',
  success: 'border-success/20',
};

const variantHeaderColors: Record<ActionCardVariant, string> = {
  default: 'text-primary',
  warning: 'text-warning',
  danger: 'text-error',
  success: 'text-success',
};

/**
 * Card genérica para acciones con variant styling.
 * 
 * - Header con título, icono y descripción
 * - Border color basado en variant
 * - Glass morphism effect consistente
 */
export function ActionCard({
  title,
  description,
  icon,
  variant = 'default',
  children,
  className = '',
}: ActionCardProps) {
  return (
    <div 
      className={`
        glass-card p-6 border ${variantBorderColors[variant]}
        transition-all duration-300
        hover:shadow-lg hover:shadow-primary/5
        ${className}
      `}
    >
      {(title || icon) && (
        <div className="flex items-start gap-3 mb-6">
          {icon && (
            <div className={`p-2 rounded-lg bg-primary/10 ${variantHeaderColors[variant]}`}>
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h4 className={`text-xl font-bold ${variantHeaderColors[variant]}`}>
              {title}
            </h4>
            {description && (
              <p className="text-sm text-foreground-tertiary mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
