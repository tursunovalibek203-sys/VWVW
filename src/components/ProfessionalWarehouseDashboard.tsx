import { useState, useEffect } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  Package, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Download,
  Search,
  Activity,
  Users,
  Settings,
  Thermometer,
  Droplets,
  Shield,
  Truck,
  Box,
  Target,
  Navigation,
  Layers
} from 'lucide-react';
import type {
  Warehouse,
} from '../lib/professionalWarehouse';
import {
  ProfessionalWarehouseManager,
  WarehouseType,
  BinStatus,
} from '../lib/professionalWarehouse';

interface WarehouseDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalWarehouseDashboard({
  refreshInterval = 15000,
  showCharts: _showCharts = true,
  showDetails: _showDetails = true,
  className = '',
}: WarehouseDashboardProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'bins' | 'inventory' | 'movements' | 'cyclecount'>('overview');

  useEffect(() => {
    loadWarehouseData();
    
    const interval = setInterval(() => {
      loadWarehouseData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadWarehouseData = () => {
    try {
      setRefreshing(true);
      
      const wm = ProfessionalWarehouseManager.getInstance();
      const warehousesData = wm.getWarehouses();
      
      setWarehouses(warehousesData);
      
      if (warehousesData.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(warehousesData[0]);
        const analyticsData = wm.getWarehouseAnalytics(warehousesData[0].id);
        setAnalytics(analyticsData);
      }
      
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load warehouse data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadWarehouseData();
  };

  const handleWarehouseSelect = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    const wm = ProfessionalWarehouseManager.getInstance();
    const analyticsData = wm.getWarehouseAnalytics(wh.id);
    setAnalytics(analyticsData);
  };

  const getWarehouseTypeIcon = (type: WarehouseType) => {
    switch (type) {
      case WarehouseType.MAIN:
        return <WarehouseIcon className="w-5 h-5" />;
      case WarehouseType.DISTRIBUTION:
        return <Truck className="w-5 h-5" />;
      case WarehouseType.RETAIL:
        return <Package className="w-5 h-5" />;
      case WarehouseType.PRODUCTION:
        return <Box className="w-5 h-5" />;
      case WarehouseType.TRANSIT:
        return <Navigation className="w-5 h-5" />;
      case WarehouseType.RETURNS:
        return <RefreshCw className="w-5 h-5" />;
      case WarehouseType.QUARANTINE:
        return <Shield className="w-5 h-5" />;
      default:
        return <WarehouseIcon className="w-5 h-5" />;
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
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <WarehouseIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Warehouse Dashboard</h2>
            <p className="text-sm text-gray-500">
              {warehouses.length} warehouses
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
        </div>
      </div>

      {/* Warehouse Selector */}
      <div className="flex gap-4">
        {warehouses.map((warehouse) => (
          <button
            key={warehouse.id}
            onClick={() => handleWarehouseSelect(warehouse)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
              selectedWarehouse?.id === warehouse.id
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {getWarehouseTypeIcon(warehouse.type)}
            <div className="text-left">
              <p className="text-sm font-medium">{warehouse.name}</p>
              <p className="text-xs text-gray-500">{warehouse.code}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedWarehouse && analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Space Utilization */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.utilization.spaceUtilization.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Space Utilization</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.warehouse.capacity.utilizedPositions}/{analytics.warehouse.capacity.totalPositions} positions
              </p>
            </div>

            {/* Weight Utilization */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.utilization.weightUtilization.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Weight Utilization</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.warehouse.capacity.currentWeight.toLocaleString()} kg / {analytics.warehouse.capacity.maxWeight.toLocaleString()} kg
              </p>
            </div>

            {/* Total Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Box className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.inventory.totalItems.toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(analytics.inventory.totalValue)}
              </p>
            </div>

            {/* Accuracy Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.performance.accuracyRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
              <p className="text-xs text-gray-500 mt-1">
                Cycle count accuracy
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'bins', label: 'Bin Locations', icon: Layers },
              { id: 'inventory', label: 'Inventory', icon: Package },
              { id: 'movements', label: 'Movements', icon: Activity },
              { id: 'cyclecount', label: 'Cycle Count', icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <>
              {/* Zones */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Warehouse Zones</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedWarehouse.zones.map((zone) => (
                    <div key={zone.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{zone.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          zone.type === 'storage' ? 'bg-blue-100 text-blue-700' :
                          zone.type === 'picking' ? 'bg-green-100 text-green-700' :
                          zone.type === 'packing' ? 'bg-purple-100 text-purple-700' :
                          zone.type === 'shipping' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {zone.type}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Temperature:</span>
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-blue-500" />
                            <span>{zone.temperature.current || zone.temperature.min}°C</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Humidity:</span>
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            <span>{zone.humidity.current || zone.humidity.min}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Security:</span>
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-yellow-500" />
                            <span className="capitalize">{zone.security}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Equipment Status</h3>
                <div className="space-y-3">
                  {selectedWarehouse.equipment.map((equipment) => (
                    <div key={equipment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          equipment.status === 'available' ? 'bg-green-100' :
                          equipment.status === 'in_use' ? 'bg-blue-100' :
                          equipment.status === 'maintenance' ? 'bg-orange-100' :
                          'bg-red-100'
                        }`}>
                          {equipment.type === 'forklift' ? <Truck className="w-4 h-4 text-gray-600" /> :
                           equipment.type === 'pallet_jack' ? <Package className="w-4 h-4 text-gray-600" /> :
                           <Box className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{equipment.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{equipment.type}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-bold capitalize ${
                          equipment.status === 'available' ? 'text-green-600' :
                          equipment.status === 'in_use' ? 'text-blue-600' :
                          equipment.status === 'maintenance' ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {equipment.status.replace('_', ' ')}
                        </p>
                        {equipment.capacity && (
                          <p className="text-xs text-gray-500">{equipment.capacity} kg</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Staff</h3>
                <div className="space-y-3">
                  {selectedWarehouse.staff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-bold capitalize ${
                          staff.status === 'active' ? 'text-green-600' :
                          staff.status === 'inactive' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {staff.status}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{staff.shift}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Inventory Tab */}
          {selectedTab === 'inventory' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Inventory</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Stock
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory Summary */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Inventory Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Items</span>
                        <span className="text-sm font-bold text-gray-900">{analytics.inventory.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Value</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(analytics.inventory.totalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Low Stock</span>
                        <span className="text-sm font-bold text-orange-600">{analytics.inventory.lowStockItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expiring Soon</span>
                        <span className="text-sm font-bold text-red-600">{analytics.inventory.expiringItems.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Items by Status</h4>
                    <div className="space-y-2">
                      {Object.entries(analytics.inventory.itemsByStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">{status}</span>
                          <span className="text-sm font-bold text-gray-900">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Low Stock Items */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Low Stock Items</h4>
                  </div>
                  <div className="space-y-3">
                    {analytics.inventory.lowStockItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                            <p className="text-xs text-gray-500">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">{item.quantity}</p>
                            <p className="text-xs text-gray-500">Reserved: {item.reservedQuantity}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Available:</span> {item.availableQuantity}
                          </div>
                          <div>
                            <span className="font-medium">Value:</span> {formatCurrency(item.totalValue)}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {item.binLocationId}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Movements Tab */}
          {selectedTab === 'movements' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Movement Orders</h3>
                <div className="flex items-center gap-3">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" title="Filter by type">
                    <option value="">All Types</option>
                    <option value="receiving">Receiving</option>
                    <option value="putaway">Putaway</option>
                    <option value="picking">Picking</option>
                    <option value="shipping">Shipping</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    New Movement
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Movement Statistics */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Movement Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Movements</span>
                        <span className="text-sm font-bold text-gray-900">{analytics.movements.totalMovements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pending Orders</span>
                        <span className="text-sm font-bold text-orange-600">{analytics.movements.pendingOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Processing</span>
                        <span className="text-sm font-bold text-gray-900">{analytics.movements.averageProcessingTime.toFixed(1)} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Movements by Type</h4>
                    <div className="space-y-2">
                      {Object.entries(analytics.movements.movementsByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                          <span className="text-sm font-bold text-gray-900">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Movements */}
                <div className="lg:col-span-2">
                  <div className="space-y-3">
                    {analytics.movements.pendingOrders > 0 ? (
                      <div className="border border-orange-200 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-orange-900 mb-2">Pending Movements</h4>
                        <p className="text-sm text-orange-700">{analytics.movements.pendingOrders} orders require attention</p>
                      </div>
                    ) : null}
                    
                    {/* Movement orders would be displayed here */}
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No movement orders available</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cycle Count Tab */}
          {selectedTab === 'cyclecount' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Cycle Count</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  New Cycle Count
                </button>
              </div>
              
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No cycle counts available</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Warehouse Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          Analytics Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>
    </div>
  );
}
