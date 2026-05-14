import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { restoreLastSession } from '../lib/authUtils';

export default function CashierLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Sessiyani tiklash
  useEffect(() => {
    const session = restoreLastSession();
    if (session) {
      console.log('ðŸ”„ Sessiya tiklanmoqda:', session.path);
      // Agar avvalgi sahifa saqlangan bo'lsa, uni eslatish
      setError(`⏰ Uzoq vaftdan keyin qayta login qiling. Avvalgi sahifa: ${session.path}`);
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
        setError('❌ Faqat kassirlar uchun login!');
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
      const errorMsg = error.response?.data?.error || 'Кириш муваффақиятсиз. Login ёки парол хато.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAdmin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white border-2 border-green-200 rounded-xl shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">ðŸ’°</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800 mb-2">
            Кассир Тизими
          </h1>
          <p className="text-gray-600">
            Lux Pet Plast - Сотув тизими
          </p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="👤 Логин"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Кассир логини"
            required
            className="border-green-300 focus:border-green-500"
          />
          
          <Input
            label="🔐 Парол"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Парол"
            required
            className="border-green-300 focus:border-green-500"
          />
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-pulse mr-2"></div>
                Кириш...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                💼 Кассир сифатида кириш
              </span>
            )}
          </Button>
        </form>
        
        {/* Admin login ga qaytish */}
        <div className="mt-6 text-center">
          <button
            onClick={handleBackToAdmin}
            className="text-green-600 hover:text-green-800 text-sm font-medium underline"
          >
            🏢 Админ сифатида кириш
          </button>
        </div>
        
        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            <strong>Эслатма:</strong> Кассирлар фақат sotuvlar билан ишлай олади
          </p>
        </div>
      </div>
    </div>
  );
}
