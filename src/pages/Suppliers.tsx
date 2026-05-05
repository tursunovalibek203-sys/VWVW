import { useEffect, useState } from 'react';
import api from '../lib/professionalApi';
import { Truck, Phone, Mail, MapPin, Plus, Sparkles, RefreshCw, FileText, Search, User, CreditCard } from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { exportToExcel } from '../lib/excelUtils';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '30 days',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  const handleExport = () => {
    const dataToExport = filteredSuppliers.map(s => ({
      'Kompaniya': s.name,
      'Mas\'ul shaxs': s.contactPerson,
      'Telefon': s.phone,
      'Email': s.email || '-',
      'Manzil': s.address || '-',
      'To\'lov muddati': s.paymentTerms,
      'Status': s.active ? 'Faol' : 'Nofaol'
    }));
    exportToExcel(dataToExport, { fileName: 'Taminotchilar', sheetName: 'Taminotchilar' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowModal(false);
      setEditingSupplier(null);
      setForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: '30 days',
      });
      loadSuppliers();
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email || '',
      phone: supplier.phone,
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms,
    });
    setShowModal(true);
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.put(`/suppliers/${id}`, { active: !active });
      loadSuppliers();
    } catch (error) {
      alert('Status yangilanmadi');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          <Sparkles className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-[3rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white dark:border-gray-800">
        <div className="absolute top-0 -left-10 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-100 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-500/25">
              <Truck className="w-3 h-3 rounded-lg" />
              Logistics & Supply
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
              {latinToCyrillic("Ta'minotchilar")} <br />
              <span className="text-blue-600">{latinToCyrillic("boshqaruvi")}</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button 
              type="button"
              onClick={handleRefresh}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-gray-900 dark:text-white shadow-md border border-gray-100 dark:border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 rounded-lg ${refreshing ? 'animate-spin' : ''}`} />
              {latinToCyrillic("Yangilash")}
            </button>
            <button 
              type="button"
              onClick={handleExport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl font-semibold text-sm transition-all active:scale-95 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800"
            >
              <FileText className="w-4 h-4 rounded-lg" />
              Excel
            </button>
            <button 
              type="button"
              onClick={() => { setEditingSupplier(null); setShowModal(true); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-4 h-4 rounded-lg" />
              {latinToCyrillic("Yangi ta'minotchi")}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Jami Ta'minotchilar", value: suppliers.length, icon: Truck, color: 'blue' },
          { label: "Faol", value: suppliers.filter(s => s.active).length, icon: Truck, color: 'emerald' },
          { label: "Nofaol", value: suppliers.filter(s => !s.active).length, icon: Truck, color: 'rose' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800 group hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{latinToCyrillic(stat.label)}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-all duration-500 ${
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 
                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 
                'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
              }`}>
                <stat.icon className="w-7 h-7 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/30 dark:bg-gray-800/10">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic("Ro'yxat")}</h3>
          
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors rounded-lg" />
            <input 
              id="supplier-search"
              type="text"
              placeholder={latinToCyrillic("Qidirish...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-8 py-6 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Kompaniya")}</th>
                <th className="px-8 py-6 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Mas'ul Shaxs")}</th>
                <th className="px-8 py-6 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Aloqa")}</th>
                <th className="px-8 py-6 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("To'lov Muddati")}</th>
                <th className="px-8 py-6 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Status")}</th>
                <th className="px-8 py-6 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Harakatlar")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <Truck className="w-6 h-6 rounded-lg" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{supplier.name}</p>
                        {supplier.address && (
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 rounded-lg" />
                            {supplier.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500 rounded-lg" />
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{supplier.contactPerson}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 rounded-lg" />
                        {supplier.phone}
                      </div>
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <Mail className="w-3.5 h-3.5 rounded-lg" />
                          {supplier.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                      <CreditCard className="w-3.5 h-3.5 rounded-lg" />
                      {supplier.paymentTerms}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      supplier.active 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${supplier.active ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                      {supplier.active ? latinToCyrillic("Faol") : latinToCyrillic("Nofaol")}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(supplier)}
                        className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white rounded-xl transition-all duration-300"
                        aria-label="Tahrirlash"
                      >
                        <RefreshCw className="w-4 h-4 rounded-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(supplier.id, supplier.active)}
                        className={`p-3 rounded-xl transition-all duration-300 ${
                          supplier.active 
                            ? 'bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-900/20' 
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/20'
                        }`}
                      >
                        {supplier.active ? <RefreshCw className="w-4 h-4 rotate-180 rounded-lg" /> : <Plus className="w-4 h-4 rounded-lg" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <Truck className="w-5 h-5 rounded-lg" />
                </div>
                {latinToCyrillic(editingSupplier ? "Tahrirlash" : "Yangi ta'minotchi")}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <Plus className="w-6 h-6 rotate-45 rounded-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="supplier-name" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Kompaniya Nomi")}</label>
                  <input
                    id="supplier-name"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-person" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Mas'ul Shaxs")}</label>
                  <input
                    id="contact-person"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="supplier-phone" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Telefon")}</label>
                  <input
                    id="supplier-phone"
                    required
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="supplier-email" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Email")}</label>
                  <input
                    id="supplier-email"
                    type="email"
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="supplier-address" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Manzil")}</label>
                <input
                  id="supplier-address"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-terms" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("To'lov Muddati")}</label>
                <select
                  id="payment-terms"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                >
                  <option value="15 days">15 kun</option>
                  <option value="30 days">30 kun</option>
                  <option value="45 days">45 kun</option>
                  <option value="60 days">60 kun</option>
                  <option value="Cash">Naqd</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-gray-900 dark:text-white"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white shadow-lg shadow-blue-500/30"
                >
                  {latinToCyrillic(editingSupplier ? "Saqlash" : "Yaratish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
