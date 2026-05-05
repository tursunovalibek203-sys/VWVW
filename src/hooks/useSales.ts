import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../lib/professionalApi';
import type { Sale, Customer } from '../types';

export interface SalesFilter {
  search: string;
  status: 'all' | 'paid' | 'debt';
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  paidCount: number;
  debtCount: number;
}

export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SalesFilter>({
    search: '',
    status: 'all',
  });
  const [exchangeRate, setExchangeRate] = useState(12500);
  const [activeTab, setActiveTab] = useState<'sales' | 'history'>('sales');

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, customersRes] = await Promise.all([
        api.get('/sales'),
        api.get('/customers'),
      ]);

      setSales(salesRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (err: any) {
      console.error('Error loading sales:', err);
      setError(err.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch =
        sale.customer?.name?.toLowerCase().includes(searchLower) ||
        sale.id?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (filter.status === 'all') return true;
      if (filter.status === 'paid') return !sale.debtAmount || sale.debtAmount === 0;
      if (filter.status === 'debt') return sale.debtAmount && sale.debtAmount > 0;

      return true;
    });
  }, [sales, filter]);

  // Calculate stats
  const stats: SalesStats = useMemo(() => {
    return {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
      totalPaid: sales.reduce((sum, s) => sum + (s.paid || 0), 0),
      totalDebt: sales.reduce((sum, s) => sum + (s.debtAmount || 0), 0),
      paidCount: sales.filter((s) => !s.debtAmount || s.debtAmount === 0).length,
      debtCount: sales.filter((s) => s.debtAmount && s.debtAmount > 0).length,
    };
  }, [sales]);

  // Get customer by ID
  const getCustomer = useCallback(
    (customerId: string) => {
      return customers.find((c) => c.id === customerId);
    },
    [customers]
  );

  // Delete sale
  const deleteSale = useCallback(
    async (saleId: string) => {
      try {
        await api.delete(`/sales/${saleId}`);
        setSales((prev) => prev.filter((s) => s.id !== saleId));
        return true;
      } catch (err) {
        console.error('Error deleting sale:', err);
        return false;
      }
    },
    []
  );

  return {
    sales,
    customers,
    filteredSales,
    stats,
    loading,
    error,
    filter,
    exchangeRate,
    activeTab,
    setFilter,
    setExchangeRate,
    setActiveTab,
    loadData,
    getCustomer,
    deleteSale,
  };
};

export default useSales;
