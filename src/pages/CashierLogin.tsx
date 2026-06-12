import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { restoreLastSession } from '../lib/authUtils';
import { latinToCyrillic } from '../lib/transliterator';
import {
  Banknote,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Info,
} from 'lucide-react';

export default function CashierLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Sessiyani tiklash
  useEffect(() => {
    setIsVisible(true);
    const session = restoreLastSession();
    if (session) {
      // Avvalgi sahifa saqlangan bo'lsa, qayta login qilishni eslatish
      setError(
        latinToCyrillic(`Uzoq vaqtdan keyin qayta login qiling. Avvalgi sahifa: `) + session.path
      );
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Kassir logini - login orqali
      const { data } = await api.post('/auth/cashier-login', { login, password });
      setAuth(data.token, data.user);

      // Kassir roli tekshiruvi
      if (data.user.role?.toLowerCase() !== 'cashier') {
        setError(latinToCyrillic('Faqat kassirlar uchun login!'));
        return;
      }

      // Sessiyani tozalash va avvalgi sahifaga yo'naltirish
      sessionStorage.removeItem('lastSession');

      // Agar avvalgi sahifa saqlangan bo'lsa, o'sha sahifaga yo'naltirish
      const session = restoreLastSession();
      if (session && session.path !== '/login' && session.path !== '/') {
        navigate(session.path);
      } else {
        navigate('/sales');
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        latinToCyrillic('Kirish muvaffaqiyatsiz. Login yoki parol xato.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAdmin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4" style={{ background: '#070d1e' }}>
      {/* Glow orbs */}
      <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 65%)' }} />
      <div className="absolute top-[30%] right-[15%] w-[350px] h-[350px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />

      {/* Fine grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 110% 110% at 50% 50%, transparent 45%, rgba(4,6,20,0.65) 100%)' }} />

      <div
        className={`w-full max-w-[420px] relative z-10 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Main Card */}
        <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 40px 100px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)' }}>
          {/* Top accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-5 sm:p-8">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-glow ring-4 ring-white/20 transition-all duration-500 hover:scale-110 hover:rotate-3">
                <Banknote className="w-10 h-10 text-white animate-pulse-soft" />
              </div>

              <h1 className="text-2xl font-bold text-gradient text-center mb-1">
                {latinToCyrillic('Kassir Tizimi')}
              </h1>
              <p className="text-sm text-gray-500">{latinToCyrillic('Lux Pet Plast - Sotuv tizimi')}</p>
            </div>

            {/* Error / Info Message */}
            {error && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                <p className="text-sm text-rose-600 font-medium break-words">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Login Input */}
              <div>
                <label
                  htmlFor="cashier-login"
                  className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1"
                >
                  {latinToCyrillic('Login')}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all duration-300 group-focus-within:scale-110">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="cashier-login"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder={latinToCyrillic('Kassir logini')}
                    required
                    autoFocus
                    autoComplete="username"
                    className="input-glass w-full pl-12 pr-4 text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="cashier-password"
                  className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1"
                >
                  {latinToCyrillic('Parol')}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all duration-300 group-focus-within:scale-110">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="cashier-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={latinToCyrillic('Parol')}
                    required
                    autoComplete="current-password"
                    className="input-glass w-full pl-12 pr-12 text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={latinToCyrillic(showPassword ? 'Parolni yashirish' : 'Parolni korsatish')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-all duration-300 p-1.5 rounded-lg hover:bg-blue-50 hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button - large, touch-friendly */}
              <button
                type="submit"
                disabled={loading}
                className="btn-gradient-primary w-full py-4 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{latinToCyrillic('Kirishmoqda...')}</span>
                  </>
                ) : (
                  <>
                    <span>{latinToCyrillic('Kassir sifatida kirish')}</span>
                    <ArrowRight className="w-5 h-5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Back to admin login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleBackToAdmin}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors duration-300"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{latinToCyrillic('Admin sifatida kirish')}</span>
              </button>
            </div>

            {/* Info note */}
            <div className="mt-6 pt-5 border-t border-slate-200/50">
              <div className="flex items-start gap-2.5 text-sm text-slate-500">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <p>{latinToCyrillic('Kassirlar faqat sotuvlar bilan ishlay oladi.')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-white/30 mt-5 select-none tracking-wide">
          LUX PET PLAST ERP &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
