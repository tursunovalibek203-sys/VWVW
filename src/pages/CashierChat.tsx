import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// To'g'ridan-to'g'ri Render'dagi Telegram Web Z ga o'tamiz
// iframe har doim muammo chiqaradi (Vercel proxy, CSP, cross-origin)
// window.location.href = to'g'ri yechim
const TELEGRAM_URL = 'https://luxpetplast-api.onrender.com/telegram-web/';

export default function CashierChat() {
  useEffect(() => {
    // Joriy sahifani Telegram Web Z ga almashtiramiz
    // Browser back tugmasi bilan ERP'ga qaytsa bo'ladi
    window.location.replace(TELEGRAM_URL);
  }, []);

  // Yo'naltirish vaqtida yuklanish ekrani
  return (
    <div className="fixed inset-0 bg-[#17212b] flex flex-col items-center justify-center z-50 gap-4">
      <Loader2 className="w-10 h-10 text-[#5288c1] animate-spin" />
      <p className="text-[#aab8c2] text-sm">Telegram ochilmoqda...</p>
      <p className="text-[#6c8fa8] text-xs">Server uyg'onayotgan bo'lishi mumkin (30s)</p>
    </div>
  );
}
