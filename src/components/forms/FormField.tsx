import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface FormFieldProps {
  name: string;
  label?: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'password' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  rows?: number;
  step?: string;
  min?: string | number;
  max?: string | number;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder,
  options,
  disabled = false,
  required = false,
  className = '',
  rows = 3,
  step,
  min,
  max,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg transition-colors
    ${error 
      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' 
      : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `;

  const renderInput = (field: any) => {
    switch (type) {
      case 'select':
        return (
          <select
            {...field}
            className={inputClasses}
            disabled={disabled}
            required={required}
          >
            <option value="">{placeholder || 'Tanlang...'}</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...field}
            className={inputClasses}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
          />
        );

      default:
        return (
          <input
            {...field}
            type={type}
            className={inputClasses}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            step={step}
            min={min}
            max={max}
            onChange={(e) => {
              const value = type === 'number' ? 
                (e.target.value === '' ? '' : Number(e.target.value)) : 
                e.target.value;
              field.onChange(value);
            }}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => renderInput(field)}
      />

      {errorMessage && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  className = '',
}) => (
  <div className={`space-y-4 ${className}`}>
    {title && (
      <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
        {title}
      </h3>
    )}
    {children}
  </div>
);

interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  onSubmit,
  submitText = 'Saqlash',
  cancelText = 'Bekor qilish',
  loading = false,
  disabled = false,
  className = '',
}) => (
  <div className={`flex gap-3 justify-end pt-4 border-t border-gray-200 ${className}`}>
    {onCancel && (
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelText}
      </Button>
    )}
    
    <Button
      type="submit"
      onClick={onSubmit}
      isLoading={loading}
      disabled={disabled}
      loadingText="Saqlanmoqda..."
    >
      {submitText}
    </Button>
  </div>
);
