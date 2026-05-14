import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, helperText, icon, rightIcon, className = '', containerClassName = '', labelClassName = '', ...props }, ref) => {
    const hasError = !!error;
    const hasSuccess = success && !hasError;

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label className={`block text-sm font-semibold text-gray-700 ${labelClassName}`}>
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-white border-2 rounded-xl
              text-gray-900 placeholder-gray-400
              transition-all duration-200 ease-out
              focus:outline-none focus:ring-4 focus:ring-opacity-20
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
              ${icon ? 'pl-11' : 'pl-4'}
              ${rightIcon || hasSuccess || hasError ? 'pr-11' : 'pr-4'}
              py-2.5
              ${hasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/30'
                : hasSuccess
                  ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
              }
             ${className}
            `}
            aria-describedby={hasError ? 'input-error' : helperText ? 'input-helper' : undefined}
            {...props}
          />
          {/* Right side icons */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {hasSuccess && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
            {hasError && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {rightIcon && !hasSuccess && !hasError && (
              <span className="text-gray-400">{rightIcon}</span>
            )}
          </div>
        </div>
        {/* Helper or Error text */}
        {(helperText || error) && (
          <div className="flex items-start gap-1.5">
            {hasError && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
            <p
              id={hasError ? 'input-error' : 'input-helper'}
              className={`text-sm ${hasError ? 'text-red-600 font-medium' : 'text-gray-500'}`}
            >
              {error || helperText}
            </p>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
