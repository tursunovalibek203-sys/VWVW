import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Professional base styles with enhanced transitions
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-semibold rounded-xl
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98] active:duration-100
    shadow-sm hover:shadow-md
  `;

  // Enhanced variant styles with professional gradients and states
  const variants = {
    primary: `
      bg-gradient-to-r from-blue-600 to-blue-700
      hover:from-blue-700 hover:to-blue-800
      active:from-blue-800 active:to-blue-900
      text-white
      focus:ring-blue-500 focus:ring-offset-white
      shadow-blue-500/25 hover:shadow-blue-500/40
    `,
    secondary: `
      bg-white
      hover:bg-gray-50
      active:bg-gray-100
      text-gray-700
      border-2 border-gray-200
      hover:border-gray-300
      active:border-gray-400
      focus:ring-blue-500 focus:ring-offset-white
    `,
    outline: `
      bg-transparent
      hover:bg-gray-50
      active:bg-gray-100
      text-gray-700
      border-2 border-gray-300
      hover:border-gray-400
      active:border-gray-500
      focus:ring-blue-500 focus:ring-offset-white
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700
      hover:from-red-700 hover:to-red-800
      active:from-red-800 active:to-red-900
      text-white
      focus:ring-red-500 focus:ring-offset-white
      shadow-red-500/25 hover:shadow-red-500/40
    `,
    success: `
      bg-gradient-to-r from-emerald-600 to-emerald-700
      hover:from-emerald-700 hover:to-emerald-800
      active:from-emerald-800 active:to-emerald-900
      text-white
      focus:ring-emerald-500 focus:ring-offset-white
      shadow-emerald-500/25 hover:shadow-emerald-500/40
    `,
    ghost: `
      bg-transparent
      hover:bg-gray-100
      active:bg-gray-200
      text-gray-600 hover:text-gray-900
      focus:ring-gray-500 focus:ring-offset-white
    `
  };

  // Enhanced size styles with consistent padding
  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[2rem]',
    md: 'px-4 py-2.5 text-sm min-h-[2.5rem]',
    lg: 'px-6 py-3 text-base min-h-[3rem]',
    xl: 'px-8 py-4 text-lg min-h-[3.5rem]'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default Button;
