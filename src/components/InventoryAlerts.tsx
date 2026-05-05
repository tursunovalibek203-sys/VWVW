import { useEffect, useState } from 'react';
import { AlertTriangle, X, Package, TrendingDown } from 'lucide-react';
import { Card, CardContent } from './Card';
import Button from './Button';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface LowStockProduct {
  id: number;
  name: string;
  currentStock: number;
  minStock: number;
  bagType: string;
}

export default function InventoryAlerts() {
  const [alerts, setAlerts] = useState<LowStockProduct[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const { data } = await api.get('/products');
      const lowStock = data.filter((p: any) => p.currentStock <= p.minStock);
      setAlerts(lowStock);
      if (lowStock.length > 0) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Инвентар огohlантиришларини юклашда хатолик');
    }
  };

  if (!isVisible || alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-md animate-slide-in">
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                Кам Захира Огohlантиришлари
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Package className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.bagType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-600">
                      {product.currentStock}
                    </p>
                    <p className="text-xs text-muted-foreground">қоп</p>
                  </div>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
              </div>
            ))}
          </div>

          {alerts.length > 5 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              +{alerts.length - 5} та бошқа маҳсулот
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                navigate('/products');
                setIsVisible(false);
              }}
              className="flex-1"
            >
              Маҳсулотларни Кўриш
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsVisible(false)}
            >
              Ёпиш
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
