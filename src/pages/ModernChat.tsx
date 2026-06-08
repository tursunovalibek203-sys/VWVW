import { useState, useRef } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

const TELEGRAM_WEB_URL = '/telegram-web/';

export default function ModernChat() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const handleReload = () => {
    if (iframeRef.current) {
      setLoading(true);
      iframeRef.current.src = TELEGRAM_WEB_URL;
    }
  };

  return (
    <div
      className={`flex flex-col bg-gray-900 ${fullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-64px)]'}`}
    >
      {/* Yuqori panel */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <img
            src="https://telegram.org/favicon.ico"
            alt="Telegram"
            className="w-5 h-5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-white font-semibold text-sm">Telegram Web</span>
          <span className="text-gray-400 text-xs">— Mijozlar bilan suhbat</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={TELEGRAM_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Yangi oynada ochish"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => setFullscreen(f => !f)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={fullscreen ? 'Kichraytirish' : 'Kattalashtirish'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* iframe */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Telegram yuklanmoqda...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={TELEGRAM_WEB_URL}
          className="w-full h-full border-none"
          title="Telegram Web"
          allow="camera; microphone; notifications"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
