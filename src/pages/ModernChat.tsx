import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Search,
  MessageCircle,
  X,
  MapPin,
  Pin,
  Star,
  Forward,
  Image as ImageIcon,
  FileText,
  Download,
  Reply,
  Square,
  BarChart,
  Mic,
  Check,
  CheckCheck,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Inbox,
  Paperclip,
  Smile,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';

interface Message {
  id: string;
  text: string;
  senderName: string;
  senderType: 'customer' | 'admin' | 'bot';
  messageType: 'text' | 'image' | 'file' | 'voice' | 'video' | 'sticker' | 'gif' | 'location' | 'contact' | 'poll' | 'quiz';
  isRead: boolean;
  isEdited: boolean;
  isForwarded: boolean;
  isPinned: boolean;
  isStarred: boolean;
  isDeleted: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  forwardFrom?: {
    id: string;
    senderName: string;
    senderType: string;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  attachments?: {
    type: 'image' | 'file' | 'voice' | 'video' | 'sticker' | 'gif' | 'location' | 'contact';
    url: string;
    name: string;
    size: number;
    duration?: number;
    thumbnail?: string;
    metadata?: any;
  }[];
  poll?: {
    id: string;
    question: string;
    options: {
      text: string;
      votes: number;
      voters: string[];
    }[];
    isAnonymous: boolean;
    allowsMultipleAnswers: boolean;
    isClosed: boolean;
    totalVoters: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    venue?: {
      name: string;
      address: string;
    };
  };
  contact?: {
    firstName: string;
    lastName?: string;
    phoneNumber: string;
    userId?: string;
    vcard?: string;
  };
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  sender?: {
    name: string;
    avatar?: string;
    status?: string;
  };
  readAt?: Date;
  deliveredAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  telegramUsername?: string;
  lastMessage?: {
    text: string;
    senderType: string;
    messageType: string;
    createdAt: Date;
    isRead: boolean;
  };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isStarred: boolean;
  isOnline: boolean;
  lastSeen?: Date;
  typingStatus?: {
    isTyping: boolean;
    lastTyped: Date;
  };
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Bitta belgidan iborat avatar harfini olish
const initialOf = (name: string) => (name?.trim()?.[0] || '?').toUpperCase();

export default function ModernChat() {
  const { addToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'unread' | 'priority'>('recent');

  // Ovozli xabar yozish holati
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/customer-chat/conversations');
      setConversations(response.data || []);
      setLoadError(false);
    } catch (error) {
      console.error('Fetch conversations error:', error);
      setLoadError(true);
      addToast({
        type: 'error',
        title: latinToCyrillic('Suhbatlarni yuklab bolmadi'),
        message: latinToCyrillic('Internet aloqasini tekshirib qayta urinib koring.'),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await api.get(`/customer-chat/conversations/${conversationId}/messages`);
      setMessages(response.data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Fetch messages error:', error);
      addToast({
        type: 'error',
        title: latinToCyrillic('Xabarlarni yuklab bolmadi'),
        message: latinToCyrillic('Server bilan aloqa uzildi. Qayta urinib koring.'),
      });
    }
  }, [scrollToBottom, addToast]);

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            setIsRecording(false);
            clearInterval(interval);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendMessage('', 'location', [], {
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        (_error) => {
          addToast({
            type: 'error',
            title: latinToCyrillic('Joylashuv olinmadi'),
            message: latinToCyrillic('Ruxsat berilmadi yoki joylashuv faol emas.'),
          });
        }
      );
    } else {
      addToast({
        type: 'warning',
        title: latinToCyrillic('Joylashuv mavjud emas'),
        message: latinToCyrillic('Brauzeringiz buni qollab-quvvatlamaydi.'),
      });
    }
  };

  // Send message
  const sendMessage = useCallback(async (text: string = '', messageType: string = 'text', attachments: { type: string; url: string; name: string; size: number }[] = [], extraData: Record<string, unknown> = {}) => {
    const messageText = text || newMessage;
    if (!messageText.trim() && attachments.length === 0) return;
    if (!selectedConversation || sending) return;

    setSending(true);
    try {
      const messageData = {
        text: messageText.trim(),
        messageType,
        attachments,
        replyTo: replyingTo?.id,
        ...extraData
      };

      await api.post(`/customer-chat/${selectedConversation.id}/send`, messageData);

      // Clear input and reply state
      setNewMessage('');
      setReplyingTo(null);

      // Refresh messages and conversations
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      console.error('Send message error:', error);
      addToast({
        type: 'error',
        title: latinToCyrillic('Xabar yuborilmadi'),
        message: latinToCyrillic('Server bilan aloqa uzildi. Qayta urinib koring.'),
      });
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConversation, sending, replyingTo, fetchMessages, fetchConversations, addToast]);

  // Handle form submit
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    await sendMessage();
  }, [sendMessage]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!typing) {
      setTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [typing]);

  // Filter and sort conversations
  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.customerPhone.includes(searchQuery) ||
                           conv.lastMessage?.text.toLowerCase().includes(searchQuery.toLowerCase());

      switch (filterStatus) {
        case 'unread':
          return matchesSearch && conv.unreadCount > 0;
        case 'starred':
          return matchesSearch && conv.isStarred;
        case 'archived':
          return matchesSearch && conv.isArchived;
        default:
          return matchesSearch && !conv.isArchived;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'unread':
          return b.unreadCount - a.unreadCount;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime();
      }
    });

  // Format message time
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return messageDate.toLocaleDateString('uz-UZ', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
    }
  };

  // Get message status icon
  const getMessageStatusIcon = (message: Message) => {
    if (message.senderType !== 'admin') return null;

    if (message.isRead) {
      return <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />;
    } else if (message.deliveredAt) {
      return <CheckCheck className="w-3.5 h-3.5 text-indigo-200/70" />;
    } else {
      return <Check className="w-3.5 h-3.5 text-indigo-200/70" />;
    }
  };

  // Effects
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]">
      <div className="h-full flex bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(15,23,42,0.06)] overflow-hidden">
        {/* ============ LEFT PANE: conversation list ============ */}
        <aside
          className={`${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          } w-full lg:w-[340px] xl:w-[380px] flex-col border-r border-slate-200/70 bg-white`}
        >
          {/* Clean list header */}
          <div className="px-5 pt-5 pb-4 flex-shrink-0 border-b border-slate-200/70">
            <div className="flex items-center gap-3 mb-4">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {latinToCyrillic('Suhbatlar')}
                </h1>
                <p className="text-xs text-slate-500 truncate tabular-nums">
                  {conversations.length} {latinToCyrillic('suhbat')}
                  {totalUnread > 0 && ` · ${totalUnread} ўқилмаган`}
                </p>
              </div>
              <button
                onClick={fetchConversations}
                disabled={loading}
                title={latinToCyrillic('Qayta yuklash')}
                aria-label={latinToCyrillic('Qayta yuklash')}
                className="ml-auto flex-shrink-0 p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 transition-colors active:scale-[0.98] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={latinToCyrillic('Qidiruv...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={latinToCyrillic('Qidiruv')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Filter / sort row */}
          <div className="flex gap-2 px-4 py-3 border-b border-slate-200/70 flex-shrink-0">
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="flex-1 px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              aria-label="Holat boyicha filtr"
            >
              <option value="all">{latinToCyrillic('Barchasi')}</option>
              <option value="unread">Ўқилмаган</option>
              <option value="starred">{latinToCyrillic('Yulduzcha')}</option>
            </select>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="flex-1 px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              aria-label="Saralash"
            >
              <option value="recent">{latinToCyrillic('Songi')}</option>
              <option value="unread">Ўқилмаган</option>
              <option value="priority">{latinToCyrillic('Muhim')}</option>
            </select>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading && conversations.length === 0 ? (
              <ConversationListSkeleton />
            ) : loadError && conversations.length === 0 ? (
              <EmptyState
                icon={RefreshCw}
                title={latinToCyrillic('Xatolik yuz berdi')}
                description={latinToCyrillic('Suhbatlarni yuklab bolmadi.')}
                action={
                  <button
                    onClick={fetchConversations}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {latinToCyrillic('Qayta yuklash')}
                  </button>
                }
              />
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={latinToCyrillic('Suhbatlar yoq')}
                description={latinToCyrillic('Hozircha hech qanday suhbat mavjud emas. Mijoz xabar yozsa shu yerda paydo boladi.')}
              />
            ) : (
              <ul className="py-2 px-2 space-y-0.5">
                {filteredConversations.map((conversation) => {
                  const active = selectedConversation?.id === conversation.id;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          active
                            ? 'bg-indigo-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold overflow-hidden ${
                            active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {conversation.customerAvatar ? (
                              <img src={conversation.customerAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-base">{initialOf(conversation.customerName)}</span>
                            )}
                          </div>
                          {conversation.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className={`text-sm font-semibold truncate ${active ? 'text-indigo-900' : 'text-slate-900'}`}>
                              {conversation.customerName}
                            </h3>
                            {conversation.isPinned && <Pin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                            {conversation.isStarred && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                            <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0 tabular-nums">
                              {conversation.lastMessage && formatMessageTime(conversation.lastMessage.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                              {conversation.lastMessage?.text || latinToCyrillic('Yangi suhbat')}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-full tabular-nums">
                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ============ RIGHT PANE: message thread ============ */}
        <section
          className={`${
            selectedConversation ? 'flex' : 'hidden lg:flex'
          } flex-1 flex-col min-w-0 bg-slate-50/50`}
        >
          {selectedConversation ? (
            <>
              {/* Thread header */}
              <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/70 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Орқага"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-semibold overflow-hidden">
                    {selectedConversation.customerAvatar ? (
                      <img src={selectedConversation.customerAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm">{initialOf(selectedConversation.customerName)}</span>
                    )}
                  </div>
                  {selectedConversation.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 truncate">{selectedConversation.customerName}</h2>
                  <p className="text-xs text-slate-500 truncate">
                    {selectedConversation.isOnline
                      ? latinToCyrillic('Onlayn')
                      : selectedConversation.lastSeen
                        ? `${latinToCyrillic('Songi faollik')}: ${formatMessageTime(selectedConversation.lastSeen)}`
                        : latinToCyrillic('Oflayn')}
                  </p>
                </div>
                {selectedConversation.priority === 'urgent' || selectedConversation.priority === 'high' ? (
                  <Badge variant={selectedConversation.priority === 'urgent' ? 'error' : 'warning'} className="ml-auto flex-shrink-0">
                    {latinToCyrillic('Muhim')}
                  </Badge>
                ) : null}
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState
                      icon={MessageCircle}
                      title={latinToCyrillic('Hali xabar yoq')}
                      description={latinToCyrillic('Birinchi xabarni yozib suhbatni boshlang.')}
                    />
                  </div>
                ) : (
                  messages.map((message) => {
                    const isAdmin = message.senderType === 'admin';
                    return (
                      <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[78%] sm:max-w-md lg:max-w-lg">
                          {/* Reply preview */}
                          {message.replyTo && (
                            <div className={`mb-1.5 px-3 py-1.5 rounded-xl border-l-2 ${isAdmin ? 'bg-indigo-50 border-indigo-400 ml-auto' : 'bg-slate-100 border-slate-300'}`}>
                              <p className="text-[11px] font-semibold text-slate-600 mb-0.5">
                                {latinToCyrillic('Javob berilmoqda')} · {message.replyTo.senderName}
                              </p>
                              <p className="text-xs text-slate-600 truncate">{message.replyTo.text}</p>
                            </div>
                          )}

                          <div
                            className={`px-4 py-2.5 ${
                              isAdmin
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
                                : 'bg-white text-slate-800 border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-2xl rounded-bl-md'
                            }`}
                          >
                            {message.isForwarded && (
                              <div className={`flex items-center gap-1 mb-1 text-[11px] ${isAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>
                                <Forward className="w-3 h-3" />
                                <span>Йуборилган</span>
                              </div>
                            )}

                            {message.text && (
                              <p className="text-sm leading-relaxed whitespace-pre-line break-words">{message.text}</p>
                            )}

                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {message.attachments.map((attachment, index) => (
                                  <div
                                    key={index}
                                    className={`flex items-center gap-2 p-2 rounded-xl ${isAdmin ? 'bg-white/15' : 'bg-slate-50'}`}
                                  >
                                    {attachment.type === 'image' ? (
                                      <ImageIcon className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <span className="text-xs truncate">{attachment.name}</span>
                                    <Download className="w-3.5 h-3.5 ml-auto cursor-pointer flex-shrink-0 opacity-70 hover:opacity-100" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Inline meta inside bubble */}
                            <div className={`flex items-center gap-1.5 mt-1 text-[10px] tabular-nums ${isAdmin ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                              {message.isEdited && <span>({latinToCyrillic('tahrirlandi')})</span>}
                              <span>{formatMessageTime(message.createdAt)}</span>
                              {getMessageStatusIcon(message)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply indicator */}
              {replyingTo && (
                <div className="px-4 sm:px-6 py-2.5 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-indigo-700 flex-shrink-0">
                      {latinToCyrillic('Javob berilmoqda')}
                    </span>
                    <p className="text-sm text-indigo-600/80 truncate">{replyingTo.text}</p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors flex-shrink-0"
                    aria-label={latinToCyrillic('Bekor qilish')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div className="px-4 sm:px-6 py-2.5 bg-red-50 border-t border-red-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-red-700 tabular-nums">
                      {latinToCyrillic('Yozilmoqda')} {recordingTime}s
                    </span>
                  </div>
                  <button
                    onClick={handleVoiceRecord}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                    aria-label={latinToCyrillic('Toxtatish')}
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sticky input bar */}
              <div className="bg-white border-t border-slate-200/70 px-3 sm:px-4 py-3 flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                  {/* Attach group */}
                  <div className="flex items-center gap-1 pb-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title={latinToCyrillic('Fayl biriktirish')}
                      aria-label={latinToCyrillic('Fayl biriktirish')}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleLocationShare}
                      className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title={latinToCyrillic('Lokatsiya')}
                      aria-label={latinToCyrillic('Lokatsiya')}
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => sendMessage(latinToCyrillic('Yangi sorovnoma'), 'poll', [], {
                        poll: {
                          question: latinToCyrillic('Bu xizmat qulaymi?'),
                          options: [
                            { text: latinToCyrillic('Ha'), votes: 0, voters: [] },
                            { text: latinToCyrillic('Yoq'), votes: 0, voters: [] }
                          ],
                          isAnonymous: false,
                          allowsMultipleAnswers: false,
                          isClosed: false,
                          totalVoters: 0
                        }
                      })}
                      className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title={latinToCyrillic('Sorovnoma')}
                      aria-label={latinToCyrillic('Sorovnoma')}
                    >
                      <BarChart className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title="Emoji"
                      aria-label="Emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Text input */}
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      placeholder={latinToCyrillic('Xabar yozing...')}
                      aria-label={latinToCyrillic('Xabar yozing')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 placeholder-slate-400 min-h-[44px] max-h-32 transition-all"
                      rows={1}
                    />
                  </div>

                  {/* Voice / Send */}
                  <div className="flex items-center gap-1 pb-0.5">
                    <button
                      type="button"
                      onClick={handleVoiceRecord}
                      className={`p-2 rounded-xl transition-colors ${
                        isRecording ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      }`}
                      title={latinToCyrillic('Ovozli xabar')}
                      aria-label={latinToCyrillic('Ovozli xabar')}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !isRecording) || sending}
                      className="flex-shrink-0 inline-flex items-center justify-center w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                      title={sending ? latinToCyrillic('Yuborilmoqda...') : latinToCyrillic('Yuborish')}
                      aria-label={sending ? latinToCyrillic('Yuborilmoqda...') : latinToCyrillic('Yuborish')}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>

                  <input ref={fileInputRef} type="file" className="hidden" aria-hidden="true" tabIndex={-1} />
                </form>
              </div>
            </>
          ) : (
            /* No conversation selected (desktop) */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  {latinToCyrillic('Suhbatni tanlang')}
                </h2>
                <p className="text-sm text-slate-500">
                  {latinToCyrillic('Chap tomondan suhbatni tanlang va yozishni boshlang.')}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Conversation list loading skeleton (matches CardSkeleton style)
function ConversationListSkeleton() {
  return (
    <div className="py-2 px-2 space-y-0.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-2 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
