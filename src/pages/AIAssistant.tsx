import { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, Sparkles, Wand2, BarChart3, Package, 
  TrendingUp, Lightbulb, MessageSquare, Clock, User,
  ChevronRight, MoreHorizontal, RefreshCw, Copy, ThumbsUp, ThumbsDown
} from 'lucide-react';
import api from '../lib/professionalApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { icon: <BarChart3 className="w-4 h-4" />, label: 'Sotuv tahlili', prompt: 'Oxirgi oy sotuvlarimni tahlil qil', color: 'bg-blue-500' },
  { icon: <Package className="w-4 h-4" />, label: 'Ombor holati', prompt: 'Ombordagi mahsulotlar holatini ko\'rsat', color: 'bg-emerald-500' },
  { icon: <TrendingUp className="w-4 h-4" />, label: 'Moliyaviy prognoz', prompt: 'Keyingi oy daromadimni bashorat qil', color: 'bg-purple-500' },
  { icon: <Lightbulb className="w-4 h-4" />, label: 'Tavsiyalar', prompt: 'Biznesimni rivojlantirish uchun tavsiyalar', color: 'bg-amber-500' },
];

const mockResponses: Record<string, string> = {
  'Oxirgi oy sotuvlarimni tahlil qil': `Oxirgi oy sotuvlar tahlili:

📈 **Umumiy ko'rsatkichlar:**
• Jami sotuv: 234 ta
• Daromad: 67,000,000 so'm
• O'rtacha chek: 286,000 so'm

🏆 **Eng sotiladigan mahsulotlar:**
1. Plastik konteyner 5L - 89 ta
2. PET butilka 1.5L - 76 ta
3. Qopqoq universal - 45 ta

📊 **O'sish dinamikasi:**
• Oldingi oyga nisbatan: +23%
• Eng yaxshi kun: 15-yanvar (12,500,000 so'm)`,

  'Ombordagi mahsulotlar holatini ko\'rsat': `Ombor holati:

📦 **Umumiy:**
• Jami mahsulot turlari: 156
• Umumiy qiymat: 1.2 mlrd so'm
• Bo'sh joy: 35%

⚠️ **Diqqat talab qiluvchi:**
• Kam qolgan: Plastik idish 2L (12 dona qoldi)
• Ortiqcha: PET butilka 0.5L (450 dona)

✅ **Normal holat:**
• Qolgan mahsulotlar yetarli darajada`,

  'Keyingi oy daromadimni bashorat qil': `Moliyaviy prognoz (Fevral 2024):

💰 **Kutilayotgan ko'rsatkichlar:**
• Daromad: 72-78 mln so'm (+8-12%)
• Xarajatlar: 42 mln so'm
• Sof foyda: 30-36 mln so'm

📊 **Bashorat asoslari:**
• Mavsumiy o'sish
• Yangi mijozlar oqimi
• Marketing kampaniyalari

⚠️ **Xatarlar:**
• Xom ashyo narxlari o'zgarishi
• Transport xarajatlari`,

  'Biznesimni rivojlantirish uchun tavsiyalar': `Biznes rivojlantirish tavsiyalari:

🎯 **Qisqa muddatli:**
• Eng sotiladigan 3 mahsulotga aksiya qiling
• Mijozlar bazasini kengaytiring
• Sotuvchilar uchun bonus tizimi yarating

📈 **O'rta muddatli:**
• Yangi mahsulot liniyasi qo'shing
• Onlayn savdo kanallarini oching
• Avtomatlashtirish tizimlarini joriy qiling

🏢 **Uzoq muddatli:**
• Yangi filial ochish
• Eksport imkoniyatlarini o'rganish
• Xodimlar malakasini oshirish`,
};

const welcomeMessage = `Salom! 👋 Men sizning AI yordamchingizman.

Quyidagi mavzular bo'yicha yordam bera olaman:
• 📊 Sotuvlar tahlili
• 📦 Ombor boshqaruvi
• 💰 Moliyaviy prognozlar
• 💡 Biznes tavsiyalari

Savolingizni yozing yoki tezkor tugmalardan foydalaning!`;

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Real AI API call
    try {
      const response = await api.post('/ai/chat', { message: text });
      const aiResponse = response.data?.response || response.data?.message || 'Kechirasiz, javob berishda muammo yuz berdi.';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.data?.suggestions || ['Rahmat', 'Batafsilroq', 'Boshqa savol'],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Kechirasiz, xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.',
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Qayta urinish', 'Boshqa savol'],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  AI Assistant
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs rounded-full">
                    Beta
                  </span>
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">LuxPetPlast AI yordamchi</p>
              </div>
            </div>
            <button 
              title="Yangi suhbat"
              aria-label="Yangi suhbat boshlash"
              onClick={() => setMessages([messages[0]])}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                  : 'bg-gradient-to-br from-violet-500 to-purple-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-600" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-bl-none shadow-sm'
                }`}>
                  <p className={`text-sm whitespace-pre-line ${message.role === 'user' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {message.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">{message.timestamp}</span>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-1">
                      <button 
                        title="Nusxa olish"
                        aria-label="Nusxa olish"
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button 
                        title="Yoqdi"
                        aria-label="Yoqdi"
                        className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button 
                        title="Yoqmadi"
                        aria-label="Yoqmadi"
                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors flex-shrink-0"
              >
                <div className={`w-6 h-6 ${action.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-white">{action.icon}</span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 dark:bg-gray-700 rounded-2xl p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Savolingizni yozing..."
              className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              title="Yuborish"
              aria-label="Yuborish"
              className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            AI yordamchi eksperimental xizmat. Javoblar aniqligi kafolatlanmaydi.
          </p>
        </div>
      </div>
    </div>
  );
}
