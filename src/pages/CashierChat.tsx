import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

// Vercel proxy /telegram-web/ → Render ni bypass qilamiz
// To'g'ridan-to'g'ri Render URL ishlatamiz (server X-Frame-Options ni olib tashlagan)
const TELEGRAM_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://luxpetplast-api.onrender.com/telegram-web/'
  : 'http://localhost:5003/telegram-web/';

export default function CashierChat() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleReload = () => {
    setError(false);
    setLoading(true);
    if (iframeRef.current) iframeRef.current.src = TELEGRAM_URL;
  };

  return (
    <div className="fixed inset-0 bg-[#17212b] flex flex-col z-50">
      {/* Minimal top bar — faqat orqaga tugma */}
      <div className="flex items-center h-11 px-3 bg-[#17212b] border-b border-white/5 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/cashier/sales')}
          className="flex items-center gap-1.5 text-[#aab8c2] hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Orqaga</span>
        </button>
        <span className="mx-auto text-[#aab8c2] text-sm font-medium">Telegram</span>
        <button
          type="button"
          onClick={handleReload}
          className="text-[#aab8c2] hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 top-11 flex flex-col items-center justify-center bg-[#17212b] z-10">
          <Loader2 className="w-8 h-8 text-[#5288c1] animate-spin mb-3" />
          <p className="text-[#aab8c2] text-sm">Telegram yuklanmoqda...</p>
          <p className="text-[#6c8fa8] text-xs mt-1">Server uyg'onayotgan bo'lishi mumkin (30s)</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 top-11 flex flex-col items-center justify-center bg-[#17212b] z-10 gap-3">
          <p className="text-[#aab8c2] text-sm">Telegram yuklanmadi</p>
          <button
            onClick={handleReload}
            className="px-4 py-2 bg-[#5288c1] text-white rounded-lg text-sm"
          >
            Qayta urinish
          </button>
        </div>
      )}

      {/* Telegram Web Z iframe — to'liq ekran, to'g'ridan-to'g'ri Render'dan */}
      <iframe
        ref={iframeRef}
        src={TELEGRAM_URL}
        title="Telegram"
        className="flex-1 w-full border-none"
        allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
        onLoad={() => { setLoading(false); setError(false); }}
        onError={() => { setLoading(false); setError(true); }}
      />
    </div>
  );
}
