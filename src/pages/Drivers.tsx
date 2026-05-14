import React, { useState, useEffect } from 'react';
import api from '../lib/professionalApi';
import { Truck, Phone, Star, MessageSquare, Plus, RefreshCw, FileText, Search, User, MapPin, Send, Sparkles } from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { exportToExcel } from '../lib/excelUtils';

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber: string;
  telegramChatId?: string;
  telegramUsername?: string;
  status: string;
  rating: number;
  totalDeliveries: number;
  currentLocation?: string;
  active: boolean;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
  _count?: {
    assignments: number;
  };
}

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  deliveryAddress: string;
  order: {
    orderNumber: string;
    totalAmount: number;
    customer: {
      name: string;
      phone: string;
    };
  };
}

export function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    vehicleNumber: '',
    email: '',
    password: '',
    telegramBotToken: ''
  });

  useEffect(() => {
    fetchDrivers();
    fetchOrders();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
    fetchOrders();
  };

  const handleExport = () => {
    const dataToExport = drivers.map(d => ({
      'Ism': d.name,
      'Telefon': d.phone,
      'Guvohnoma': d.licenseNumber,
      'Mashina': d.vehicleNumber,
      'Status': d.status,
      'Reyting': d.rating,
      'Jami yetkazish': d.totalDeliveries
    }));
    exportToExcel(dataToExport, { fileName: 'Haydovchilar', sheetName: 'Haydovchilar' });
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders?status=READY_FOR_DELIVERY');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchAssignments = async (driverId: string) => {
    try {
      const response = await api.get(`/drivers/${driverId}/assignments`);
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchChatMessages = async (driverId: string) => {
    try {
      const response = await api.get(`/drivers/${driverId}/chat`);
      setChatMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/drivers', newDriver);
      setShowAddModal(false);
      setNewDriver({
        name: '',
        phone: '',
        licenseNumber: '',
        vehicleNumber: '',
        email: '',
        password: '',
        telegramBotToken: ''
      });
      fetchDrivers();
    } catch (error) {
      console.error('Error adding driver:', error);
    }
  };

  const handleAssignOrder = async (orderId: string) => {
    if (!selectedDriver) return;
    
    try {
      await api.post(`/drivers/${selectedDriver.id}/assign-order`, { orderId });
      setShowAssignModal(false);
      fetchAssignments(selectedDriver.id);
    } catch (error) {
      console.error('Error assigning order:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !newMessage.trim()) return;

    try {
      await api.post(`/drivers/${selectedDriver.id}/chat`, { message: newMessage });
      setNewMessage('');
      fetchChatMessages(selectedDriver.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const updateDriverStatus = async (driverId: string, status: string) => {
    try {
      await api.put(`/drivers/${driverId}/status`, { status });
      fetchDrivers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'BUSY': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'OFFLINE': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return latinToCyrillic('Mavjud');
      case 'BUSY': return latinToCyrillic('Band');
      case 'OFFLINE': return latinToCyrillic('Offline');
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="animate-pulse rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          <Sparkles className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm) ||
    d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Clean Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{latinToCyrillic("Haydovchilar")}</h1>
              <p className="text-sm text-gray-500">{filteredDrivers.length} {latinToCyrillic("ta haydovchi")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder={latinToCyrillic("Qidirish...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
              aria-label="Yangilash"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-pulse' : ''}`} />
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-all"
            >
              <FileText className="w-4 h-4" />
              Excel
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              {latinToCyrillic("Qo'shish")}
            </button>
          </div>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredDrivers.map((driver) => (
          <div key={driver.id} className="group relative bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800 hover:scale-[1.03] transition-all duration-500">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shadow-inner group-hover:rotate-6 transition-all duration-500">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{driver.name}</h3>
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider ${getStatusStyle(driver.status)}`}>
                    <div className={`w-1 h-1 rounded-full bg-current animate-pulse`} />
                    {getStatusText(driver.status)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold">{driver.rating}</span>
                </div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{driver.totalDeliveries} {latinToCyrillic("TA")}</p>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{driver.phone}</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl">
                <Truck className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{driver.vehicleNumber}</span>
              </div>
              {driver.currentLocation && (
                <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">{driver.currentLocation}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectedDriver(driver);
                  fetchAssignments(driver.id);
                  setShowAssignModal(true);
                }}
                className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                {latinToCyrillic("BUYURTMA")}
              </button>
              
              <button
                onClick={() => {
                  setSelectedDriver(driver);
                  fetchChatMessages(driver.id);
                  setShowChatModal(true);
                }}
                className="flex items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                CHAT
              </button>

              <button
                onClick={() => updateDriverStatus(driver.id, driver.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')}
                className={`col-span-2 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 border ${
                  driver.status === 'AVAILABLE' 
                    ? 'border-rose-100 text-rose-600 hover:bg-rose-50 dark:border-rose-900/30' 
                    : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/30'
                }`}
              >
                {driver.status === 'AVAILABLE' ? latinToCyrillic('OFFLINE QILISH') : latinToCyrillic('ONLINE QILISH')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                {latinToCyrillic("Yangi haydovchi")}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="p-10 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="driver-name" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Ism")}</label>
                  <input
                    id="driver-name"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="driver-phone" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Telefon")}</label>
                  <input
                    id="driver-phone"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="driver-license" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Guvohnoma raqami")}</label>
                  <input
                    id="driver-license"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="driver-vehicle" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Mashina raqami")}</label>
                  <input
                    id="driver-vehicle"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={newDriver.vehicleNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, vehicleNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Email (ixtiyoriy)</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-gray-900 dark:text-white"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white shadow-lg shadow-blue-500/30"
                >
                  {latinToCyrillic("Qo'shish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Order Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <Plus className="w-5 h-5" />
                </div>
                {latinToCyrillic("Buyurtma tayinlash")}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">{latinToCyrillic("Tayyor buyurtmalar")}</h4>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 bg-gray-50/50 dark:bg-gray-800/50 rounded-3xl flex justify-between items-center group hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">#{order.orderNumber}</p>
                        <p className="text-xs font-bold text-gray-500">{order.customer.name}</p>
                      </div>
                      <button
                        onClick={() => handleAssignOrder(order.id)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95"
                      >
                        {latinToCyrillic("TAYINLASH")}
                      </button>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Buyurtmalar yo'q")}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">{latinToCyrillic("Joriy buyurtmalar")}</h4>
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">#{assignment.order.orderNumber}</p>
                        <p className="text-[10px] font-bold text-gray-500">{assignment.order.customer.name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider ${getStatusStyle(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{selectedDriver?.name}</h3>
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Online Chat
                  </p>
                </div>
              </div>
              <button onClick={() => setShowChatModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-sm ${
                    message.senderType === 'ADMIN'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'
                  }`}>
                    <p className="text-sm font-bold leading-relaxed">{message.message}</p>
                    <p className={`text-[9px] font-semibold uppercase tracking-tighter mt-2 opacity-50`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <MessageSquare className="w-16 h-16" />
                  <p className="text-sm font-semibold uppercase tracking-[0.3em]">{latinToCyrillic("Xabarlar yo'q")}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-8 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-4">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={latinToCyrillic("Xabar yozing...")}
                  className="flex-1 px-8 py-5 bg-white dark:bg-gray-900 border-none rounded-[2rem] focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm shadow-inner"
                />
                <button
                  type="submit"
                  className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-blue-500/30 group"
                  aria-label={latinToCyrillic("Xabar yuborish")}
                >
                  <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
