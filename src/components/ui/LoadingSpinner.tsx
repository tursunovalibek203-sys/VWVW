import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  isOffline?: boolean;
  hasError?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  text,
  isOffline = false,
  hasError = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  // Offline yoki xato bo'lganda - aylanmasin, static ko'rinsin
  if (isOffline || hasError) {
    const bgColor = isOffline ? 'bg-yellow-100' : 'bg-red-100';
    const borderColor = isOffline ? 'border-yellow-300' : 'border-red-300';
    const iconColor = isOffline ? 'text-yellow-600' : 'text-red-600';
    const textColor = isOffline ? 'text-yellow-800' : 'text-red-800';
    
    return (
      <div className={`flex items-center gap-3 ${bgColor} p-4 rounded-lg border ${borderColor} ${className}`}>
        <div className={`flex-shrink-0 text-2xl ${iconColor}`}>
          {isOffline ? '📡' : '❌'}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {isOffline ? 'Internet ulanmagan' : 'Xatolik yuz berdi'}
          </p>
          {text && (
            <p className={`text-xs mt-1 ${textColor}`}>{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          bg-blue-500 
          rounded-full animate-pulse
        `}
      />
      {text && (
        <span className="text-sm text-gray-600">{text}</span>
      )}
    </div>
  );
};

// Full page loading component
export const PageLoading: React.FC<{ text?: string; isOffline?: boolean }> = ({ 
  text = 'Yuklanmoqda...',
  isOffline = false
}) => {
  if (isOffline) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📡</div>
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">Internet ulanmagan</h1>
          <p className="text-yellow-700">Iltimos, internet ulanishini tekshiring</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4 justify-center" />
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
};

// Table loading skeleton
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-lg">
          {Array.from({ length: cols }).map((_, j) => (
            <div 
              key={j} 
              className="flex-1 h-4 bg-gray-200 rounded animate-pulse" 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Card loading skeleton
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-4/6 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Form loading overlay
export const FormLoadingOverlay: React.FC<{ loading: boolean; text?: string }> = ({ 
  loading, 
  text = 'Saqlanmoqda...' 
}) => {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-2" />
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
};

// Button loading state
export const ButtonLoading: React.FC<{ loading: boolean; children: React.ReactNode }> = ({ 
  loading, 
  children 
}) => {
  return (
    <span className="flex items-center gap-2">
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </span>
  );
};
