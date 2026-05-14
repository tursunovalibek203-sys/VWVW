import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  User,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  X,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import api from '../lib/professionalApi';
import { extractArray, extractPaginatedData, extractData } from '../lib/apiHelpers';
import { customerSchema, CustomerFormData } from '../lib/validation';
import { ValidatedForm } from '../components/forms/ValidatedForm';
import { FormField, FormActions } from '../components/forms/FormField';
import { useToast, toast } from '../components/ui/Toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string;
  balance: number;  // UZS (backward compatibility)
  balanceUZS: number;
  balanceUSD: number;
  debt: number;  // UZS (backward compatibility)
  debtUZS: number;
  debtUSD: number;
  createdAt: string;
  // Qo'shimcha maydonlar
  monthlySales?: number; // Oylik savdo ($)
  totalSales?: number; // Jami savdo
  lastSaleDate?: string; // Oxirgi sana
  debtPeriod?: number; // Qarz necha kundan beri (kun)
  statusColor?: 'green' | 'yellow' | 'red'; // Rang indikatori
}

export default function CustomersModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCashier = location.pathname.startsWith('/cashier');
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Form validation states
  const [customerFormLoading, setCustomerFormLoading] = useState(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [customerFormSuccess, setCustomerFormSuccess] = useState<string | null>(null);

  // Rang sozlamalari - faqat memory da (localStorage o'chirildi)
  const [colorSettings, setColorSettings] = useState({
    greenThreshold: 600,    // Yashil uchun minimum
    yellowThreshold: 100,   // Sariq uchun minimum, undan kam = qizil
    debtPeriodThreshold: 30 // Qarz muddati kunlarda
  });
  const [showSettings, setShowSettings] = useState(false);

  // Sozlamalarni saqlash - faqat memory da
  const saveSettings = () => {
    setShowSettings(false);
    // Mijozlarni qayta yuklash
    loadCustomers();
  };

  const categories = ['all', 'NORMAL', 'VIP', 'WHOLESALE'];

  // Mijozlar status rangini hisoblash - sozlamalar asosida
  const calculateStatusColor = (monthlySales: number, debtPeriod: number): 'green' | 'yellow' | 'red' => {
    // Qarz muddati oshgan bo'lsa QIZIL
    if (debtPeriod > colorSettings.debtPeriodThreshold) return 'red';
    // Oylik savdo yashil chegaradan yuqori bo'lsa YASHIL
    if (monthlySales >= colorSettings.greenThreshold) return 'green';
    // Oylik savdo sariq chegaradan kam bo'lsa QIZIL
    if (monthlySales < colorSettings.yellowThreshold) return 'red';
    // O'rtacha - SARIQ
    return 'yellow';
  };

  // Mijozlarni yuklash funksiyasi
  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Mijozlarni olish - handle standardized API response format
      const customersResponse = await api.get('/customers');
      const customersData = extractArray(customersResponse, []);
      
      // Sales ma'lumotlarini olish - handle standardized API response format
      const salesResponse = await api.get('/sales?limit=1000');
      const { data: salesData } = extractPaginatedData<any>(salesResponse, 'sales', []);
      
      // Har bir mijoz uchun hisoblash
      const enrichedCustomers = customersData.map((c: any) => {
        // Mijozning sotuvlarini topish
        const customerSales = salesData.filter((s: any) => s.customerId === c.id);
        
        // Jami savdo
        const totalSales = customerSales.reduce((sum: number, s: any) => {
          const amount = s.totalAmount || s.amount || 0;
          return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
        }, 0);
        
        // Oxirgi 30 kun ichidagi savdo
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const monthlySales = customerSales
          .filter((s: any) => {
            const saleDate = new Date(s.createdAt || s.date);
            return saleDate >= thirtyDaysAgo;
          })
          .reduce((sum: number, s: any) => {
            const amount = s.totalAmount || s.amount || 0;
            return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
          }, 0);
        
        // Oxirgi sotuv sanasi
        const lastSale: any = customerSales
          .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())[0];
        
        // âœ… TUZATILDI: debtUZS ishlatildi
        let debtPeriod = 0;
        const totalDebt = (c.debtUZS || c.debt || 0) + (c.debtUSD || 0) * 12500;
        if (totalDebt > 0 && lastSale) {
          const lastSaleDate = new Date(lastSale.createdAt || lastSale.date);
          const daysSinceLastSale = Math.floor((new Date().getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
          debtPeriod = daysSinceLastSale;
        }
        
        // âœ… TUZATILDI: API dan kelgan balanceUZS/balanceUSD ishlatiladi
        const balanceUZS = c.balanceUZS || c.balance || 0;
        const balanceUSD = c.balanceUSD || 0;
        const debtUZS = c.debtUZS || c.debt || 0;
        const debtUSD = c.debtUSD || 0;
        // Ko'rsatish uchun UZS balansini ishlatamiz (asosiy valyuta)
        const balance = balanceUZS;
        
        // Rangni hisoblash
        const statusColor = calculateStatusColor(monthlySales, debtPeriod);
        
        const lastSaleDateValue: string | undefined = lastSale ? (lastSale.createdAt || lastSale.date) : undefined;
        
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          category: c.category,
          balance: balance,  // UZS
          balanceUZS,
          balanceUSD,
          debt: debtUZS,  // UZS for backward compatibility
          debtUZS,
          debtUSD,
          createdAt: c.createdAt,
          monthlySales,
          totalSales,
          lastSaleDate: lastSaleDateValue,
          debtPeriod,
          statusColor
        };
      });
      
      setCustomers(enrichedCustomers);
      setLastUpdated(new Date());
      
    } catch (error) {
      // Error handled by empty customers state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    // Avto-yangilash har 30 soniyada
    const intervalId = setInterval(() => {
      loadCustomers();
    }, 30000);

    // Oyna fokusga kelganda yangilash
    const handleFocus = () => {
      loadCustomers();
    };
    window.addEventListener('focus', handleFocus);

    // Tozalash
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    let filtered = customers;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(customer => customer.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredCustomers(filtered);
  }, [customers, selectedCategory, searchTerm]);

  const handleAddCustomer = async (data: CustomerFormData) => {
    setCustomerFormLoading(true);
    setCustomerFormError(null);
    setCustomerFormSuccess(null);
    
    try {
      const response = await api.post('/customers', data);
      const createdCustomer = extractData<any>(response, null);
      
      if (createdCustomer) {
        const customer: Customer = {
          id: createdCustomer.id,
          name: createdCustomer.name,
          email: createdCustomer.email,
          phone: createdCustomer.phone,
          address: createdCustomer.address,
          category: createdCustomer.category,
          balance: createdCustomer.balanceUZS || createdCustomer.balance || 0,
          balanceUZS: createdCustomer.balanceUZS || createdCustomer.balance || 0,
          balanceUSD: createdCustomer.balanceUSD || 0,
          debt: createdCustomer.debtUZS || createdCustomer.debt || 0,
          debtUZS: createdCustomer.debtUZS || createdCustomer.debt || 0,
          debtUSD: createdCustomer.debtUSD || 0,
          createdAt: createdCustomer.createdAt
        };

        setCustomers([...customers, customer]);
        setShowAddForm(false);
        
        // Show success message
        addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Mijoz muvaffaqiyatli qo\'shildi!')));
      }
    } catch (error: any) {
      console.error('Customer creation error:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), error.response?.data?.error || latinToCyrillic('Mijoz qo\'shishda xatolik yuz berdi')));
    } finally {
      setCustomerFormLoading(false);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'VIP': return 'badge-warning';
      case 'WHOLESALE': return 'badge-success';
      case 'NORMAL': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  // Barcha mijozlarni Excel formatida eksport qilish
  const handleExportAllCustomers = () => {
    try {
      if (customers.length === 0) {
        alert(latinToCyrillic('Mijozlar ro\'yxati bo\'sh!'));
        return;
      }

      // CSV sarlavhalari
      const headers = [
        latinToCyrillic('No'),
        latinToCyrillic('Mijoz nomi'),
        latinToCyrillic('Telefon'),
        latinToCyrillic('Kategoriya'),
        latinToCyrillic('Balans (UZS)'),
        latinToCyrillic('Balans (USD)'),
        latinToCyrillic('Qarz (UZS)'),
        latinToCyrillic('Qarz (USD)'),
        latinToCyrillic('Oylik savdo ($)'),
        latinToCyrillic('Jami savdo ($)'),
        latinToCyrillic('Manzil')
      ];

      // Ma'lumotlarni qatorlarga aylantirish
      const rows = customers.map((customer, index) => {
        return [
          (index + 1).toString(),
          customer.name,
          customer.phone || '-',
          customer.category,
          (customer.balance || 0).toLocaleString(),
          ((customer.balance || 0) / 12500).toFixed(2), // USD da taxminiy konvertatsiya
          (customer.debt || 0).toLocaleString(),
          ((customer.debt || 0) / 12500).toFixed(2),
          (customer.monthlySales || 0).toFixed(2),
          (customer.totalSales || 0).toFixed(2),
          customer.address || '-'
        ];
      });

      // CSV yaratish
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
      ].join('\n');

      // BOM (Byte Order Mark) qo'shish
      const BOM = '\uFEFF';
      const fullContent = BOM + csvContent;

      // Faylni yuklab olish
      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `${latinToCyrillic('Mijozlar_Royxati')}_${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(latinToCyrillic(`âœ… ${customers.length} ta mijoz muvaffaqiyatli eksport qilindi!`));
    } catch (error) {
      console.error('Export xatolik:', error);
      alert(latinToCyrillic('âŒ Eksport qilishda xatolik yuz berdi'));
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 bg-dots-pattern">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            {latinToCyrillic("Mijozlar")}
          </h1>
          <p className="text-gray-600">
            {filteredCustomers.length} {latinToCyrillic("ta mijoz")}
            {lastUpdated && (
              <span className="text-xs text-gray-400 ml-2">
                ({latinToCyrillic("Oxirgi yangilanish")}: {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
            title={latinToCyrillic("Yangilash")}
          >
            <RefreshCw className={`w-5 h-5 text-blue-600 ${loading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={latinToCyrillic("ÐœÐ¸Ð¶Ð¾Ð·Ð»Ð°Ñ€Ð½Ð¸ Ò›Ð¸Ð´Ð¸Ñ€Ð¸Ñˆ...")}
                className="input-modern w-full pl-12"
              />
            </div>
            
            {/* Category Filter */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-modern pl-12 appearance-none cursor-pointer"
                aria-label="Kategoriya filtri"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? latinToCyrillic("Ð‘Ð°Ñ€Ñ‡Ð°ÑÐ¸") : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-2">
            {/* Export All Customers Button */}
            <button
              onClick={handleExportAllCustomers}
              className="btn-gradient-secondary px-4 py-3 flex items-center gap-2 hover:scale-105 transition-transform bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              title={latinToCyrillic("Barcha mijozlarni eksport qilish")}
              aria-label={latinToCyrillic("Barcha mijozlarni eksport qilish")}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>{latinToCyrillic("Excel")}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="btn-gradient-secondary px-4 py-3 flex items-center gap-2 hover:scale-105 transition-transform"
              title={latinToCyrillic("Rang sozlamalari")}
              aria-label={latinToCyrillic("Rang sozlamalari")}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {/* Add Customer Button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-gradient-primary px-6 py-3 flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span>{latinToCyrillic("Yangi mijoz")}</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-card p-12 rounded-2xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16">
                <div className="animate-pulse rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
              <p className="text-lg font-semibold text-blue-600 mt-4">{latinToCyrillic("Yuklanmoqda...")}</p>
            </div>
          </div>
        )}

        {/* Status Legend */}
        {!loading && (
          <div className="flex flex-wrap gap-4 mb-4 p-4 glass-card rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600">
                {colorSettings.greenThreshold}$+ {latinToCyrillic("(Yashil)")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
              <span className="text-sm text-gray-600">
                {colorSettings.yellowThreshold}$-{colorSettings.greenThreshold}$ {latinToCyrillic("(Sariq)")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-rose-500"></div>
              <span className="text-sm text-gray-600">
                {colorSettings.yellowThreshold}$ {latinToCyrillic("dan kam yoki qarz")} {colorSettings.debtPeriodThreshold}+ {latinToCyrillic("kun (Qizil)")}
              </span>
            </div>
          </div>
        )}

        {/* Customers Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => {
              // Rang border class
              const getStatusBorderClass = (color?: string) => {
                switch (color) {
                  case 'green': return 'border-emerald-400 border-2';
                  case 'yellow': return 'border-yellow-400 border-2';
                  case 'red': return 'border-rose-400 border-2';
                  default: return 'border-gray-200 border';
                }
              };
              
              // Status badge
              const getStatusBadge = (color?: string): { text: string; class: string } => {
                switch (color) {
                  case 'green': return { text: 'Yaxshi', class: 'bg-emerald-100 text-emerald-700' };
                  case 'yellow': return { text: "O'rtacha", class: 'bg-yellow-100 text-yellow-700' };
                  case 'red': return { text: 'Xavfli', class: 'bg-rose-100 text-rose-700' };
                  default: return { text: "Noma'lum", class: 'bg-gray-100 text-gray-700' };
                }
              };
              
              const statusBadge = getStatusBadge(customer.statusColor);
              
              return (
              <div key={customer.id} className={`glass-card hover-lift p-6 ${getStatusBorderClass(customer.statusColor)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    customer.statusColor === 'green' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                    customer.statusColor === 'yellow' ? 'bg-gradient-to-br from-yellow-400 to-orange-400' :
                    'bg-gradient-to-br from-rose-500 to-red-600'
                  }`}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs ${getCategoryBadgeColor(customer.category)}`}>
                      {customer.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge.class}`}>
                      {latinToCyrillic(statusBadge.text)}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-primary mb-3">{customer.name}</h3>
                
                <div className="space-y-2 mb-4">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-secondary" />
                      <span className="text-sm text-secondary">{customer.email}</span>
                    </div>
                  )}
                  
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-secondary" />
                      <span className="text-sm text-secondary">{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span className="text-sm text-secondary">{customer.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">{latinToCyrillic("Balans")}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {customer.balance.toLocaleString()} UZS
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{latinToCyrillic("Qarz")}</p>
                    <p className={`text-lg font-bold ${customer.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {customer.debt.toLocaleString()} UZS
                    </p>
                  </div>
                </div>
                
                {/* Oylik savdo va qarz muddati */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">{latinToCyrillic("Oylik savdo")}</p>
                    <p className={`text-sm font-bold ${
                      (customer.monthlySales || 0) >= colorSettings.greenThreshold ? 'text-emerald-600' :
                      (customer.monthlySales || 0) >= colorSettings.yellowThreshold ? 'text-yellow-600' : 'text-rose-600'
                    }`}>
                      ${(customer.monthlySales || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{latinToCyrillic("Qarz muddati")}</p>
                    <p className={`text-sm font-bold ${
                      (customer.debtPeriod || 0) > colorSettings.debtPeriodThreshold ? 'text-rose-600' : 'text-gray-600'
                    }`}>
                      {customer.debtPeriod || 0} {latinToCyrillic("kun")}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(isCashier ? `/cashier/customers/${customer.id}` : `/customers/${customer.id}`)}
                    className="btn-gradient-secondary flex-1 p-2 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{latinToCyrillic("Ko'rish")}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(latinToCyrillic('Rostdan ham ushbu mijozni o\'chirmoqchimisiz?'))) return;
                      try {
                        await api.delete(`/customers/${customer.id}`);
                        setCustomers(customers.filter(c => c.id !== customer.id));
                        alert(latinToCyrillic('Mijoz muvaffaqiyatli o\'chirildi!'));
                      } catch (error) {
                        alert(latinToCyrillic('Mijozni o\'chirishda xatolik yuz berdi!'));
                      }
                    }}
                    className="btn-gradient-danger p-2 flex items-center justify-center"
                    aria-label="Mijozni o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCustomers.length === 0 && (
          <div className="glass-card p-12 rounded-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{latinToCyrillic("Mijozlar topilmadi")}</h3>
              <p className="text-gray-500">
                {latinToCyrillic("Qidirish shartlarini o'zgartirib qayta urinib ko'ring")}
              </p>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {!loading && customers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card hover-lift p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{latinToCyrillic("Jami mijozlar")}</p>
                  <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-card hover-lift p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{latinToCyrillic("Jami balans")}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customers.reduce((sum, c) => sum + c.balance, 0).toLocaleString()} UZS
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card hover-lift p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{latinToCyrillic("Jami qarz")}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customers.reduce((sum, c) => sum + c.debt, 0).toLocaleString()} UZS
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Color Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 w-full max-w-md mx-4 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{latinToCyrillic("Rang sozlamalari")}</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-gray-200 rounded-full"
                  title="Yopish"
                  aria-label="Yopish"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <label className="block text-sm font-medium text-emerald-700 mb-1">
                    {latinToCyrillic("Yashil rang uchun minimum ($)")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(colorSettings.greenThreshold)}
                    onChange={(e) => setColorSettings({ ...colorSettings, greenThreshold: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="600"
                  />
                  <p className="text-xs text-emerald-600 mt-1">
                    {latinToCyrillic("Shunchadan yuqori savdo = Yashil")}
                  </p>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    {latinToCyrillic("Sariq rang uchun minimum ($)")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(colorSettings.yellowThreshold)}
                    onChange={(e) => setColorSettings({ ...colorSettings, yellowThreshold: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="100"
                  />
                  <p className="text-xs text-yellow-600 mt-1">
                    {colorSettings.yellowThreshold}$ - {colorSettings.greenThreshold}$ {latinToCyrillic("= Sariq")}
                  </p>
                </div>
                
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <label className="block text-sm font-medium text-rose-700 mb-1">
                    {latinToCyrillic("Qarz muddati ogohlantirish (kun)")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(colorSettings.debtPeriodThreshold)}
                    onChange={(e) => setColorSettings({ ...colorSettings, debtPeriodThreshold: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="30"
                  />
                  <p className="text-xs text-rose-600 mt-1">
                    {latinToCyrillic("Shunchadan oshiq qarz = Qizil")}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">{latinToCyrillic("Natija:")}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span>{colorSettings.greenThreshold}$+ = {latinToCyrillic("Yashil")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <span>{colorSettings.yellowThreshold}$ - {colorSettings.greenThreshold}$ = {latinToCyrillic("Sariq")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span>{colorSettings.yellowThreshold}$ {latinToCyrillic("dan kam = Qizil")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span>{latinToCyrillic("Qarz")} {colorSettings.debtPeriodThreshold}+ {latinToCyrillic("kun = Qizil")}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveSettings}
                  className="btn-gradient-primary flex-1"
                >
                  {latinToCyrillic("Saqlash")}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Customer Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 w-full max-w-md mx-4 rounded-2xl">
              <h3 className="text-xl font-bold mb-4">{latinToCyrillic("Yangi mijoz qo'shish")}</h3>
              
              <ValidatedForm
                schema={customerSchema}
                defaultValues={{
                  name: '',
                  phone: '',
                  email: '',
                  address: '',
                  category: 'NORMAL'
                }}
                onSubmit={handleAddCustomer}
                loading={customerFormLoading}
                error={customerFormError}
                success={customerFormSuccess}
              >
                <FormField
                  name="name"
                  label={latinToCyrillic("Ism")}
                  placeholder={latinToCyrillic("Mijoz ismi")}
                  required
                />
                
                <FormField
                  name="phone"
                  label={latinToCyrillic("Telefon")}
                  type="tel"
                  placeholder="+998901234567"
                  required
                />
                
                <FormField
                  name="email"
                  label={latinToCyrillic("Email")}
                  type="email"
                  placeholder={latinToCyrillic("Email (ixtiyoriy)")}
                />
                
                <FormField
                  name="address"
                  label={latinToCyrillic("Manzil")}
                  placeholder={latinToCyrillic("Manzil (ixtiyoriy)")}
                />
                
                <FormField
                  name="category"
                  label={latinToCyrillic("Kategoriya")}
                  type="select"
                  options={[
                    { value: 'NORMAL', label: latinToCyrillic('Oddiy') },
                    { value: 'VIP', label: 'VIP' },
                    { value: 'PROBLEMATIC', label: latinToCyrillic('Muammodor') },
                    { value: 'NEW', label: latinToCyrillic('Yangi') }
                  ]}
                />
                
                <FormActions
                  onCancel={() => {
                    setShowAddForm(false);
                    setCustomerFormError(null);
                    setCustomerFormSuccess(null);
                  }}
                  submitText={latinToCyrillic("Qo'shish")}
                  cancelText={latinToCyrillic("Bekor qilish")}
                  loading={customerFormLoading}
                />
              </ValidatedForm>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
