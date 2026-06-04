import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import {
  Factory,
  ShieldCheck,
  Banknote,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState<'admin' | 'cashier'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let endpoint = '/auth/login';
      let requestData: any = {};
      
      if (loginType === 'admin') {
        endpoint = '/auth/login';
        requestData = { login, password };
      } else if (loginType === 'cashier') {
        endpoint = '/auth/cashier-login';
        requestData = { login, password };
      }
      
      const { data } = await api.post(endpoint, requestData);
      
      if (!data.token || !data.user) {
        throw new Error('Serverdan noto\'g\'ri ma\'lumot keldi');
      }

      setAuth(data.token, data.user);
      
      const role = data.user.role?.toUpperCase();
      if (role === 'CASHIER' || role === 'SELLER') {
        navigate('/cashier/sales');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMsg = error.details?.error || error.response?.data?.error || error.message || 'Кириш муваффақиятсиз. Фойдаланувчи номи ёки парол хато.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 bg-gradient-mesh p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-dots-pattern opacity-30"></div>
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float animate-float-delay-2s"
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse-glow"></div>

      <div className={`w-full max-w-[420px] relative z-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Main Card */}
        <div className="glass-card rounded-3xl shadow-premium overflow-hidden hover-lift">
          <div className="p-8">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-glow ring-4 ring-white/20 transition-all duration-500 hover:scale-110">
                <Factory className="w-10 h-10 text-white animate-pulse-soft" />
              </div>

              <h1 className="text-2xl font-bold text-gradient text-center mb-1 tracking-tight">
                LUX PET PLAST
              </h1>
              <p className="text-sm text-slate-500">{latinToCyrillic('Zavod Boshqaruv Tizimi')}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700 font-medium leading-snug">{error}</p>
              </div>
            )}

            {/* Login Type Toggle */}
            <div className="mb-6" role="tablist" aria-label={latinToCyrillic('Kirish turi')}>
              <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginType === 'admin'}
                  onClick={() => setLoginType('admin')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    loginType === 'admin'
                      ? 'btn-gradient-primary shadow-lg'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-white/80'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{latinToCyrillic('Admin')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginType === 'cashier'}
                  onClick={() => setLoginType('cashier')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    loginType === 'cashier'
                      ? 'btn-gradient-primary shadow-lg'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-white/80'
                  }`}
                >
                  <Banknote className="w-4 h-4 shrink-0" />
                  <span>{latinToCyrillic('Kassir')}</span>
                </button>
              </div>
            </div>
            
            {/* Regular Login Form */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login" className="block text-sm font-semibold text-slate-700 px-1">
                  {latinToCyrillic('Foydalanuvchi nomi')}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200 pointer-events-none">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="login"
                    name="login"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder={latinToCyrillic('Foydalanuvchi nomini kiriting')}
                    required
                    autoFocus
                    autoComplete="username"
                    className="input-glass w-full pl-12 pr-4 text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 px-1">
                  {latinToCyrillic('Parol')}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={latinToCyrillic('Parolni kiriting')}
                    required
                    autoComplete="current-password"
                    className="input-glass w-full pl-12 pr-12 text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                    aria-label={showPassword ? latinToCyrillic('Parolni yashirish') : latinToCyrillic('Parolni ko\'rsatish')}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient-primary py-3.5 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {latinToCyrillic('Kirish')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
