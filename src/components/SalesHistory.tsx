import { useState, useEffect } from 'react';
import { Card } from './Card';
import Button from './Button';
import { formatDateTime } from '../lib/dateUtils';
import api from '../lib/api';

interface SalesHistoryLog {
  id: string;
  user: {
    id: string;
    name: string;
    login: string;
    role: string;
  };
  action: string;
  entity: string;
  entityId: string;
  changes: {
    userName: string;
    customerId?: string;
    customerName?: string;
    details: {
      type: string;
      totalAmount?: number;
      paidAmount?: number;
      currency?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      products?: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
      }>;
      oldValue?: any;
      newValue?: any;
      reason?: string;
      notes?: string;
    };
    ipAddress?: string;
    timestamp: string;
  };
  createdAt: string;
}

interface SalesStats {
  totalActions: number;
  byAction: Record<string, number>;
  byUser: Record<string, { name: string; count: number }>;
  byType: {
    CREATE: number;
    EDIT: number;
    DELETE: number;
    PAYMENT: number;
    CANCEL: number;
    VIEW: number;
  };
  byCustomer: Record<string, { name: string; count: number }>;
  totalAmount: {
    sales: number;
    payments: number;
    cancelled: number;
  };
  byPaymentStatus: {
    PAID: number;
    PARTIAL: number;
    UNPAID: number;
  };
}

interface SuspiciousActivity {
  type: string;
  message: string;
  userId?: string;
  count?: number;
  amount?: number;
  logId?: string;
  time?: string;
  customerName?: string;
  severity: string;
}

interface TrendData {
  date: string;
  sales: number;
  amount: number;
  payments: number;
  cancelled: number;
}

