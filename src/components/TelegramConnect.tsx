import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Phone, KeyRound, CheckCircle2, Unlink, Send, Loader2, AlertCircle, Info } from 'lucide-react';

interface TelegramStatus {
  linked: boolean;
  phone: string | null;
  linkedAt: string | null;
  apiConfigured: boolean;
}

export default function TelegramConnect({ onLinkedChange }: { onLinkedChange?: (linked: boolean) => void } = {}) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [step, setStep] = useState<'idle' | 'phone' | 'code' | 'done'>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [testChatId, setTestChatId] = useState('me');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await api.get('/telegram-user/status');
      setStatus(res.data);
      if (res.data.linked) setStep('done');
      onLinkedChange?.(res.data.linked);
    } catch {
      setStatus(null);
      onLinkedChange?.(false);
    }
  }

  async function handleSendCode() {
    setError('');
    setLoading(true);
    try {
      await api.post('/telegram-user/send-code', { phone });
      setStep('code');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/telegram-user/verify-code', { code });
      if (res.data.linked) {
        setStep('done');
        fetchStatus();
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Kod noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink() {
    if (!confirm('Telegram hisobingizni uzib qo\'ysizmi?')) return;
    setLoading(true);
    try {
      await api.delete('/telegram-user/unlink');
      setStep('idle');
      setStatus(null);
      fetchStatus();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setError('');
    setLoading(true);
    setTestSent(false);
    try {
      await api.post('/telegram-user/send-test', { chatId: testChatId });
      setTestSent(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Xabar yuborishda xatolik');
    } finally {
      setLoading(false);
    }
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!status.apiConfigured) {
    return (
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-200 font-semibold text-sm">API kalitlari sozlanmagan</p>
          <p className="text-amber-300/80 text-xs mt-1">
            Render → luxpetplast-api → Environment Variables ga qo'shing:
          </p>
          <div className="mt-2 bg-black/40 rounded p-2 font-mono text-xs text-amber-300 space-y-0.5">
            <div>TELEGRAM_API_ID = <span className="text-amber-500">raqam</span></div>
            <div>TELEGRAM_API_HASH = <span className="text-amber-500">string</span></div>
          </div>
          <p className="text-amber-300/60 text-xs mt-2">
            my.telegram.org → API development tools sahifasidan oling
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`rounded-xl p-4 border flex items-start gap-3 ${
        step === 'done'
          ? 'bg-emerald-900/30 border-emerald-700'
          : 'bg-gray-800/60 border-gray-700'
      }`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          step === 'done' ? 'bg-emerald-500/20' : 'bg-gray-700'
        }`}>
          {step === 'done'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            : <Phone className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          {step === 'done' ? (
            <>
              <p className="text-emerald-300 font-semibold text-sm">Telegram ulangan ✓</p>
              <p className="text-emerald-400/70 text-xs mt-0.5">{status.phone}</p>
              {status.linkedAt && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(status.linkedAt).toLocaleString('uz-UZ')}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-200 font-semibold text-sm">Telegram ulanmagan</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Ulanib, sotuv va to'lov chekini mijozlarga yuboring
              </p>
            </>
          )}
        </div>
      </div>

      {/* Auth flow */}
      {step === 'idle' && (
        <div className="space-y-3">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-gray-300 text-xs leading-relaxed">
              Telegram hisobingizga kiring. Sotuv va to'lovlar avtomatik ravishda
              mijozlargasizbning Telegram hisobingizdan yuboriladi.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+998901234567"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSendCode}
              disabled={loading || !phone}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              Kod yuborish
            </button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-3">
          <p className="text-gray-300 text-sm">
            <span className="text-blue-400">{phone}</span> ga SMS/Telegram kodi yuborildi
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="12345"
              maxLength={6}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm tracking-widest font-mono placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length < 4}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Tasdiqlash
            </button>
          </div>
          <button
            onClick={() => { setStep('idle'); setCode(''); }}
            className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
          >
            ← Orqaga
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-3">
          {/* Test message */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 space-y-2">
            <p className="text-gray-400 text-xs font-medium">Test xabari yuborish</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={testChatId}
                onChange={e => setTestChatId(e.target.value)}
                placeholder="me yoki +998... yoki @username"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Yuborish
              </button>
            </div>
            {testSent && (
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Xabar yuborildi!
              </p>
            )}
          </div>

          {/* Unlink */}
          <button
            onClick={handleUnlink}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 text-sm border border-red-900/50 hover:border-red-800 rounded-lg transition-colors"
          >
            <Unlink className="w-4 h-4" />
            Telegramni uzib qo'yish
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
