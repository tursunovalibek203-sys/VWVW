// Mijozlar qarzini boshqarish tugmalari
import React, { useState } from 'react';
import { api } from '../lib/api';
import Button from '../components/Button';
import { DollarSign, AlertCircle } from 'lucide-react';
import { safeParseFloat, validatePositiveNumber } from '../lib/safe-math';

interface CustomerDebtManagerProps {
  customerId: string;
  customerName: string;
  currentDebtUSD: number;
  currentDebtUZS: number;
  onUpdate: () => void;
}

const CustomerDebtManager: React.FC<CustomerDebtManagerProps> = ({
  customerId,
  customerName,
  currentDebtUSD,
  currentDebtUZS,
  onUpdate
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const validAmount = validatePositiveNumber(amount, 'amount', 0);
    if (validAmount <= 0) {
      console.log('Iltimos, to\'g\'ri summa kiriting!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/customers/${customerId}/debt`, {
        amount: validAmount,
        currency,
        description: description || 'To\'lov qilindi',
        type: 'PAYMENT'
      });

      if (response.data.success) {
        console.log('To\'lov muvaffaqiyatli amalga oshirildi!');
        setAmount('');
        setDescription('');
        onUpdate();
      } else {
        console.log(response.data.error || 'Xatolik yuz berdi!');
      }
    } catch (error) {
      console.error('To\'lov xatoligi:', error);
      console.log('Server xatoligi!');
    } finally {
      setLoading(false);
    }
  };

  const handleDebt = async () => {
    const validAmount = validatePositiveNumber(amount, 'amount', 0);
    if (validAmount <= 0) {
      console.log('Iltimos, qarz summasini kiriting!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/customers/${customerId}/debt`, {
        amount: validAmount,
        currency,
        description: description || 'Qarz qo\'shildi',
        type: 'DEBT'
      });

      if (response.data.success) {
        console.log('Qarz muvaffaqiyatli qo\'shildi!');
        setAmount('');
        setDescription('');
        onUpdate();
      } else {
        console.log(response.data.error || 'Xatolik yuz berdi!');
      }
    } catch (error) {
      console.error('Qarz xatoligi:', error);
      console.log('Server xatoligi!');
    } finally {
      setLoading(false);
    }
  };

  // Qarz limitlari
  const debtLimits = {
    USD: 550,
    UZS: 800000
  };

  const currentDebtInSelectedCurrency = currency === 'USD' ? currentDebtUSD : currentDebtUZS;
  const newTotalDebt = currentDebtInSelectedCurrency + safeParseFloat(amount, 0);
  const limitExceeded = newTotalDebt > (debtLimits[currency as keyof typeof debtLimits] || 0);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          ðŸ’° {customerName} - Qarz Boshqarish
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate()}
        >
          âŒ
        </Button>
      </div>

      {/* Joriy qarz holati */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Joriy Qarz
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">USD:</span>
              <span className="font-bold text-blue-600">
                ${currentDebtUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">UZS:</span>
              <span className="font-bold text-blue-600">
                {currentDebtUZS.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900 p-3 rounded-lg border border-red-200 dark:border-red-700">
          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
            Qarz Limitlari
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">USD limiti:</span>
              <span className="font-bold text-red-600">
                ${debtLimits.USD}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">UZS limiti:</span>
              <span className="font-bold text-red-600">
                {debtLimits.UZS.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Amallar */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Summa
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD</option>
              <option value="UZS">UZS</option>
            </select>
          </div>
          {limitExceeded && (
            <div className="text-red-600 text-sm mt-1">
              âš ï¸ Qarz limitidan oshib ketishi mumkin!
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Izoh
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Izoh..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handlePayment}
            disabled={loading || safeParseFloat(amount, 0) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-pulse rounded-full h-4 w-4 border-b-2 border-r-2 border-t-2 border-l-2 border-green-500"></div>
                <span className="ml-2">To'lov...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                To'lov
              </div>
            )}
          </Button>

          <Button
            onClick={handleDebt}
            disabled={loading || safeParseFloat(amount, 0) <= 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-pulse rounded-full h-4 w-4 border-b-2 border-r-2 border-t-2 border-l-2 border-red-500"></div>
                <span className="ml-2">Qarz...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Qarz
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtManager;
