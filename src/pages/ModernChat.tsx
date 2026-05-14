import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Search, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Check, 
  CheckCheck,
  User,
  RefreshCw,
  MessageCircle,
  X,
  MapPin,
  Pin,
  Star,
  Info,
  Forward,
  Image,
  FileText,
  Download,
  Reply,
  Square,
  BarChart,
  Calendar,
  Moon,
  Sun,
  Bell
} from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';

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

export default function ModernChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'unread' | 'priority'>('recent');
  
  // New Telegram features
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isVideoMode, setIsVideoMode] = useState(false);
  
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
    } catch (error) {
      // Error handled by error state
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await api.get(`/customer-chat/${conversationId}/messages`);
      setMessages(response.data || []);
      scrollToBottom();
    } catch (error) {
      // Error handled by error state
    }
  }, [scrollToBottom]);

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

  const handleVideoRecord = () => {
    setIsVideoMode(!isVideoMode);
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
          alert(latinToCyrillic('Geolokatsiya olishda xatolik: Ruxsat berilmagan yoki GPS yoqilmagan'));
        }
      );
    } else {
      alert(latinToCyrillic('Brauzeringiz geolokatsiyani qo\'llab-quvvatlamaydi'));
    }
  };

  const handleThemeToggle = () => {
    const newTheme = selectedTheme === 'light' ? 'dark' : 'light';
    setSelectedTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleNotificationToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
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
      // Error handled by UI state
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConversation, sending, replyingTo, fetchMessages, fetchConversations]);

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
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator after 3 seconds
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
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (message.deliveredAt) {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-gray-900">{latinToCyrillic('Chat')}</h1>
                  <p className="text-xs text-gray-500">{conversations.length} {latinToCyrillic('suhbat')}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menyu"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={latinToCyrillic('Qidiruv...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-2 mb-3">
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="flex-1 px-3 py-1 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Holat bo'yicha filtr"
                >
                  <option value="all">{latinToCyrillic('Barchasi')}</option>
                  <option value="unread">{latinToCyrillic('O\'qilmagan')}</option>
                  <option value="starred">{latinToCyrillic('Yulduzcha')}</option>
                </select>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="flex-1 px-3 py-1 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Saralash"
                >
                  <option value="recent">{latinToCyrillic('So\'nggi')}</option>
                  <option value="unread">{latinToCyrillic('O\'qilmagan')}</option>
                  <option value="priority">{latinToCyrillic('Muhim')}</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                    {conversation.customerAvatar ? (
                      <img src={conversation.customerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  {conversation.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{conversation.customerName}</h3>
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessage && formatMessageTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage?.text || latinToCyrillic('Yangi suhbat')}
                      </p>
                      <div className="flex items-center gap-1">
                        {conversation.isPinned && <Pin className="w-3 h-3 text-yellow-500" />}
                        {conversation.isStarred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                      {selectedConversation.customerAvatar ? (
                        <img src={selectedConversation.customerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    {selectedConversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedConversation.customerName}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.isOnline ? latinToCyrillic('Onlayn') : 
                       selectedConversation.lastSeen ? `${latinToCyrillic('So\'nggi ko\'rilgan')}: ${formatMessageTime(selectedConversation.lastSeen)}` :
                       latinToCyrillic('Oflayn')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Qo'ng'iroq">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Video qo'ng'iroq">
                    <Video className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Ma'lumot">
                    <Info className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Ko'proq">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${message.senderType === 'admin' ? 'order-2' : 'order-1'}`}>
                    {/* Reply to message */}
                    {message.replyTo && (
                      <div className="mb-2 p-2 bg-gray-100 rounded-lg border-l-4 border-blue-500">
                        <p className="text-xs text-gray-600 mb-1">
                          {latinToCyrillic('Javob berilmoqda')} {message.replyTo.senderName}
                        </p>
                        <p className="text-sm text-gray-800 truncate">{message.replyTo.text}</p>
                      </div>
                    )}
                    
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        message.senderType === 'admin'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.isForwarded && (
                        <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                          <Forward className="w-3 h-3" />
                          <span>{latinToCyrillic('Forwarded')}</span>
                        </div>
                      )}
                      
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-black/10 rounded-lg">
                              {attachment.type === 'image' ? (
                                <Image className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              <span className="text-xs truncate">{attachment.name}</span>
                              <Download className="w-3 h-3 ml-auto cursor-pointer" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.isEdited && <span>({latinToCyrillic('tahrirlandi')})</span>}
                      {getMessageStatusIcon(message)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply to indicator */}
            {replyingTo && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-700">
                      {latinToCyrillic('Javob berilmoqda')} {replyingTo.senderName}
                    </span>
                    <p className="text-sm text-blue-600 truncate max-w-xs">{replyingTo.text}</p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-blue-500 hover:text-blue-700"
                    aria-label="Bekor qilish"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input with Advanced Features */}
            <div className="bg-white border-t border-gray-200 p-4">
              {/* Recording Indicator */}
              {isRecording && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium">
                      {latinToCyrillic('Yozilmoqda')} {recordingTime}s
                    </span>
                  </div>
                  <button
                    onClick={handleVoiceRecord}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    aria-label="Yozishni to'xtatish"
                  >
                    <Square className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              )}

              {/* Advanced Toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => sendMessage(latinToCyrillic('Yangi so\'rovnom'), 'poll', [], { 
                    poll: {
                      question: latinToCyrillic('Sizga bu qulaymi?'),
                      options: [
                        { text: latinToCyrillic('Ha'), votes: 0, voters: [] },
                        { text: latinToCyrillic('Yo\'q'), votes: 0, voters: [] }
                      ],
                      isAnonymous: false,
                      allowsMultipleAnswers: false,
                      isClosed: false,
                      totalVoters: 0
                    }
                  })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={latinToCyrillic('So\'rovnom')}
                >
                  <BarChart className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  type="button"
                  onClick={handleLocationShare}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={latinToCyrillic('Lokatsiya')}
                >
                  <MapPin className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  type="button"
                  onClick={() => sendMessage('', 'contact', [], { 
                    contact: {
                      firstName: latinToCyrillic('Ism'),
                      phoneNumber: '+998901234567'
                    }
                  })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={latinToCyrillic('Kontakt')}
                >
                  <User className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={latinToCyrillic('Rejalashtirish')}
                  aria-label={latinToCyrillic('Rejalashtirish')}
                >
                  <Calendar className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'}`}
                  title={latinToCyrillic('Ovozli xabar')}
                  aria-label={latinToCyrillic('Ovozli xabar')}
                >
                  <Mic className="w-5 h-5" />
                </button>
                
                <button
                  type="button"
                  onClick={handleVideoRecord}
                  className={`p-2 rounded-lg transition-colors ${isVideoMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                  title={latinToCyrillic('Video xabar')}
                  aria-label={latinToCyrillic('Video xabar')}
                >
                  <Video className="w-5 h-5" />
                </button>
                
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={selectedTheme === 'light' ? latinToCyrillic('Tungi rejim') : latinToCyrillic('Kunduzgi rejim')}
                >
                  {selectedTheme === 'light' ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-gray-600" />}
                </button>
                
                <button
                  type="button"
                  onClick={handleNotificationToggle}
                  className={`p-2 rounded-lg transition-colors ${notificationsEnabled ? 'text-green-600' : 'text-gray-400'}`}
                  title={latinToCyrillic('Bildirishnomalar')}
                  aria-label={latinToCyrillic('Bildirishnomalar')}
                >
                  <Bell className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={latinToCyrillic('Fayl biriktirish')}
                  aria-label={latinToCyrillic('Fayl biriktirish')}
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={latinToCyrillic('Emoji')}
                  aria-label={latinToCyrillic('Emoji')}
                >
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
                
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder={latinToCyrillic('Xabar yozing...')}
                    className="w-full px-4 py-2 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-32"
                    rows={1}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !isRecording) || sending}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label={sending ? latinToCyrillic('Yuborilmoqda...') : latinToCyrillic('Yuborish')}
                >
                  {sending ? (
                    <RefreshCw className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {latinToCyrillic('Chat ilovasi')}
              </h2>
              <p className="text-gray-600">
                {latinToCyrillic('Suhbat boshlash uchun mijozni tanlang')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