export default function SalesHistory() {
  const [history, setHistory] = useState<SalesHistoryLog[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [suspicious, setSuspicious] = useState<SuspiciousActivity[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'stats' | 'suspicious' | 'trend'>('history');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    customerId: '',
    action: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Tarix
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.action) params.append('action', filters.action);

      try {
        const historyData = await api.get(`/audit-logs?${params}`);
        setHistory(Array.isArray(historyData.data) ? historyData.data : []);
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.warn('Unauthorized access to audit history');
          setHistory([]);
        } else {
          console.warn('Failed to load history:', error);
          setHistory([]);
        }
      }

      try {
        const statsRes = await fetch(`/api/sales/audit/stats?${params}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.warn('Failed to load stats:', error);
      }

      try {
        const suspiciousRes = await fetch('/api/sales/audit/suspicious-activity');
        if (suspiciousRes.ok) {
          const suspiciousData = await suspiciousRes.json();
          setSuspicious(Array.isArray(suspiciousData) ? suspiciousData : []);
        }
      } catch (error) {
        console.warn('Failed to load suspicious activity:', error);
      }

      try {
        const trendRes = await fetch('/api/sales/audit/trend?days=30');
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          setTrend(Array.isArray(trendData) ? trendData : []);
        }
      } catch (error) {
        console.warn('Failed to load trend:', error);
      }
    } catch (error) {
      console.error('Failed to load sales history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('YARATISH') || action.includes('QABUL')) return 'text-green-600';
    if (action.includes('UCHIRISH') || action.includes('BEKOR')) return 'text-red-600';
    if (action.includes('TAHRIRLASH')) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'HIGH') return 'bg-red-100 text-red-800 border-red-300';
    if (severity === 'MEDIUM') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (severity === 'WARNING') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (currency === 'USD') return `$${amount.toLocaleString()}`;
    if (currency === 'UZS') return `${amount.toLocaleString()} so'm`;
    if (currency === 'EUR') return `€${amount.toLocaleString()}`;
    return amount.toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📜 Tarix
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'stats'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📊 Statistika
        </button>
        <button
          onClick={() => setActiveTab('suspicious')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'suspicious'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ⚠️ Shubhali Faoliyat
          {suspicious.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
              {suspicious.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('trend')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'trend'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📈 Trend
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'history' && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Boshlanish
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Boshlanish sanasi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tugash
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Tugash sanasi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harakat
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                title="Harakat turi"
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Barchasi</option>
                <option value="YARATISH">Yaratish</option>
                <option value="TAHRIRLASH">Tahrirlash</option>
                <option value="UCHIRISH">O'chirish</option>
                <option value="QABUL">To'lov</option>
                <option value="BEKOR">Bekor qilish</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button
                onClick={() => setFilters({ startDate: '', endDate: '', userId: '', customerId: '', action: '' })}
                variant="secondary"
                className="w-full"
              >
                🔄 Tozalash
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Savdo Tarixi</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Tarix topilmadi</p>
            ) : (
              history.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <p className="text-sm text-gray-600">
                        👤 {log.user.name} ({log.user.role})
                      </p>
                      {log.changes.customerName && (
                        <p className="text-sm text-gray-600">
                          👥 Mijoz: {log.changes.customerName}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>

                  {log.changes.details.totalAmount && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-700">
                        💰 Jami: {formatCurrency(log.changes.details.totalAmount, log.changes.details.currency)}
                      </p>
                      {log.changes.details.paidAmount !== undefined && (
                        <p className="text-gray-700">
                          💳 To'langan: {formatCurrency(log.changes.details.paidAmount, log.changes.details.currency)}
                        </p>
                      )}
                      {log.changes.details.paymentStatus && (
                        <p className="text-gray-700">
                          📊 Holat: {log.changes.details.paymentStatus}
                        </p>
                      )}
                    </div>
                  )}

                  {log.changes.details.products && log.changes.details.products.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">📦 Mahsulotlar:</p>
                      <ul className="text-sm text-gray-600 ml-4">
                        {log.changes.details.products.map((product, idx) => (
                          <li key={idx}>
                            {product.productName} - {product.quantity} qop × {formatCurrency(product.price, log.changes.details.currency)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {log.changes.details.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      📝 {log.changes.details.notes}
                    </p>
                  )}

                  {log.changes.details.reason && (
                    <p className="mt-2 text-sm text-red-600">
                      ❌ Sabab: {log.changes.details.reason}
                    </p>
                  )}

                  {log.changes.ipAddress && (
                    <p className="mt-2 text-xs text-gray-400">
                      🌐 IP: {log.changes.ipAddress}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Umumiy Statistika</h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-blue-600">{stats.totalActions}</p>
              <p className="text-gray-600">Jami harakatlar</p>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Harakat Turlari</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Yaratish:</span>
                <span className="font-semibold">{stats.byType.CREATE}</span>
              </div>
              <div className="flex justify-between">
                <span>To'lov:</span>
                <span className="font-semibold">{stats.byType.PAYMENT}</span>
              </div>
              <div className="flex justify-between">
                <span>Tahrirlash:</span>
                <span className="font-semibold">{stats.byType.EDIT}</span>
              </div>
              <div className="flex justify-between">
                <span>Bekor qilish:</span>
                <span className="font-semibold">{stats.byType.CANCEL}</span>
              </div>
              <div className="flex justify-between">
                <span>O'chirish:</span>
                <span className="font-semibold">{stats.byType.DELETE}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Summa</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Savdolar:</span>
                <span className="font-semibold text-green-600">
                  ${stats.totalAmount.sales.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>To'lovlar:</span>
                <span className="font-semibold text-blue-600">
                  ${stats.totalAmount.payments.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bekor qilingan:</span>
                <span className="font-semibold text-red-600">
                  ${stats.totalAmount.cancelled.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">To'lov Holati</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>To'langan:</span>
                <span className="font-semibold text-green-600">{stats.byPaymentStatus.PAID}</span>
              </div>
              <div className="flex justify-between">
                <span>Qisman:</span>
                <span className="font-semibold text-yellow-600">{stats.byPaymentStatus.PARTIAL}</span>
              </div>
              <div className="flex justify-between">
                <span>To'lanmagan:</span>
                <span className="font-semibold text-red-600">{stats.byPaymentStatus.UNPAID}</span>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Foydalanuvchilar</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Object.entries(stats.byUser).map(([userId, data]) => (
                <div key={userId} className="flex justify-between items-center">
                  <span className="text-gray-700">{data.name}</span>
                  <span className="font-semibold">{data.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Suspicious Tab */}
      {activeTab === 'suspicious' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Shubhali Faoliyat</h3>
          <div className="space-y-4">
            {suspicious.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-green-600 text-lg">✅ Shubhali faoliyat topilmadi</p>
                <p className="text-gray-500 text-sm mt-2">Barcha harakatlar normal</p>
              </div>
            ) : (
              suspicious.map((item, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${getSeverityColor(item.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{item.message}</p>
                      <p className="text-sm mt-1">Turi: {item.type}</p>
                      {item.customerName && (
                        <p className="text-sm">Mijoz: {item.customerName}</p>
                      )}
                      {item.time && (
                        <p className="text-sm">
                          Vaqt: {formatDateTime(item.time)}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold">
                      {item.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Trend Tab */}
      {activeTab === 'trend' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">30 Kunlik Trend</h3>
          <div className="space-y-4">
            {trend.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Ma'lumot topilmadi</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Sana
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Savdolar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Summa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        To'lovlar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Bekor qilingan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trend.map((item) => (
                      <tr key={item.date}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.sales}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                          ${item.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                          ${item.payments.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {item.cancelled}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
