import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import { 
  Bot, 
  Send, 
  MessageCircle, 
  Users, 
  Package, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  RefreshCw
} from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { errorHandler } from '../lib/professionalErrorHandler';

interface CustomerMessage {
  id: string;
  customerName: string;
  message: string;
  telegramChatId: string;
  timestamp: string;
  status: 'new' | 'answered' | 'pending';
}

interface BotStats {
  totalCustomers: number;
  activeChats: number;
  todayMessages: number;
  pendingOrders: number;
}

export default function CashierBot() {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [stats, setStats] = useState<BotStats>({
    totalCustomers: 0,
    activeChats: 0,
    todayMessages: 0,
    pendingOrders: 0
  });
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadBotData();
    const interval = setInterval(loadBotData, 30000); // Har 30 sekundda yangilash
    return () => clearInterval(interval);
  }, []);

  const loadBotData = async () => {
    try {
      setLoading(true);
      // Real API call
      const [messagesRes, statsRes] = await Promise.all([
        api.get('/bot/messages').catch(() => ({ data: [] })),
        api.get('/bot/stats').catch(() => ({ 
          data: { totalCustomers: 0, activeChats: 0, todayMessages: 0, pendingOrders: 0 }
        }))
      ]);
      
      const apiMessages = messagesRes.data || [];
      const mappedMessages: CustomerMessage[] = apiMessages.map((msg: any) => ({
        id: msg.id,
        customerName: msg.customer?.name || msg.customerName || 'Noma\'lum',
        message: msg.message || msg.content || '',
        telegramChatId: msg.telegramChatId || msg.chatId || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        status: msg.status || 'new'
      }));
      
      setMessages(mappedMessages);
      setStats(statsRes.data || { totalCustomers: 0, activeChats: 0, todayMessages: 0, pendingOrders: 0 });
    } catch (error) {
      console.error('Bot data yuklashda xatolik:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    console.log('sendReply called, selectedMessage:', selectedMessage, 'replyText:', replyText);
    if (!selectedMessage || !replyText.trim()) {
      console.log('sendReply early return - missing data');
      return;
    }

    setSending(true);
    try {
      // Real API call
      await api.post('/bot/reply', {
        chatId: selectedMessage.telegramChatId,
        message: replyText,
        originalMessageId: selectedMessage.id
      });

      // Update message status
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id 
          ? { ...msg, status: 'answered' as const }
          : msg
      ));

      setReplyText('');
      setSelectedMessage(null);
      
      alert(latinToCyrillic('Javob yuborildi!'));
    } catch (error) {
      console.error('Javob yuborishda xatolik:', error);
      alert(latinToCyrillic('Xatolik yuz berdi!'));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return latinToCyrillic('hozir');
    if (minutes < 60) return `${minutes} ${latinToCyrillic('daqiqa oldin')}`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ${latinToCyrillic('soat oldin')}`;
    return date.toLocaleDateString('uz-UZ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-red-100 text-red-800 border-red-200';
      case 'answered': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-4 h-4" />;
      case 'answered': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Bot className="w-16 h-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-lg">{latinToCyrillic('Bot yuklanmoqda...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Bot className="w-12 h-12 animate-pulse" />
              <div>
                <h1 className="text-4xl font-bold">{latinToCyrillic('Кассир Боти')}</h1>
                <p className="text-blue-100 mt-2">{latinToCyrillic('Mijozlar bilan Telegram orqali muloqot')}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                console.log('Yangilash button clicked');
                loadBotData();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 rounded-xl font-medium text-sm transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              {latinToCyrillic('Yangilash')}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">{latinToCyrillic('Jami mijozlar')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">{latinToCyrillic('Faol suhbatlar')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.activeChats}</p>
                </div>
                <MessageCircle className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">{latinToCyrillic("Bugungi xabarlar")}</p>
                  <p className="text-3xl font-bold mt-2">{stats.todayMessages}</p>
                </div>
                <Send className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">{latinToCyrillic('Kutilayotgan buyurtmalar')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.pendingOrders}</p>
                </div>
                <Package className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages and Reply */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Messages List */}
          <Card className="shadow-2xl border-0 bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                {latinToCyrillic('Mijoz xabarlari')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedMessage?.id === message.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      console.log('Message clicked:', message);
                      setSelectedMessage(message);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-bold">{message.customerName}</p>
                          <p className="text-xs text-gray-500">{formatTime(message.timestamp)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(message.status)}`}>
                        {getStatusIcon(message.status)}
                        <span>
                          {message.status === 'new' && latinToCyrillic('Yangi')}
                          {message.status === 'answered' && latinToCyrillic('Javob berildi')}
                          {message.status === 'pending' && latinToCyrillic('Kutilmoqda')}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{message.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reply Panel */}
          <Card className="shadow-2xl border-0 bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Send className="w-6 h-6 text-green-600" />
                {latinToCyrillic('Javob yozish')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {selectedMessage ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">{selectedMessage.customerName}</p>
                        <p className="text-xs text-gray-500">{formatTime(selectedMessage.timestamp)}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{selectedMessage.message}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {latinToCyrillic('Javob matni:')}
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full h-32 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:text-white resize-none"
                      placeholder={latinToCyrillic('Javobingizni shu yerga yozing...')}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        console.log('Javob yuborish button clicked');
                        sendReply();
                      }}
                      disabled={!replyText.trim() || sending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all"
                    >
                      <Send className="w-5 h-5" />
                      {sending ? latinToCyrillic('Yuborilmoqda...') : latinToCyrillic('Javob yuborish')}
                    </button>
                    <button 
                      onClick={() => {
                        console.log('Bekor qilish button clicked');
                        setSelectedMessage(null);
                        setReplyText('');
                      }}
                      className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold text-sm transition-all"
                    >
                      {latinToCyrillic('Bekor qilish')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {latinToCyrillic('Javob berish uchun xabarni tanlang')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
