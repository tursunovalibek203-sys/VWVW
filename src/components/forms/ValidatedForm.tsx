import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidatedFormProps<T extends z.ZodSchema> {
  schema: T;
  defaultValues?: z.infer<T>;
  onSubmit: (data: z.infer<T>) => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

export function ValidatedForm<T extends z.ZodSchema>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className = '',
  loading = false,
  error = null,
  success = null,
}: ValidatedFormProps<T>) {
  const methods = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const handleSubmit = methods.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (err) {
      // Error is handled by parent component
      console.error('Form submission error:', err);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}
        
        {children}
      </form>
    </FormProvider>
  );
}

// Hook for form validation with error handling
export function useValidatedForm<T extends z.ZodSchema>(
  schema: T,
  defaultValues?: z.infer<T>
) {
  const methods = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const { formState, setError, clearErrors } = methods;
  const { isSubmitting, errors } = formState;

  const setFormError = (field: string, message: string) => {
    setError(field as any, { type: 'manual', message });
  };

  const clearFormError = (field: string) => {
    clearErrors(field as any);
  };

  const hasErrors = Object.keys(errors).length > 0;

  return {
    ...methods,
    isSubmitting,
    errors,
    hasErrors,
    setFormError,
    clearFormError,
  };
}
