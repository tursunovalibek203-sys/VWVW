import { useEffect, useState } from 'react';
import ProductSelector from '../components/ProductSelector';
import api from '../lib/professionalApi';
import { formatDate } from '../lib/utils';
import { Factory, Play, CheckCircle, XCircle, Clock, Plus, Package, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Production() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState({
    productId: '',
    productName: '',
    targetQuantity: '',
    plannedDate: '',
    shift: 'Kunduzgi',
    supervisorId: '',
    notes: '',
    accessories: [] as any[],
  });

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    try {
      const { data } = await api.get('/production/orders');
      setOrders(data);
    } catch (error) {
      console.error('Ishlab chiqarish buyurtmalarini yuklashda xatolik');
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const notesWithAccessories = form.accessories.length > 0 
        ? `${form.notes}\n\nAksessuarlar:\n${form.accessories.map(a => `- ${a.name}: ${a.quantity} dona (Narxi: ${a.price || 0})`).join('\n')}`
        : form.notes;

      await api.post('/production/orders', {
        ...form,
        targetQuantity: parseInt(form.targetQuantity) || 0,
        plannedDate: new Date(form.plannedDate),
        notes: notesWithAccessories,
      });
      setShowForm(false);
      setForm({
        productId: '',
        productName: '',
        targetQuantity: '',
        plannedDate: '',
        shift: 'Kunduzgi',
        supervisorId: '',
        notes: '',
        accessories: [],
      });
      setProductSearch('');
      loadOrders();
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await api.put(`/production/orders/${id}/status`, { status });
      loadOrders();
    } catch (error) {
      alert('Status yangilanmadi');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      PLANNED: 'Rejalashtirilgan',
      IN_PROGRESS: 'Jarayonda',
      COMPLETED: 'Tugallangan',
      CANCELLED: 'Bekor qilingan',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Clean Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{t("Ishlab Chiqarish")}</h1>
              <p className="text-sm text-gray-500">{orders.length} {t("ta buyurtma")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowForm(true)} 
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              {t("Yangi buyurtma")}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        {[
          { label: t("Rejalashtirilgan"), value: orders.filter(o => o.status === 'PLANNED').length, icon: Clock, color: 'blue' },
          { label: t("Jarayonda"), value: orders.filter(o => o.status === 'IN_PROGRESS').length, icon: Play, color: 'amber' },
          { label: t("Tugallangan"), value: orders.filter(o => o.status === 'COMPLETED').length, icon: CheckCircle, color: 'emerald' },
          { 
            label: t("Samaradorlik"), 
            value: orders.length > 0 ? Math.round((orders.filter(o => o.status === 'COMPLETED').length / orders.length) * 100) : 0, 
            icon: Factory, 
            color: 'purple',
            suffix: '%'
          }
        ].map((stat, i) => (
          <div key={i} className="group bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-8 transition-transform group-hover:rotate-12 ${ 
              stat.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 
              stat.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 
              stat.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 
              'bg-purple-50 dark:bg-purple-900/20 text-purple-600' 
            }`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stat.value}
              </p>
              {stat.suffix && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="px-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/30 shrink-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t("Ishlab chiqarish buyurtmalari")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left py-6 px-10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("BUYURTMA #")}</th>
                  <th className="text-left py-6 px-10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("MAHSULOT")}</th>
                  <th className="text-left py-6 px-10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("MIQDOR")}</th>
                  <th className="text-left py-6 px-10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("SANA / SMENA")}</th>
                  <th className="text-left py-6 px-10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("STATUS")}</th>
                  <th className="text-right py-6 px-10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("AMALLAR")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {orders.map((order) => {
                  const statusLabel = getStatusLabel(order.status);
                  return (
                    <tr key={order.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                      <td className="py-6 px-10">
                        <div className="inline-flex bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-sm shadow-sm">
                          <span className="font-bold text-xs text-gray-500 font-mono tracking-tighter">#{order.orderNumber}</span>
                        </div>
                      </td>
                      <td className="py-6 px-10">
                        <div className="inline-flex flex-col bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 px-3 py-2 rounded-sm shadow-sm">
                          <p className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tight text-xs">{order.product?.name || 'N/A'}</p>
                          <p className="text-[9px] font-bold text-purple-400 dark:text-purple-500 uppercase tracking-widest mt-0.5">{order.product?.bagType || '-'}</p>
                        </div>
                      </td>
                      <td className="py-6 px-10">
                        <div className="inline-flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 px-3 py-2 rounded-sm shadow-sm">
                          <span className="font-bold text-blue-600 dark:text-blue-400">{order.actualQuantity || 0}</span>
                          <div className="w-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-sm"></div>
                          <span className="font-bold text-gray-400">{order.targetQuantity} {t("QOP")}</span>
                        </div>
                      </td>
                      <td className="py-6 px-10">
                        <div className="inline-flex flex-col bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-2 rounded-sm shadow-sm">
                          <p className="font-bold text-gray-900 dark:text-white text-[10px]">{formatDate(order.plannedDate)}</p>
                          <p className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-0.5">{order.shift}</p>
                        </div>
                      </td>
                      <td className="py-6 px-10">
                        <span className={`inline-flex px-4 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest shadow-sm border ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400' :
                          order.status === 'IN_PROGRESS' ? 'bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-400' :
                          order.status === 'PLANNED' ? 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-400' :
                          'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                        }`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-6 px-10 text-right">
                        <div className="flex justify-end gap-2">
                          {order.status === 'PLANNED' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')}
                              className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all active:scale-90"
                              aria-label="Boshlash"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {order.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                              className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-90"
                              aria-label="Tugatish"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-purple-50/30 dark:bg-purple-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                  <Plus className="w-5 h-5" />
                </div>
                {t("Yangi")} <span className="text-purple-600">{t("buyurtma")}</span>
              </h3>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 sm:p-16 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("production.product")}</label>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                  <ProductSelector
                    products={products}
                    selectedId={form.productId}
                    searchValue={productSearch}
                    onSearchChange={setProductSearch}
                    onSelect={(id, name) => {
                      const selectedProductData = products.find(p => p.id === id);
                      const lowerName = name.toLowerCase();
                      const isPreform = selectedProductData?.warehouse === 'preform' || 
                                        lowerName.includes('g') || 
                                        lowerName.includes('gr') ||
                                        lowerName.includes('preform');
                      
                      let newAccessories: any[] = [];
                      if (isPreform) {
                        const sizeMatch = lowerName.match(/(\d+)/);
                        const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
                        let krishkaSize = selectedProductData?.subType || '';
                        let ruchkaSize = '';

                        if (!krishkaSize) {
                          if (size >= 50 && size <= 70) krishkaSize = '38';
                          else if (size > 70) krishkaSize = '48';
                          else if (size > 0 && size < 50) krishkaSize = '28';
                        }
                        if (['28', '38', '48'].includes(krishkaSize)) {
                          ruchkaSize = krishkaSize;
                        }

                        const targetQty = parseInt(form.targetQuantity) || 0;
                        const unitsPerBag = selectedProductData?.unitsPerBag || 1000;
                        const totalUnits = targetQty * unitsPerBag;

                        if (krishkaSize) {
                          const krishka = products.find(p => 
                            (p.warehouse === 'krishka' || p.name.toLowerCase().includes('krishka') || p.name.toLowerCase().includes('qopqoq')) && 
                            p.name.toLowerCase().includes(krishkaSize) && 
                            p.active !== false
                          );
                          if (krishka) {
                            newAccessories.push({
                              id: krishka.id,
                              name: krishka.name,
                              quantity: totalUnits,
                              price: krishka.pricePerBag / (krishka.unitsPerBag || 2000),
                              type: 'krishka'
                            });
                          }
                        }

                        if (ruchkaSize) {
                          const ruchka = products.find(p => 
                            (p.warehouse === 'ruchka' || p.name.toLowerCase().includes('ruchka')) && 
                            p.name.toLowerCase().includes(ruchkaSize) && 
                            p.active !== false
                          );
                          if (ruchka) {
                            newAccessories.push({
                              id: ruchka.id,
                              name: ruchka.name,
                              quantity: totalUnits,
                              price: ruchka.pricePerBag / (ruchka.unitsPerBag || 1000),
                              type: 'ruchka'
                            });
                          }
                        }
                      }
                      
                      setForm(prev => ({ 
                        ...prev, 
                        productId: id, 
                        productName: name,
                        accessories: newAccessories
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("production.quantity")}</label>
                <div className="relative group">
                  <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={t("production.quantity")}
                    value={form.targetQuantity}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      const targetQty = parseFloat(raw) || 0;
                      const selectedProductData = products.find(p => p.id === form.productId);
                      const unitsPerBag = selectedProductData?.unitsPerBag || 1000;
                      const totalUnits = targetQty * unitsPerBag;

                      setForm(prev => ({ 
                          ...prev, 
                          targetQuantity: raw,
                          accessories: prev.accessories.map(acc => {
                            const selectedAcc = products.find(p => p.id === acc.id);
                            const isKrishka = acc.type === 'krishka' || selectedAcc?.warehouse === 'krishka';
                            const defaultUnits = isKrishka ? 2000 : 1000;
                            return {
                              ...acc,
                              quantity: totalUnits,
                              price: acc.price || (selectedAcc ? (selectedAcc.pricePerBag / (selectedAcc.unitsPerBag || defaultUnits)) : 0)
                            };
                          })
                        }));
                    }}
                    className="w-full h-20 pl-16 pr-8 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-[1.5rem] font-bold text-2xl transition-all outline-none"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("production.accessories")}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const firstKrishka = products.find(p => p.warehouse === 'krishka');
                      if (firstKrishka) {
                        setForm(prev => ({
                          ...prev,
                          accessories: [...prev.accessories, {
                            id: firstKrishka.id,
                            name: firstKrishka.name,
                            quantity: 0,
                            price: firstKrishka.pricePerBag / (firstKrishka.unitsPerBag || 2000),
                            type: 'krishka'
                          }]
                        }));
                      }
                    }}
                    className="text-[10px] font-bold text-purple-600 uppercase tracking-widest hover:text-purple-700 transition-colors"
                  >
                    + {t("production.add")}
                  </button>
                </div>
                {form.accessories.length > 0 && (
                  <div className="grid grid-cols-1 gap-4">
                    {form.accessories.map((acc, index) => (
                      <div key={index} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">{t("production.category")}</p>
                          <select
                            aria-label="Kategoriya tanlash"
                            value={acc.type}
                            onChange={(e) => {
                              const newType = e.target.value;
                              const firstOfNewType = products.find(p => p.warehouse === newType);
                              const isKrishka = newType === 'krishka';
                              const defaultUnits = isKrishka ? 2000 : 1000;
                              setForm(prev => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) => i === index ? {
                                  ...a,
                                  type: newType,
                                  id: firstOfNewType?.id || '',
                                  name: firstOfNewType?.name || '',
                                  price: firstOfNewType ? (firstOfNewType.pricePerBag / (firstOfNewType.unitsPerBag || defaultUnits)) : 0
                                } : a)
                              }));
                            }}
                            className="w-full bg-transparent font-semibold text-purple-600 outline-none"
                          >
                            <option value="krishka">{t("production.krishka")}</option>
                            <option value="ruchka">{t("production.ruchka")}</option>
                          </select>
                        </div>
                        <div className="flex-[2]">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("production.product")}</p>
                          <select
                            aria-label="Mahsulot tanlash"
                            value={acc.id}
                            onChange={(e) => {
                              const newId = e.target.value;
                              const newProduct = products.find(p => p.id === newId);
                              const isKrishka = acc.type === 'krishka' || newProduct?.warehouse === 'krishka';
                              const defaultUnits = isKrishka ? 2000 : 1000;
                              setForm(prev => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) => i === index ? {
                                  ...a,
                                  id: newId,
                                  name: newProduct?.name || '',
                                  price: newProduct ? (newProduct.pricePerBag / (newProduct.unitsPerBag || defaultUnits)) : a.price
                                } : a)
                              }));
                            }}
                            className="w-full bg-transparent font-bold text-gray-900 dark:text-white outline-none"
                          >
                            {products.filter(p => p.warehouse === acc.type).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("production.quantity")}</p>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t("production.quantity")}
                            placeholder="0"
                            value={acc.quantity}
                            onChange={(e) => {
                              const raw = e.target.value.replace(',', '.');
                              if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                              setForm(prev => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) => i === index ? { ...a, quantity: raw } : a)
                              }));
                            }}
                            className="w-full bg-transparent font-semibold text-gray-900 dark:text-white outline-none"
                          />
                        </div>
                        <div className="w-32">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("products.price")}</p>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t("products.price")}
                            placeholder="0"
                            value={acc.price}
                            onChange={(e) => {
                              const raw = e.target.value.replace(',', '.');
                              if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                              setForm(prev => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) => i === index ? { ...a, price: raw } : a)
                              }));
                            }}
                            className="w-full bg-transparent font-semibold text-emerald-600 outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              accessories: prev.accessories.filter((_, i) => i !== index)
                            }));
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                          aria-label="O'chirish"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("production.date")}</label>
                  <input
                    type="date"
                    aria-label={t("production.date")}
                    placeholder="YYYY-MM-DD"
                    value={form.plannedDate}
                    onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
                    className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-2xl font-semibold outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("production.shift")}</label>
                  <select
                    aria-label={t("production.shift")}
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-2xl font-semibold appearance-none outline-none transition-all"
                  >
                    <option value="Kunduzgi">☀️ {t("Kunduzgi")}</option>
                    <option value="Tungi">🌙 {t("Tungi")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("settings.general")}</label>
                <textarea
                  aria-label={t("settings.general")}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-8 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-[2.5rem] font-bold text-sm min-h-[120px] transition-all outline-none resize-none"
                  placeholder={t("Ishlab chiqarish haqida qo'shimcha ma'lumot...")}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-50 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-16 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 font-semibold text-xs tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {t("production.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-[2rem] font-semibold text-xs tracking-[0.2em] shadow-2xl shadow-purple-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Factory className="w-5 h-5" />
                  {t("production.createOrder")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}