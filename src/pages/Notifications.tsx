import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import api from '../lib/professionalApi';
import { formatDate } from '../lib/utils';
import { Bell, AlertTriangle, Package, Users, CheckCircle } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const [stockAlerts, customerAlerts, productAlerts] = await Promise.all([
        api.get('/products/alerts'),
        api.get('/customers/alerts/overdue'),
        api.get('/forecast/overview'),
      ]);

      const allNotifications = [
        ...stockAlerts.data.map((alert: any) => ({
          id: alert.productId,
          type: 'stock',
          title: 'Kam Zaxira',
          message: `${alert.productName} - ${alert.currentStock} qop qoldi`,
          severity: alert.status,
          createdAt: new Date(),
        })),
        ...customerAlerts.data.map((customer: any) => ({
          id: customer.id,
          type: 'customer',
          title: 'Mijoz Ogohlantirish',
          message: customer.debt > 0 
            ? `${customer.name} - ${customer.debt} UZS qarz`
            : `${customer.name} - 30 kun xarid qilmagan`,
          severity: 'warning',
          createdAt: new Date(),
        })),
        ...productAlerts.data
          .filter((f: any) => f.status !== 'ok')
          .map((forecast: any) => ({
            id: forecast.productId,
            type: 'forecast',
            title: 'Prognoz Ogohlantirish',
            message: `${forecast.productName} - ${forecast.daysUntilStockout} kunda tugaydi`,
            severity: forecast.status,
            createdAt: new Date(),
          })),
      ];

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock':
        return <Package className="w-5 h-5" />;
      case 'customer':
        return <Users className="w-5 h-5" />;
      case 'forecast':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'urgent':
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bildirishnomalar</h1>
        <Badge variant="danger">{notifications.length}</Badge>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          Barchasi ({notifications.length})
        </Button>
        <Button
          variant={filter === 'stock' ? 'primary' : 'secondary'}
          onClick={() => setFilter('stock')}
        >
          Zaxira ({notifications.filter((n) => n.type === 'stock').length})
        </Button>
        <Button
          variant={filter === 'customer' ? 'primary' : 'secondary'}
          onClick={() => setFilter('customer')}
        >
          Mijozlar ({notifications.filter((n) => n.type === 'customer').length})
        </Button>
        <Button
          variant={filter === 'forecast' ? 'primary' : 'secondary'}
          onClick={() => setFilter('forecast')}
        >
          Prognoz ({notifications.filter((n) => n.type === 'forecast').length})
        </Button>
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Bildirishnomalar yo'q</h3>
                <p className="text-muted-foreground">Hamma narsa yaxshi holatda</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card key={notification.id}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    notification.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                    notification.severity === 'warning' || notification.severity === 'urgent' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold">{notification.title}</h3>
                      <Badge variant={getSeverityBadge(notification.severity)}>
                        {notification.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
