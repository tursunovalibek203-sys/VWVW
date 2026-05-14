import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PiggyBank, 
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Currency, currencyManager, formatCurrency } from '../lib/professionalCurrency';
import { 
  accountingManager, 
  generateBalanceSheet, 
  generateIncomeStatement, 
  generateCashFlowStatement 
} from '../lib/professionalAccounting';
import { DateUtils } from '../lib/professionalUtils';

interface FinancialDashboardProps {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  currency?: Currency;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  profitMargin: number;
  revenueGrowth: number;
  expenseGrowth: number;
}

export default function ProfessionalFinancialDashboard({
  period = 'month',
  currency = Currency.UZS,
  showCharts = true,
  showDetails = true,
  className = '',
}: FinancialDashboardProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod, selectedCurrency]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(selectedPeriod);
      setDateRange({ start, end });

      // Generate financial statements
      const incomeStatement = accountingManager.generateIncomeStatement(start, end);
      const balanceSheet = accountingManager.generateBalanceSheet(end);
      const cashFlow = accountingManager.generateCashFlowStatement(start, end);

      // Calculate metrics
      const totalRevenue = convertToCurrency(incomeStatement.totalRevenue, selectedCurrency);
      const totalExpenses = convertToCurrency(incomeStatement.totalExpenses, selectedCurrency);
      const netProfit = totalRevenue - totalExpenses;
      const cashBalance = convertToCurrency(cashFlow.endingCashBalance, selectedCurrency);
      
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      
      // Calculate growth (simplified - would need historical data)
      const revenueGrowth = 12.5; // Placeholder
      const expenseGrowth = 8.3; // Placeholder

      setMetrics({
        totalRevenue,
        totalExpenses,
        netProfit,
        cashBalance,
        accountsReceivable: 0, // Would calculate from balance sheet
        accountsPayable: 0, // Would calculate from balance sheet
        profitMargin,
        revenueGrowth,
        expenseGrowth,
      });
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - now.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        start.setDate(1);
        end.setMonth(now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth((quarter + 1) * 3, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
    }

    return { start, end };
  };

  const convertToCurrency = (amounts: Record<string, number>, targetCurrency: Currency): number => {
    let total = 0;
    
    Object.entries(amounts).forEach(([currency, amount]) => {
      if (currency === targetCurrency) {
        total += amount;
      } else {
        const conversion = currencyManager.convertCurrency(amount, currency as Currency, targetCurrency);
        if (conversion) {
          total += conversion.convertedAmount;
        }
      }
    });

    return total;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFinancialData();
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log('Exporting financial data...');
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'blue',
    trend = 'up'
  }: {
    title: string;
    value: string;
    change?: number;
    icon: any;
    color?: string;
    trend?: 'up' | 'down';
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          color === 'blue' ? 'bg-blue-100 text-blue-600' :
          color === 'green' ? 'bg-green-100 text-green-600' :
          color === 'red' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' && change > 0 ? 'text-green-600' :
            trend === 'up' && change < 0 ? 'text-red-600' :
            trend === 'down' && change > 0 ? 'text-red-600' :
            'text-green-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Unable to load financial data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
          <p className="text-gray-500">
            {DateUtils.formatDate(dateRange.start)} - {DateUtils.formatDate(dateRange.end)}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          {/* Currency Selector */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={Currency.UZS}>UZS</option>
            <option value={Currency.USD}>USD</option>
            <option value={Currency.EUR}>EUR</option>
            <option value={Currency.RUB}>RUB</option>
          </select>

          {/* Actions */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-pulse' : ''}`} />
          </button>
          
          <button
            onClick={handleExport}
            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue, selectedCurrency)}
          change={metrics.revenueGrowth}
          icon={TrendingUp}
          color="green"
          trend="up"
        />
        
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(metrics.totalExpenses, selectedCurrency)}
          change={metrics.expenseGrowth}
          icon={CreditCard}
          color="red"
          trend="up"
        />
        
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics.netProfit, selectedCurrency)}
          change={metrics.profitMargin}
          icon={DollarSign}
          color="blue"
          trend="up"
        />
        
        <MetricCard
          title="Cash Balance"
          value={formatCurrency(metrics.cashBalance, selectedCurrency)}
          icon={PiggyBank}
          color="green"
          trend="up"
        />
      </div>

      {/* Profit Margin */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profit Margin</h3>
          <span className="text-2xl font-bold text-blue-600">
            {metrics.profitMargin.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, metrics.profitMargin))}%` }}
          />
        </div>
      </div>

      {/* Additional Details */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Product Sales</span>
                <span className="font-medium">{formatCurrency(metrics.totalRevenue * 0.8, selectedCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Services</span>
                <span className="font-medium">{formatCurrency(metrics.totalRevenue * 0.2, selectedCurrency)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Revenue</span>
                  <span className="font-bold text-blue-600">{formatCurrency(metrics.totalRevenue, selectedCurrency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cost of Goods</span>
                <span className="font-medium">{formatCurrency(metrics.totalExpenses * 0.6, selectedCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Operating Expenses</span>
                <span className="font-medium">{formatCurrency(metrics.totalExpenses * 0.3, selectedCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Other Expenses</span>
                <span className="font-medium">{formatCurrency(metrics.totalExpenses * 0.1, selectedCurrency)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Expenses</span>
                  <span className="font-bold text-red-600">{formatCurrency(metrics.totalExpenses, selectedCurrency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart Placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart would be rendered here</p>
            </div>
          </div>

          {/* Expense Trend Chart Placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart would be rendered here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
