import { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Download,
  Search,
  BarChart3,
  Activity,
  Phone,
  Mail,
  Star,
  ShoppingCart,
  Warehouse,
  Shield,
  Timer,
  Minus,
  Settings
} from 'lucide-react';
import { 
  supplyChain, 
  Supplier, 
  PurchaseOrder, 
  InventoryMovement,
  Shipment,
  QualityInspection,
  SupplierStatus,
  OrderStatus
} from '../lib/professionalSupplyChain';
import { trData } from '../lib/transliterator';

interface SupplyChainDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalSupplyChainDashboard({
  refreshInterval = 15000,
  showCharts = true,
  showDetails = true,
  className = '',
}: SupplyChainDashboardProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>([]);
  const [supplierPerformance, setSupplierPerformance] = useState<any>(null);
  const [orderStatistics, setOrderStatistics] = useState<any>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'suppliers' | 'orders' | 'inventory' | 'shipments' | 'quality'>('overview');

  useEffect(() => {
    loadSupplyChainData();
    
    const interval = setInterval(() => {
      loadSupplyChainData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadSupplyChainData = () => {
    try {
      setRefreshing(true);
      
      const sc = supplyChain();
      const suppliersData = sc.getSuppliers();
      const ordersData = sc.getPurchaseOrders();
      const movementsData = sc.getInventoryMovements();
      const shipmentsData = sc.getShipments();
      const inspectionsData = sc.getQualityInspections();
      const performanceData = sc.getSupplierPerformance();
      const orderStats = sc.getOrderStatistics();
      const inventoryData = sc.getInventoryAnalytics();
      
      setSuppliers(suppliersData);
      setPurchaseOrders(ordersData);
      setInventoryMovements(movementsData);
      setShipments(shipmentsData);
      setQualityInspections(inspectionsData);
      setSupplierPerformance(performanceData);
      setOrderStatistics(orderStats);
      setInventoryAnalytics(inventoryData);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load Supply Chain data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadSupplyChainData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case SupplierStatus.ACTIVE:
      case OrderStatus.APPROVED:
      case OrderStatus.DELIVERED:
        return 'text-green-600';
      case SupplierStatus.PENDING:
      case OrderStatus.PENDING_APPROVAL:
        return 'text-yellow-600';
      case SupplierStatus.SUSPENDED:
      case OrderStatus.CANCELLED:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case SupplierStatus.ACTIVE:
      case OrderStatus.APPROVED:
      case OrderStatus.DELIVERED:
        return <CheckCircle className="w-4 h-4" />;
      case SupplierStatus.PENDING:
      case OrderStatus.PENDING_APPROVAL:
        return <Clock className="w-4 h-4" />;
      case SupplierStatus.SUSPENDED:
      case OrderStatus.CANCELLED:
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
          <RefreshCw className="w-8 h-8 text-blue-600 animate-pulse" />
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
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Supply Chain Dashboard</h2>
            <p className="text-sm text-gray-500">
              {suppliers.length} suppliers, {purchaseOrders.length} orders
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
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'suppliers', label: 'Suppliers', icon: Users },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
          { id: 'inventory', label: 'Inventory', icon: Warehouse },
          { id: 'shipments', label: 'Shipments', icon: Truck },
          { id: 'quality', label: 'Quality', icon: Shield },
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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Suppliers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {suppliers.filter(s => s.status === SupplierStatus.ACTIVE).length}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
              <p className="text-xs text-gray-500 mt-1">
                {suppliers.length} total
              </p>
            </div>

            {/* Pending Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {purchaseOrders.filter(o => o.status === OrderStatus.PENDING_APPROVAL).length}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(orderStatistics?.totalValue || 0)}
              </p>
            </div>

            {/* In Transit */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {shipments.filter(s => s.status === 'in_transit').length}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">In Transit</p>
              <p className="text-xs text-gray-500 mt-1">
                {shipments.length} total shipments
              </p>
            </div>

            {/* Quality Issues */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {qualityInspections.filter(q => q.status === 'failed').length}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Quality Issues</p>
              <p className="text-xs text-gray-500 mt-1">
                {qualityInspections.length} total inspections
              </p>
            </div>
          </div>

          {/* Top Suppliers */}
          {supplierPerformance && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Suppliers</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-3">
                {supplierPerformance.slice(0, 5).map((perf: any, index: number) => (
                  <div key={perf.supplier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{trData(perf.supplier.name)}</p>
                        <p className="text-xs text-gray-500">{perf.metrics.orderCount} orders</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(perf.metrics.totalValue)}
                      </p>
                      <div className="flex items-center gap-1 text-green-600">
                        <Star className="w-3 h-3" />
                        <span className="text-xs">{perf.metrics.qualityScore.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {purchaseOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{trData(order.supplierName)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(order.totals.total)}
                    </p>
                    <p className="text-xs text-gray-500">{order.items.length} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Suppliers Tab */}
      {selectedTab === 'suppliers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Suppliers</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {trData(supplier.name).charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trData(supplier.name)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {supplier.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(supplier.status)}
                        <span className={`text-sm font-medium ${getStatusColor(supplier.status)}`}>
                          {supplier.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.products.length} products
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-gray-600">
                            {supplier.performance.qualityScore}/10
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer className="w-3 h-3 text-blue-500" />
                          <span className="text-xs text-gray-600">
                            {supplier.performance.onTimeDelivery}% on-time
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{supplier.contact.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{supplier.contact.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-900" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {selectedTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
            <div className="flex items-center gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" title="Filter by status">
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="delivered">Delivered</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                New Order
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Statistics */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Order Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <span className="text-sm font-bold text-gray-900">{orderStatistics?.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(orderStatistics?.totalValue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Order</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(orderStatistics?.averageOrderValue || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Orders by Status</h4>
                <div className="space-y-2">
                  {Object.entries(orderStatistics?.ordersByStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                      <span className="text-sm font-bold text-gray-900">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="lg:col-span-2">
              <div className="space-y-3">
                {purchaseOrders.slice(0, 10).map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{trData(order.supplierName)}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(order.totals.total)}
                        </p>
                        <p className="text-xs text-gray-500">{order.items.length} items</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Created:</span> {order.createdAt.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Expected:</span> {order.delivery.expectedDate.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span> <span className="capitalize">{order.priority}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                      <button className="text-blue-600 hover:text-blue-900 text-sm">
                        View Details
                      </button>
                      {order.status === OrderStatus.PENDING_APPROVAL && (
                        <button className="text-green-600 hover:text-green-900 text-sm">
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {selectedTab === 'inventory' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Movements</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Movements
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Movement Statistics */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Movement Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Movements</span>
                    <span className="text-sm font-bold text-gray-900">{inventoryAnalytics?.totalMovements || 0}</span>
                  </div>
                  {Object.entries(inventoryAnalytics?.movementsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-sm font-bold text-gray-900">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Top Products</h4>
                <div className="space-y-2">
                  {inventoryAnalytics?.topProducts.slice(0, 5).map((product: any, index: number) => (
                    <div key={product.productId} className="flex justify-between">
                      <span className="text-sm text-gray-600">{trData(product.productName)}</span>
                      <span className="text-sm font-bold text-gray-900">{product.totalQuantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Movements */}
            <div className="lg:col-span-2">
              <div className="space-y-3">
                {inventoryMovements.slice(0, 10).map((movement) => (
                  <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          movement.type === 'purchase' ? 'bg-green-100' :
                          movement.type === 'sale' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          {movement.type === 'purchase' ? <Plus className="w-4 h-4 text-green-600" /> :
                           movement.type === 'sale' ? <Minus className="w-4 h-4 text-red-600" /> :
                           <Activity className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{trData(movement.productName)}</p>
                          <p className="text-xs text-gray-500">{movement.sku}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{movement.type}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Date:</span> {movement.performedAt.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">By:</span> {trData(movement.performedBy)}
                      </div>
                      <div>
                        <span className="font-medium">Reason:</span> {movement.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipments Tab */}
      {selectedTab === 'shipments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Shipments</h3>
            <div className="flex items-center gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" title="Filter by status">
                <option value="">All Status</option>
                <option value="preparing">Preparing</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Track Shipment
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {shipments.slice(0, 10).map((shipment) => (
              <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      shipment.status === 'delivered' ? 'bg-green-100' :
                      shipment.status === 'in_transit' ? 'bg-blue-100' :
                      'bg-gray-100'
                    }`}>
                      <Truck className={`w-4 h-4 ${
                        shipment.status === 'delivered' ? 'text-green-600' :
                        shipment.status === 'in_transit' ? 'text-blue-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{shipment.trackingNumber}</p>
                      <p className="text-xs text-gray-500">{trData(shipment.carrier)} - {shipment.orderNumber}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(shipment.cost)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{shipment.status.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">From:</span> {shipment.origin.city}
                  </div>
                  <div>
                    <span className="font-medium">To:</span> {shipment.destination.city}
                  </div>
                  <div>
                    <span className="font-medium">Est. Delivery:</span> {shipment.estimatedDelivery.toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span> {shipment.weight} kg
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t pt-3">
                  <div className="space-y-2">
                    {shipment.timeline.slice(-3).map((event, index) => (
                      <div key={index} className="flex items-center gap-3 text-xs">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-gray-600">{trData(event.description)}</span>
                        <span className="text-gray-500">{event.timestamp.toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Tab */}
      {selectedTab === 'quality' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Quality Inspections</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Schedule Inspection
            </button>
          </div>
          
          <div className="space-y-3">
            {qualityInspections.slice(0, 10).map((inspection) => (
              <div key={inspection.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      inspection.status === 'passed' ? 'bg-green-100' :
                      inspection.status === 'failed' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      <Shield className={`w-4 h-4 ${
                        inspection.status === 'passed' ? 'text-green-600' :
                        inspection.status === 'failed' ? 'text-red-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{trData(inspection.productName)}</p>
                      <p className="text-xs text-gray-500">Batch: {inspection.batchNumber}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      inspection.status === 'passed' ? 'text-green-600' :
                      inspection.status === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {inspection.overallResult.percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{inspection.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Quantity:</span> {inspection.inspectedQuantity}/{inspection.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Inspector:</span> {trData(inspection.inspector)}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {inspection.inspectedAt.toLocaleDateString()}
                  </div>
                </div>

                {/* Criteria Results */}
                <div className="border-t pt-3">
                  <div className="space-y-2">
                    {inspection.criteria.slice(0, 3).map((criterion, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{trData(criterion.name)}</span>
                        <span className={`font-medium ${
                          criterion.result === 'pass' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {criterion.result.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Supply Chain Settings
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
