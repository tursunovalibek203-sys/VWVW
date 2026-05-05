import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  Users, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Download,
  Printer,
  CashRegister,
  Receipt,
  BarChart3,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  posSystem, 
  Transaction, 
  CashShift, 
  CartItem,
  PaymentMethod,
  TransactionStatus,
  ShiftStatus,
  getSalesSummary,
  startPOSSession
} from '../lib/professionalPOSSystem';

interface POSDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalPOSDashboard({
  refreshInterval = 10000,
  showCharts = true,
  showDetails = true,
  className = '',
}: POSDashboardProps) {
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [cartSummary, setCartSummary] = useState<any>(null);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadPOSDashboard();
    
    const interval = setInterval(() => {
      loadPOSDashboard();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadPOSDashboard = () => {
    try {
      setRefreshing(true);
      
      const pos = posSystem.getInstance();
      const shift = pos.getCurrentShift();
      const cart = pos.getCartSummary();
      const sales = pos.getSalesSummary();
      const transactions = pos.getTransactions(10);
      
      setCurrentShift(shift);
      setCartSummary(cart);
      setSalesSummary(sales);
      setRecentTransactions(transactions);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load POS dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartSession = async () => {
    try {
      if (isSessionActive) {
        const pos = posSystem.getInstance();
        await pos.endSession();
        setIsSessionActive(false);
      } else {
        await startPOSSession({
          cashierId: 'cashier_1',
          cashierName: 'Kassir',
          storeId: 'store_1',
          storeName: 'LUX PET PLAST',
          registerId: 'register_1',
          registerName: 'Kassa 1',
          currency: 'UZS',
          locale: 'uz_UZ',
          taxRate: 0.12,
          enableDiscounts: true,
          enableTips: false,
          enableLoyalty: true,
          enableInventory: true,
          maxRefundDays: 7,
          receiptTemplate: 'standard',
          printerSettings: {
            enabled: true,
            autoPrint: true,
            copies: 1,
            paperSize: '80mm',
          },
          paymentSettings: {
            acceptedMethods: [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MOBILE],
            requireConfirmation: true,
            enableSplitPayment: true,
            maxCashAmount: 5000000,
          },
        });
        setIsSessionActive(true);
      }
    } catch (error) {
      console.error('Failed to start/end POS session:', error);
    }
  };

  const handleRefresh = () => {
    loadPOSDashboard();
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return <DollarSign className="w-4 h-4" />;
      case PaymentMethod.CARD: return <CreditCard className="w-4 h-4" />;
      case PaymentMethod.MOBILE: return <Smartphone className="w-4 h-4" />;
      case PaymentMethod.BANK_TRANSFER: return <BarChart3 className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: TransactionStatus | ShiftStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
      case ShiftStatus.IN_PROGRESS:
        return 'text-green-600';
      case TransactionStatus.PENDING:
      case ShiftStatus.OPEN:
        return 'text-yellow-600';
      case TransactionStatus.CANCELLED:
      case TransactionStatus.REFUNDED:
      case ShiftStatus.CLOSED:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: TransactionStatus | ShiftStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
      case ShiftStatus.IN_PROGRESS:
        return <CheckCircle className="w-4 h-4" />;
      case TransactionStatus.PENDING:
      case ShiftStatus.OPEN:
        return <Clock className="w-4 h-4" />;
      case TransactionStatus.CANCELLED:
      case TransactionStatus.REFUNDED:
      case ShiftStatus.CLOSED:
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isSessionActive ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <CashRegister className={`w-6 h-6 ${isSessionActive ? 'text-green-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">POS Dashboard</h2>
            <p className="text-sm text-gray-500">
              Status: <span className={`font-medium ${isSessionActive ? 'text-green-600' : 'text-gray-600'}`}>
                {isSessionActive ? 'Session Active' : 'Session Inactive'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleStartSession}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isSessionActive 
                ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                : 'bg-green-100 hover:bg-green-200 text-green-600'
            }`}
          >
            {isSessionActive ? (
              <>
                <Pause className="w-4 h-4" />
                End Session
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Session
              </>
            )}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Shift */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 ${getStatusColor(currentShift?.status || ShiftStatus.CLOSED)}`}>
              {getStatusIcon(currentShift?.status || ShiftStatus.CLOSED)}
              <span className="text-sm font-medium">
                {currentShift?.status || 'CLOSED'}
              </span>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Current Shift</p>
          <p className="text-xs text-gray-500 mt-1">
            {currentShift ? `${currentShift.summary.transactionCount} transactions` : 'No active shift'}
          </p>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {cartSummary?.itemCount || 0}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Cart Items</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(cartSummary?.total || 0)}
          </p>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(salesSummary?.totalSales || 0)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Sales</p>
          <p className="text-xs text-gray-500 mt-1">
            {salesSummary?.totalTransactions || 0} transactions
          </p>
        </div>

        {/* Average Sale */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(salesSummary?.averageSale || 0)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Average Sale</p>
          <p className="text-xs text-gray-500 mt-1">
            Per transaction
          </p>
        </div>
      </div>

      {/* Current Shift Details */}
      {currentShift && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Current Shift</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {currentShift.openingTime.toLocaleTimeString()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(currentShift.openingBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(currentShift.summary.totalSales)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Refunds</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(currentShift.summary.totalRefunds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expected Cash</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(currentShift.expectedCash)}
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Payment Methods</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Cash</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(currentShift.summary.totalCash)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Card</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(currentShift.summary.totalCard)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Mobile</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(currentShift.summary.totalMobile)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(transaction.status)}`}>
                    {getStatusIcon(transaction.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.type === 'sale' ? 'Sale' : 'Refund'} - #{transaction.id.slice(-8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(transaction.total)}
                    </p>
                    <div className="flex items-center gap-1">
                      {transaction.payments.map((payment, index) => (
                        <div key={index} className="flex items-center gap-1">
                          {getPaymentIcon(payment.method)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600" title="View receipt">
                    <Receipt className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Products */}
      {salesSummary?.topProducts && salesSummary.topProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Products
            </button>
          </div>
          
          <div className="space-y-3">
            {salesSummary.topProducts.slice(0, 5).map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.quantity} units sold</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="text-xs">Top</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900">New Sale</p>
              <p className="text-xs text-blue-700">Start transaction</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <Users className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-900">Customer</p>
              <p className="text-xs text-green-700">Add customer</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <Package className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-purple-900">Inventory</p>
              <p className="text-xs text-purple-700">Check stock</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            <Receipt className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-orange-900">Reports</p>
              <p className="text-xs text-orange-700">View reports</p>
            </div>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          POS Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          Sales Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>
    </div>
  );
}
