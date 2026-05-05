import { useEffect, useState } from 'react';
import api from '../lib/professionalApi';
import { 
  Package2, 
  AlertTriangle, 
  TrendingUp, 
  Truck, 
  Plus, 
  MoreHorizontal, 
  Layers, 
  DollarSign,
  Scale,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportToExcel } from '../lib/excelUtils';

export default function RawMaterials() {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    unit: 'kg',
    minStockLimit: '',
    unitPrice: '',
    supplierId: '',
  });

  useEffect(() => {
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    try {
      const { data } = await api.get('/raw-materials');
      setMaterials(data);
    } catch (error) {
      console.error('Failed to load raw materials');
    }
  };

  const handleExport = () => {
    const dataToExport = materials.map(m => ({
      'Xom ashyo': m.name,
      'Birlik': m.unit,
      'Joriy zaxira': m.currentStock,
      'Min limit': m.minStockLimit,
      'Birlik narxi': m.unitPrice,
      'Jami qiymat': m.currentStock * m.unitPrice,
      'Yetkazuvchi': m.supplier?.name || 'Noma\'lum'
    }));
    exportToExcel(dataToExport, { fileName: 'Xom_ashyolar', sheetName: 'Xom ashyolar' });
  };

  const loadSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/raw-materials', {
        ...form,
        minStockLimit: parseFloat(form.minStockLimit),
        unitPrice: parseFloat(form.unitPrice),
      });
      setShowModal(false);
      setForm({
        name: '',
        unit: 'kg',
        minStockLimit: '',
        unitPrice: '',
        supplierId: '',
      });
      loadMaterials();
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
  };

  const getStockStatus = (material: any) => {
    if (material.currentStock === 0) return { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', label: t('Tugagan'), border: 'border-rose-100 dark:border-rose-800' };
    if (material.currentStock < material.minStockLimit) return { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', label: t('Kam qolgan'), border: 'border-amber-100 dark:border-amber-800' };
    return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: t('Yetarli'), border: 'border-emerald-100 dark:border-emerald-800' };
  };

  const totalValue = materials.reduce((sum, m) => sum + (m.currentStock * m.unitPrice), 0);
  const lowStockCount = materials.filter(m => m.currentStock < m.minStockLimit).length;

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-3xl p-10 sm:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white dark:border-gray-800">
        <div className="absolute top-0 -left-10 w-64 h-64 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/25">
                <Layers className="w-3 h-3 animate-pulse" />
                Raw Materials Management
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-[0.9]">
                {t("Xom")}<br />
                <span className="text-indigo-600">{t("ashyo")}</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md text-sm sm:text-base">
                {t("Ishlab chiqarish uchun zarur bo'lgan barcha xom ashyolar zaxirasi va narxlari")}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <button 
                type="button"
                onClick={handleExport}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold text-sm transition-all active:scale-95 border border-emerald-100 dark:border-emerald-800"
              >
                <FileText className="w-4 h-4" />
                Excel
              </button>
              <button 
                type="button"
                onClick={() => setShowModal(true)} 
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                {t("Yangi xom ashyo")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        {[
          { label: t("Jami Turlar"), value: materials.length, icon: Package2, color: 'blue' },
          { label: t("Kam Zaxira"), value: lowStockCount, icon: AlertTriangle, color: lowStockCount > 0 ? 'rose' : 'emerald' },
          { 
            label: t("Jami Qiymat"), 
            value: totalValue.toLocaleString(), 
            icon: TrendingUp, 
            color: 'emerald',
            suffix: 'UZS'
          },
          { label: t("Yetkazuvchilar"), value: suppliers.length, icon: Truck, color: 'indigo' }
        ].map((stat, i) => (
          <div key={i} className="group bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
            <div className={`w-14 h-14 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 rounded-xl flex items-center justify-center text-${stat.color}-600 mb-8 transition-transform group-hover:rotate-12`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stat.value}
              </p>
              {stat.suffix && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{stat.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Materials Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {materials.map((material) => {
          const status = getStockStatus(material);
          return (
            <div key={material.id} className="group bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm transition-all duration-500 hover:shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8">
                <div className={`w-12 h-12 ${status.bg} rounded-2xl flex items-center justify-center ${status.color} shadow-sm group-hover:rotate-12 transition-transform`}>
                  <Package2 className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">{material.name}</h3>
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      {material.supplier?.name || t('Yetkazuvchi yo\'q')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <div>
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("JORIY ZAXIRA")}</p>
                      <p className={`text-xl font-bold ${status.color} tracking-tight`}>{material.currentStock} <span className="text-xs uppercase ml-1">{material.unit}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("MIN LIMIT")}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{material.minStockLimit} {material.unit}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("BIRLIK NARXI")}</p>
                      <p className="text-sm font-bold text-emerald-600">{material.unitPrice.toLocaleString()} UZS</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{t("JAMI QIYMAT")}</p>
                      <p className="text-sm font-bold text-blue-600">{(material.currentStock * material.unitPrice).toLocaleString()} UZS</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-semibold uppercase tracking-widest shadow-sm ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                  <button type="button" className="w-10 h-10 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all" aria-label="Ko'proq ma'lumot">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                  <Plus className="w-5 h-5" />
                </div>
                {t("Yangi")} <span className="text-indigo-600">{t("xom ashyo")}</span>
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 sm:p-16 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label htmlFor="raw-material-name" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("XOM ASHYO NOMI")}</label>
                  <input
                    id="raw-material-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none transition-all"
                    placeholder={t("Masalan: Granula...")}
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="raw-material-unit" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("O'LCHOV BIRLIGI")}</label>
                  <select
                    id="raw-material-unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none transition-all appearance-none"
                  >
                    <option value="kg">{t("Kilogram (kg)")}</option>
                    <option value="ton">{t("Tonna (ton)")}</option>
                    <option value="litr">{t("Litr (l)")}</option>
                    <option value="dona">{t("Dona")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("MINIMAL ZAXIRA LIMITI")}</label>
                  <div className="relative group">
                    <Scale className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.minStockLimit}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                        setForm({ ...form, minStockLimit: raw });
                      }}
                      className="w-full h-16 pl-16 pr-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("BIRLIK NARXI (UZS)")}</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.unitPrice}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                        setForm({ ...form, unitPrice: raw });
                      }}
                      className="w-full h-16 pl-16 pr-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("YETKAZUVCHI")}</label>
                <select
                  aria-label="Yetkazuvchi tanlash"
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none transition-all appearance-none"
                  required
                >
                  <option value="">{t("Yetkazuvchini tanlang")}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-50 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 font-semibold text-xs tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {t("BEKOR QILISH")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-xs tracking-[0.2em] shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Package2 className="w-5 h-5" />
                  {t("XOM ASHYONI QO'SHISH")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}