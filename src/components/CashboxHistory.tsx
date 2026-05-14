import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import Button from './Button';
import Input from './Input';
import api from '../lib/api';
import { 
  History, 
  User, 
  Calendar, 
  Filter, 
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Eye,
  RefreshCw
} from 'lucide-react';

interface HistoryLog {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entityId: string;
  details: {
    userName: string;
    details: {
      type: string;
      amount?: number;
      currency?: string;
      paymentMethod?: string;
      from?: string;
      to?: string;
      description?: string;
    };
    ipAddress?: string;
    timestamp: string;
  };
  createdAt: string;
}

interface AuditStats {
  totalActions: number;
  byAction: Record<string, number>;
  byUser: Record<string, { name: string; count: number }>;
  byType: {
    ADD: number;
    WITHDRAW: number;
    TRANSFER: number;
    EDIT: number;
    DELETE: number;
    VIEW: number;
  };
  totalAmount: {
    added: number;
    withdrawn: number;
    transferred: number;
  };
}

export default function CashboxHistory() {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [suspicious, setSuspicious] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    limit: '50',
  });

  useEffect(() => {
    loadHistory();
    loadStats();
    loadSuspicious();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/cashbox/history?${params.toString()}`);
      setHistory(response.data);
    } catch (error) {
      console.error('Tarixni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/cashbox/audit-stats?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      console.error('Statistikani yuklashda xatolik');
    }
  };

  const loadSuspicious = async () => {
    try {
      const response = await api.get('/cashbox/suspicious-activity');
      setSuspicious(response.data);
    } catch (error) {
      console.error('Shubhali faoliyatni yuklashda xatolik');
    }
  };

  const applyFilters = () => {
    loadHistory();
    loadStats();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: '',
      limit: '50',
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('KIRIM')) return <TrendingDown className="w-4 h-4 text-green-600" />;
    if (action.includes('CHIQIM')) return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (action.includes('TRANSFER')) return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
    if (action.includes('KORISH')) return <Eye className="w-4 h-4 text-gray-600" />;
    return <History className="w-4 h-4 text-gray-600" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('KIRIM')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (action.includes('CHIQIM')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (action.includes('TRANSFER')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <History className="w-7 h-7 text-primary" />
            Kassa Tarixi
          </h2>
          <p className="text-muted-foreground mt-1">
            Barcha kassa tranzaksiyalari va o'zgarishlar
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(true)} variant="secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filtr
          </Button>
          <Button onClick={loadHistory} variant="secondary">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Eksport
          </Button>
        </div>
      </div>

      {/* Shubhali Faoliyat */}
      {suspicious.length > 0 && (
        <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertTriangle className="w-5 h-5" />
              Shubhali Faoliyat Aniqlandi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspicious.slice(0, 5).map((item, index) => (
                <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Xavf darajasi: {item.severity}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                      item.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistika */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Jami Harakatlar</p>
              <p className="text-2xl font-bold">{stats.totalActions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Kirimlar</p>
              <p className="text-2xl font-bold text-green-600">{stats.byType.ADD}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${stats.totalAmount.added.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Chiqimlar</p>
              <p className="text-2xl font-bold text-red-600">{stats.byType.WITHDRAW}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${stats.totalAmount.withdrawn.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Transferlar</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byType.TRANSFER}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${stats.totalAmount.transferred.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tarix Jadvali */}
      <Card>
        <CardHeader>
          <CardTitle>Tranzaksiyalar Tarixi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Sana/Vaqt</th>
                  <th className="text-left py-3 px-4">Foydalanuvchi</th>
                  <th className="text-left py-3 px-4">Harakat</th>
                  <th className="text-left py-3 px-4">Tafsilotlar</th>
                  <th className="text-right py-3 px-4">Summa</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(log.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString('uz-UZ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{log.user.name}</p>
                          <p className="text-xs text-muted-foreground">{log.user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm">{log.details.details.description || '-'}</p>
                      {log.details.details.paymentMethod && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.details.details.paymentMethod}
                        </p>
                      )}
                      {log.details.details.from && log.details.details.to && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.details.details.from} â†’ {log.details.details.to}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.details.details.amount ? (
                        <p className={`font-semibold ${
                          log.details.details.type === 'ADD' ? 'text-green-600' :
                          log.details.details.type === 'WITHDRAW' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {log.details.details.type === 'ADD' ? '+' : 
                           log.details.details.type === 'WITHDRAW' ? '-' : ''}
                          ${log.details.details.amount.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                      {log.details.details.currency && log.details.details.currency !== 'USD' && (
                        <p className="text-xs text-muted-foreground">
                          ({log.details.details.currency})
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filtrlar Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtrlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Boshlanish Sanasi"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
                <Input
                  label="Tugash Sanasi"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
                <Input
                  label="Harakat"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  placeholder="Masalan: KIRIM, CHIQIM"
                />
                <Input
                  label="Limit"
                  type="number"
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetFilters}
                    className="flex-1"
                  >
                    Tozalash
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowFilters(false)}
                    className="flex-1"
                  >
                    Bekor qilish
                  </Button>
                  <Button onClick={applyFilters} className="flex-1">
                    Qo'llash
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
