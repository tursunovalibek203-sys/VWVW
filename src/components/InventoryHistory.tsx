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
  Package,
  Plus,
  Minus,
  RefreshCw,
  Edit,
  Eye
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
    productId?: string;
    productName?: string;
    details: {
      type: string;
      quantityBags?: number;
      quantityUnits?: number;
      previousStock?: number;
      previousUnits?: number;
      newStock?: number;
      newUnits?: number;
      reason?: string;
      notes?: string;
      batchId?: string;
      shift?: string;
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
    REMOVE: number;
    ADJUST: number;
    PRODUCTION: number;
    SALE: number;
    TRANSFER: number;
    EDIT: number;
    DELETE: number;
    VIEW: number;
  };
  byProduct: Record<string, { name: string; count: number }>;
  totalQuantity: {
    added: number;
    removed: number;
    adjusted: number;
  };
}

export default function InventoryHistory() {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [suspicious, setSuspicious] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    productId: '',
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
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.action) params.append('action', filters.action);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/products/audit/history?${params.toString()}`);
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

      const response = await api.get(`/products/audit/stats?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      console.error('Statistikani yuklashda xatolik');
    }
  };

  const loadSuspicious = async () => {
    try {
      const response = await api.get('/products/audit/suspicious-activity');
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
      productId: '',
      action: '',
      limit: '50',
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('QOSHISH') || action.includes('PARTIYA')) return <Plus className="w-4 h-4 text-green-600" />;
    if (action.includes('KAMAYTIRISH')) return <Minus className="w-4 h-4 text-red-600" />;
    if (action.includes('TAHRIRLASH')) return <Edit className="w-4 h-4 text-blue-600" />;
    if (action.includes('KORISH')) return <Eye className="w-4 h-4 text-gray-600" />;
    return <Package className="w-4 h-4 text-gray-600" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('QOSHISH') || action.includes('PARTIYA')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (action.includes('KAMAYTIRISH')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (action.includes('TAHRIRLASH')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  // Top mahsulotlar
  const topProducts = stats ? Object.entries(stats.byProduct)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <History className="w-7 h-7 text-primary" />
            Ombor Tarixi
          </h2>
          <p className="text-muted-foreground mt-1">
            Barcha ombor o'zgarishlari va harakatlar
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Jami Harakatlar</p>
                <p className="text-2xl font-bold">{stats.totalActions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Qo'shildi</p>
                <p className="text-2xl font-bold text-green-600">{stats.byType.ADD + stats.byType.PRODUCTION}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalQuantity.added} qop
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Kamaytirildi</p>
                <p className="text-2xl font-bold text-red-600">{stats.byType.REMOVE + stats.byType.SALE}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalQuantity.removed} qop
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Tuzatishlar</p>
                <p className="text-2xl font-bold text-blue-600">{stats.byType.ADJUST}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalQuantity.adjusted} qop
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Mahsulotlar */}
          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Eng Ko'p O'zgargan Mahsulotlar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map(([productId, data]) => (
                    <div key={productId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.count} ta o'zgarish</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">
                        Ko'rish
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tarix Jadvali */}
      <Card>
        <CardHeader>
          <CardTitle>O'zgarishlar Tarixi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Sana/Vaqt</th>
                  <th className="text-left py-3 px-4">Foydalanuvchi</th>
                  <th className="text-left py-3 px-4">Harakat</th>
                  <th className="text-left py-3 px-4">Mahsulot</th>
                  <th className="text-right py-3 px-4">Miqdor</th>
                  <th className="text-left py-3 px-4">Sabab</th>
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
                      <p className="text-sm font-medium">{log.details.productName || '-'}</p>
                      {log.details.details.shift && (
                        <p className="text-xs text-muted-foreground">
                          Smena: {log.details.details.shift}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.details.details.quantityBags !== undefined ? (
                        <div>
                          <p className={`font-semibold ${
                            log.details.details.type === 'ADD' || log.details.details.type === 'PRODUCTION' ? 'text-green-600' :
                            log.details.details.type === 'REMOVE' || log.details.details.type === 'SALE' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {log.details.details.type === 'ADD' || log.details.details.type === 'PRODUCTION' ? '+' : 
                             log.details.details.type === 'REMOVE' || log.details.details.type === 'SALE' ? '-' : ''}
                            {Math.abs(log.details.details.quantityBags)} qop
                          </p>
                          {log.details.details.quantityUnits !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {Math.abs(log.details.details.quantityUnits)} dona
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm">{log.details.details.reason || log.details.details.notes || '-'}</p>
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
                  label="Mahsulot ID"
                  value={filters.productId}
                  onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                  placeholder="Mahsulot ID"
                />
                <Input
                  label="Harakat"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  placeholder="Masalan: QOSHISH, KAMAYTIRISH"
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
