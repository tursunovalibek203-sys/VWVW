import { useState, useRef, useEffect } from 'react';
import {
  ExternalLink, RefreshCw, Maximize2, Minimize2,
  Link, Link2Off, Send, Phone, Key, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';
import api from '../lib/api';

const TELEGRAM_WEB_URL = '/telegram-web/';

type AuthStep = 'idle' | 'phone' | 'code' | 'done';

interface TgStatus {
  linked: boolean;
  phone: string | null;
  linkedAt: string | null;
  apiConfigured: boolean;
}

export default function ModernChat() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [status, setStatus] = useState<TgStatus | null>(null);
  const [step, setStep] = useState<AuthStep>('idle');
  const [phone, setPhone] = useState('+998');
  const [code, setCode] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/telegram-user/status');
      setStatus(data);
      if (data.linked) setStep('done');
    } catch { /* ignore */ }
  };

  const handleSendCode = async () => {
    setError(''); setBusy(true);
    try {
      await api.post('/telegram-user/send-code', { phone });
      setStep('code');
      setMsg('Telegram orqali 6 xonali kod yuborildi');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const handleVerify = async () => {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/telegram-user/verify-code', { code });
      setMsg(`✅ Ulandi: ${data.phone}`);
      setStep('done');
      fetchStatus();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const handleUnlink = async () => {
    if (!confirm('Telegram ulanishini uzasizmi?')) return;
    setBusy(true);
    try {
      await api.delete('/telegram-user/unlink');
      setStep('phone');
      setMsg('');
      setCode('');
      fetchStatus();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const handleSendTest = async () => {
    setError(''); setBusy(true);
    try {
      await api.post('/telegram-user/send-test', { chatId: testChatId || 'me' });
      setMsg('✅ Test xabari yuborildi!');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      setLoading(true);
      iframeRef.current.src = TELEGRAM_WEB_URL;
    }
  };

  return (
    <div className={`flex flex-col bg-gray-900 ${fullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-64px)]'}`}>
      {/* Header */}
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
            onClick={() => setShowAuth(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              status?.linked
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {status?.linked
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <Link className="w-3.5 h-3.5" />}
            {status?.linked ? `Ulangan: ${status.phone}` : 'Telegram ulash'}
          </button>

          <button onClick={handleReload} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Yangilash">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a href={TELEGRAM_WEB_URL} target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Yangi oynada ochish">
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={() => setFullscreen(f => !f)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Auth panel */}
      {showAuth && (
        <div className="shrink-0 border-b border-gray-700 p-4 bg-gray-800/95">
          <div className="max-w-lg mx-auto space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Link className="w-4 h-4 text-blue-400" />
              Kassir Telegram hisobi — chek va to'lovlarni avtomatik yuborish
            </h3>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded p-2 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {msg && (
              <div className="bg-green-900/40 border border-green-700 rounded p-2 text-green-300 text-xs">
                {msg}
              </div>
            )}

            {(step === 'idle' || step === 'phone') && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+998901234567"
                    className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    disabled={busy}
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={busy || phone.length < 10}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Kod yuborish
                </button>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-2">
                <p className="text-gray-400 text-xs">📱 Telegram ilovangizga kod yuborildi:</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="12345"
                      maxLength={6}
                      className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                      disabled={busy}
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={busy || code.length < 5}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-1.5"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Tasdiqlash
                  </button>
                  <button onClick={() => setStep('phone')} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm">
                    Orqaga
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-green-900/30 border border-green-700 rounded p-2.5 text-green-300 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
                    <div>
                      <div className="font-medium">{status?.phone}</div>
                      <div className="text-xs text-green-400">Sotuv va to'lovda mijozlarga chek avtomatik yuboriladi</div>
                    </div>
                  </div>
                  <button
                    onClick={handleUnlink}
                    disabled={busy}
                    className="px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded text-sm flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Link2Off className="w-3.5 h-3.5" />
                    Uzish
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    value={testChatId}
                    onChange={e => setTestChatId(e.target.value)}
                    placeholder="Chat ID (bo'sh qolsa — o'zingizga)"
                    className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                    disabled={busy}
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={busy}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Test yuborish
                  </button>
                </div>
              </div>
            )}

            <p className="text-gray-500 text-xs border-t border-gray-700 pt-2">
              💡 Mijoz qo'shilganda <strong className="text-gray-400">Telegram Chat ID</strong> kiriting.
              Sotuv yoki to'lov bo'lganda kassirning Telegramidan chek/tasdiq avtomatik boradi.
            </p>
          </div>
        </div>
      )}

      {/* Telegram Web Z iframe */}
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
