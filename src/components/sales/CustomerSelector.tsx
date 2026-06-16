import { User } from 'lucide-react';
import type { Customer } from '../../types';
import { trData } from '../../lib/transliterator';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId: string;
  isKocha: boolean;
  customerSearch: string;
  manualCustomerName: string;
  manualCustomerPhone: string;
  latinToCyrillic: (text: string) => string;
  onSelectCustomer: (customer: Customer) => void;
  onSelectKocha: () => void;
  onSearchChange: (value: string) => void;
  onManualNameChange: (value: string) => void;
  onManualPhoneChange: (value: string) => void;
}

export const CustomerSelector = ({
  customers,
  selectedCustomerId,
  isKocha,
  customerSearch,
  manualCustomerName,
  manualCustomerPhone,
  latinToCyrillic,
  onSelectCustomer,
  onSelectKocha,
  onSearchChange,
  onManualNameChange,
  onManualPhoneChange,
}: CustomerSelectorProps) => {
  const filteredCustomers = customers
    .filter((c) => {
      if (!customerSearch) return true;
      const search = customerSearch.toLowerCase();
      return c.name?.toLowerCase().includes(search) || c.phone?.includes(search);
    })
    .sort((a, b) => {
      // Tanlangan mijoz birinchi o'rinda turadi
      if (a.id === selectedCustomerId) return -1;
      if (b.id === selectedCustomerId) return 1;
      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        <label className="text-base font-bold text-gray-900">
          {latinToCyrillic('Mijoz')} ({customers.length} ta)
        </label>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <User className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder={latinToCyrillic('Mijoz qidirish...')}
          value={customerSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-12 px-4 pl-12 text-sm font-bold rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white shadow-sm"
        />
      </div>

      {/* Customer List */}
      <div className="mt-3 max-h-[200px] overflow-y-auto space-y-2">
        {filteredCustomers.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => onSelectCustomer(customer)}
            className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
              selectedCustomerId === customer.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900 text-sm">{trData(customer.name)}</p>
                <p className="text-xs text-gray-500">{customer.phone || '—'}</p>
              </div>
              {customer.debtUSD && customer.debtUSD > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">
                  ${customer.debtUSD.toFixed(0)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Kocha Option */}
      <button
        type="button"
        onClick={onSelectKocha}
        className={`w-full mt-3 p-3 rounded-xl border-2 text-left transition-all ${
          isKocha
            ? 'border-orange-500 bg-orange-50 shadow-md'
            : 'border-gray-200 hover:border-orange-300 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isKocha ? 'bg-orange-500' : 'bg-gray-400'
            } text-white`}
          >
            <User className="w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900">
            {latinToCyrillic("Ko'chaga (qo'l mijoz)")}
          </span>
        </div>
      </button>

      {/* Manual Customer Form */}
      {isKocha && (
        <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm font-semibold text-yellow-800">
            {latinToCyrillic("Mijoz ma'lumotlari")}
          </p>
          <input
            type="text"
            placeholder={latinToCyrillic('Mijoz ismi')}
            value={manualCustomerName}
            onChange={(e) => onManualNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
          />
          <input
            type="text"
            placeholder={latinToCyrillic('Telefon raqami')}
            value={manualCustomerPhone}
            onChange={(e) => onManualPhoneChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
          />
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
