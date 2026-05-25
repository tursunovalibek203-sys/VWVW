import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BarChart3,
  Package,
  TrendingUp,
  Lightbulb,
  User,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { useToast } from '../components/ui/Toast';
import { latinToCyrillic } from '../lib/transliterator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface QuickPrompt {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  gradient: string;
}

// AI yordamchi hozircha mavjud emas — backend /ai/chat route'i yo'q.
// Bu yerda hech qanday soxta javob ko'rsatilmaydi: so'rov yuboriladi,
// muvaffaqiyatsiz bo'lsa — halol xato holati + Toast ko'rsatiladi.
const AI_UNAVAILABLE = 'AI ёрдамчи ҳозирча мавжуд эмас';

const quickPrompts: QuickPrompt[] = [
  {
    icon: <BarChart3 className="w-5 h-5" />,
    label: 'Сотув таҳлили',
    prompt: 'Охирги ой сотувларимни таҳлил қил',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: 'Омбор ҳолати',
    prompt: 'Омбордаги маҳсулотлар ҳолатини кўрсат',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Молиявий прогноз',
    prompt: 'Кейинги ой даромадимни башорат қил',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    label: 'Тавсиялар',
    prompt: 'Бизнесимни ривожлантириш учун тавсиялар',
    gradient: 'from-amber-500 to-amber-600',
  },
];

const nowTime = () =>
  new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

export default function AIAssistant() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: trimmed,
      timestamp: nowTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Haqiqiy backend so'rovi. /ai/chat route'i hali mavjud emas —
    // shuning uchun bu deyarli har doim catch'ga tushadi. Biz soxta
    // javob ясамаймиз, faqat halol xato holatini ko'rsatamiz.
    try {
      const response = await api.post('/ai/chat', { message: trimmed });
      const aiResponse: string | undefined =
        response.data?.response || response.data?.message;

      if (!aiResponse) {
        throw new Error('empty-response');
      }

      const assistantMessage: Message = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: aiResponse,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);

      const errorMessage: Message = {
        id: `${Date.now()}-e`,
        role: 'assistant',
        content:
          'AI ёрдамчи ҳозирча мавжуд эмас. Хизмат уланганидан сўнг саволларингизга жавоб бера оламан.',
        timestamp: nowTime(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);

      addToast({
        type: 'error',
        title: AI_UNAVAILABLE,
        message: 'Сервер билан боғланиб бўлмади. Кейинроқ қайта уриниб кўринг.',
      });
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {/* Gradient hero header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 sm:p-6 shadow-glass-lg flex-shrink-0">
          <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-6 w-44 h-44 bg-white/5 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    AI ёрдамчи
                  </h1>
                  <span className="px-2 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full backdrop-blur-sm flex-shrink-0">
                    Beta
                  </span>
                </div>
                <p className="text-sm text-blue-100/90 truncate">
                  {latinToCyrillic('Looks Pet Plus')} · ақлли бизнес таҳлилчи
                </p>
              </div>
            </div>
            {hasMessages && (
              <button
                onClick={handleReset}
                title="Янги суҳбат"
                aria-label="Янги суҳбат бошлаш"
                className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-colors active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Янги суҳбат</span>
              </button>
            )}
          </div>
        </div>

        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto mt-4 -mx-1 px-1">
          {!hasMessages ? (
            <EmptyConversation onPick={handleSend} />
          ) : (
            <div className="space-y-5 pb-2">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky input bar */}
        <div className="flex-shrink-0 pt-4">
          <div className="bg-white rounded-2xl shadow-glass border border-gray-100 p-2">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping}
                placeholder="Саволингизни ёзинг…"
                aria-label="Саволингизни ёзинг"
                className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-400 disabled:opacity-60 text-sm"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                title="Юбориш"
                aria-label="Юбориш"
                className="flex-shrink-0 inline-flex items-center justify-center w-11 h-11 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            AI ёрдамчи эксперيментал хизмат. Жавоблар аниқлиги кафолатланмайди.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyConversation({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12 px-4">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center shadow-glass mb-5">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
        Сизга қандай ёрдам бера оламан?
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-8">
        Сотувлар, омбор, молия ва бизнес ривожи бўйича савол беринг ёки қуйидаги
        тайёр мавзулардан бирини танланг.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {quickPrompts.map((item) => (
          <button
            key={item.label}
            onClick={() => onPick(item.prompt)}
            className="group flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-glass hover:border-gray-200 transition-all text-left active:scale-[0.98]"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}
            >
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {item.label}
              </p>
              <p className="text-xs text-gray-500 truncate">{item.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          isUser
            ? 'bg-blue-100'
            : message.isError
            ? 'bg-amber-100'
            : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : message.isError ? (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md shadow-sm'
              : message.isError
              ? 'bg-amber-50 border border-amber-200 text-amber-800 rounded-bl-md'
              : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {message.content}
          </p>
        </div>
        <span
          className={`block text-[11px] text-gray-400 mt-1.5 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
