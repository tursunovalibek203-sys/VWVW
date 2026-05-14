import { ReactNode, forwardRef } from 'react';
import { cn } from '../lib/utils';

export interface ProfessionalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const ProfessionalButton = forwardRef<HTMLButtonElement, ProfessionalButtonProps>(
  ({ 
    className, 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon, 
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden';
    
    const variantClasses = {
      primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border border-primary-400 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5 hover:from-primary-600 hover:to-primary-700',
      secondary: 'bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-800 border border-neutral-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:from-neutral-200 hover:to-neutral-300',
      success: 'bg-gradient-to-r from-success-500 to-success-600 text-white border border-success-400 shadow-lg shadow-success-500/30 hover:shadow-xl hover:shadow-success-500/40 hover:-translate-y-0.5 hover:from-success-600 hover:to-success-700',
      warning: 'bg-gradient-to-r from-warning-500 to-warning-600 text-white border border-warning-400 shadow-lg shadow-warning-500/30 hover:shadow-xl hover:shadow-warning-500/40 hover:-translate-y-0.5 hover:from-warning-600 hover:to-warning-700',
      error: 'bg-gradient-to-r from-error-500 to-error-600 text-white border border-error-400 shadow-lg shadow-error-500/30 hover:shadow-xl hover:shadow-error-500/40 hover:-translate-y-0.5 hover:from-error-600 hover:to-error-700',
      ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent',
      outline: 'bg-transparent text-primary-600 border border-primary-300 hover:bg-primary-50 hover:border-primary-400'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg'
    };
    
    const widthClasses = fullWidth ? 'w-full' : '';
    
    const disabledClasses = disabled || loading ? 'cursor-not-allowed opacity-60' : '';
    
    const renderIcon = () => {
      if (loading) {
        return (
          <div className="animate-pulse h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        );
      }
      return icon;
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses,
          disabledClasses,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        
        {iconPosition === 'left' && renderIcon()}
        <span className="relative z-10">{children}</span>
        {iconPosition === 'right' && renderIcon()}
      </button>
    );
  }
);

ProfessionalButton.displayName = 'ProfessionalButton';

export default ProfessionalButton;
