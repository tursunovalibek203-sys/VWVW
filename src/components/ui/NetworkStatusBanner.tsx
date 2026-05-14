import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Offline bo'lganda bannerni ko'rsatish
    if (!isOnline) {
      setShowBanner(true);
    } else {
      // Online bo'lganda 2 soniyadan keyin yopish
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-yellow-500 text-yellow-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {isOnline ? '✅' : '📡'}
          </span>
          <span className="font-medium">
            {isOnline 
              ? 'Internet ulanish tiklandi' 
              : 'Internet ulanmagan - Oflayn rejimida ishlayapti'
            }
          </span>
        </div>
        {!isOnline && (
          <span className="text-xs opacity-75">
            Xizmatlarni faqat keshdan foydalanish mumkin
          </span>
        )}
      </div>
    </div>
  );
};
