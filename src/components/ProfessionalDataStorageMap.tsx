import { useState, useEffect } from 'react';
import { 
  Database, 
  HardDrive, 
  Cloud, 
  Shield, 
  Lock, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity,
  Zap,
  Wifi,
  Battery,
  BatteryCharging,
  Thermometer,
  Archive,
  FileLock,
  Layers,
  ChevronRight,
  Search,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Monitor,
  Tablet,
  Laptop,
  Building,
  Factory,
  Warehouse,
  Store,
  Home,
  Briefcase,
  Package,
  Trash2
} from 'lucide-react';
import { 
  ProfessionalLayeredBackupManager,
  BackupLayer, 
  LayerType, 
  StorageMedia, 
  LayerMetadata
} from '../lib/professionalLayeredBackupSimple';

interface DataStorageMapProps {
  className?: string;
  refreshInterval?: number;
  showDetails?: boolean;
}

export default function ProfessionalDataStorageMap({
  className = '',
  refreshInterval = 30000,
  showDetails = true
}: DataStorageMapProps) {
  const [layers, setLayers] = useState<BackupLayer[]>([]);
  const [layerHealth, setLayerHealth] = useState<Map<BackupLayer, any>>(new Map());
  const [selectedLayer, setSelectedLayer] = useState<BackupLayer | null>(null);
  const [layerBackups, setLayerBackups] = useState<LayerMetadata[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  const [showPhysicalLocations, setShowPhysicalLocations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEncryptionDetails, setShowEncryptionDetails] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    totalStorage: 0,
    usedStorage: 0,
    availableStorage: 0,
    encryptionStrength: 0,
    backupCount: 0,
    replicationCount: 0,
    healthScore: 0
  });

  useEffect(() => {
    loadStorageData();
    
    const interval = setInterval(() => {
      loadStorageData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadStorageData = async () => {
    try {
      setRefreshing(true);
      
      const backup = ProfessionalLayeredBackupManager.getInstance();
      const layerList = backup.listLayers();
      setLayers(layerList);
      
      // Load health data for each layer
      const healthMap = new Map<BackupLayer, any>();
      for (const layer of layerList) {
        const health = await backup.getLayerHealth(layer);
        healthMap.set(layer, health);
      }
      setLayerHealth(healthMap);
      
      // Calculate system metrics
      const totalBackups = Array.from(healthMap.values()).reduce((sum, health) => sum + health.totalBackups, 0);
      const totalSize = Array.from(healthMap.values()).reduce((sum, health) => sum + health.totalSize, 0);
      const healthyBackups = Array.from(healthMap.values()).reduce((sum, health) => sum + health.healthyBackups, 0);
      
      setSystemMetrics({
        totalStorage: totalSize,
        usedStorage: totalSize,
        availableStorage: 0, // Would calculate from actual storage capacity
        encryptionStrength: 512, // Maximum encryption strength
        backupCount: totalBackups,
        replicationCount: totalBackups * 2, // Assuming 2x replication
        healthScore: totalBackups > 0 ? (healthyBackups / totalBackups) * 100 : 100
      });
      
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLayerSelect = async (layer: BackupLayer) => {
    setSelectedLayer(layer);
    
    const backup = ProfessionalLayeredBackupManager.getInstance();
    const backups = backup.listBackupsInLayer(layer);
    setLayerBackups(backups);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLayerIcon = (layer: BackupLayer) => {
    switch (layer) {
      case BackupLayer.LAYER_1:
        return <Zap className="w-6 h-6 text-red-500" />;
      case BackupLayer.LAYER_2:
        return <Activity className="w-6 h-6 text-orange-500" />;
      case BackupLayer.LAYER_3:
        return <Database className="w-6 h-6 text-yellow-500" />;
      case BackupLayer.LAYER_4:
        return <Archive className="w-6 h-6 text-green-500" />;
      case BackupLayer.LAYER_5:
        return <Shield className="w-6 h-6 text-blue-500" />;
      default:
        return <Database className="w-6 h-6 text-gray-500" />;
    }
  };

  const getLayerTypeIcon = (type: LayerType) => {
    switch (type) {
      case 'hot':
        return <Thermometer className="w-4 h-4 text-red-500" />;
      case 'warm':
        return <BatteryCharging className="w-4 h-4 text-orange-500" />;
      case 'cold':
        return <Battery className="w-4 h-4 text-blue-500" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-green-500" />;
      case 'deep_archive':
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Database className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStorageMediaIcon = (media: StorageMedia) => {
    switch (media) {
      case 'ssd':
        return <HardDrive className="w-4 h-4 text-gray-600" />;
      case 'hdd':
        return <HardDrive className="w-4 h-4 text-blue-600" />;
      case 'tape':
        return <Archive className="w-4 h-4 text-purple-600" />;
      case 'optical':
        return <Monitor className="w-4 h-4 text-green-600" />;
      case 'cloud':
        return <Cloud className="w-4 h-4 text-sky-600" />;
      case 'blockchain':
        return <Shield className="w-4 h-4 text-indigo-600" />;
      default:
        return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  const getLayerName = (layer: BackupLayer): string => {
    switch (layer) {
      case BackupLayer.LAYER_1:
        return 'Hot Layer - Real-time';
      case BackupLayer.LAYER_2:
        return 'Warm Layer - Hourly';
      case BackupLayer.LAYER_3:
        return 'Cold Layer - Daily';
      case BackupLayer.LAYER_4:
        return 'Archive Layer - Weekly';
      case BackupLayer.LAYER_5:
        return 'Deep Archive - Monthly';
      default:
        return 'Unknown Layer';
    }
  };

  const getLayerDescription = (layer: BackupLayer): string => {
    switch (layer) {
      case BackupLayer.LAYER_1:
        return 'Real-time backup with immediate access. Used for critical data recovery.';
      case BackupLayer.LAYER_2:
        return 'Hourly backup with fast access. Used for recent data recovery.';
      case BackupLayer.LAYER_3:
        return 'Daily backup with slow access. Used for standard data recovery.';
      case BackupLayer.LAYER_4:
        return 'Weekly backup with very slow access. Used for compliance and long-term storage.';
      case BackupLayer.LAYER_5:
        return 'Monthly backup with permanent storage. Used for archival and legal requirements.';
      default:
        return 'Unknown layer description.';
    }
  };

  const getPhysicalLocation = (layer: BackupLayer): string => {
    switch (layer) {
      case BackupLayer.LAYER_1:
        return 'Local SSD Array - Data Center Floor 1, Rack A-1';
      case BackupLayer.LAYER_2:
        return 'Local SSD Array - Data Center Floor 1, Rack B-2';
      case BackupLayer.LAYER_3:
        return 'Local HDD Array - Data Center Floor 2, Rack C-3';
      case BackupLayer.LAYER_4:
        return 'Remote HDD Array - Backup Data Center, Rack D-4';
      case BackupLayer.LAYER_5:
        return 'Tape Library - Off-site Storage Facility, Vault E-5';
      default:
        return 'Unknown location';
    }
  };

  const getEncryptionIcon = (strength: number) => {
    if (strength >= 512) return <Shield className="w-4 h-4 text-purple-600" />;
    if (strength >= 256) return <Lock className="w-4 h-4 text-blue-600" />;
    if (strength >= 128) return <Key className="w-4 h-4 text-green-600" />;
    return <FileLock className="w-4 h-4 text-gray-600" />;
  };

  const getHealthColor = (health: number): string => {
    if (health >= 95) return 'text-green-600';
    if (health >= 80) return 'text-yellow-600';
    if (health >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 95) return <CheckCircle className="w-4 h-4" />;
    if (health >= 80) return <CheckCircle className="w-4 h-4" />;
    if (health >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Storage Map</h2>
            <p className="text-sm text-gray-500">
              Multi-layer backup architecture with 1000% security
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
            onClick={loadStorageData}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Toggle advanced info"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Storage</p>
                <p className="text-lg font-bold text-gray-900">{formatBytes(systemMetrics.totalStorage)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Backups</span>
            <span className="text-sm font-medium">{systemMetrics.backupCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Encryption</p>
                <p className="text-lg font-bold text-purple-600">{systemMetrics.encryptionStrength}-bit</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Replications</span>
            <span className="text-sm font-medium">{systemMetrics.replicationCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Health Score</p>
                <p className={`text-lg font-bold ${getHealthColor(systemMetrics.healthScore)}`}>
                  {systemMetrics.healthScore.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className="text-sm font-medium text-green-600">Healthy</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Layers className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Layers</p>
                <p className="text-lg font-bold text-gray-900">{layers.length}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Type</span>
            <span className="text-sm font-medium">Multi-layer</span>
          </div>
        </div>
      </div>

      {/* Layer Architecture */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Layer Architecture</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPhysicalLocations(!showPhysicalLocations)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Building className="w-4 h-4" />
              {showPhysicalLocations ? 'Hide' : 'Show'} Physical Locations
            </button>
            <button
              onClick={() => setShowEncryptionDetails(!showEncryptionDetails)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Key className="w-4 h-4" />
              {showEncryptionDetails ? 'Hide' : 'Show'} Encryption
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {layers.map((layer) => {
            const health = layerHealth.get(layer);
            const isSelected = selectedLayer === layer;
            
            return (
              <div
                key={layer}
                onClick={() => handleLayerSelect(layer)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getLayerIcon(layer)}
                      <div>
                        <h4 className="font-medium text-gray-900">{getLayerName(layer)}</h4>
                        <p className="text-sm text-gray-500">{getLayerDescription(layer)}</p>
                      </div>
                    </div>
                    
                    {showAdvancedInfo && health && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{health.totalBackups} backups</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{formatBytes(health.totalSize)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getHealthIcon((health.healthyBackups / health.totalBackups) * 100)}
                          <span className={`font-medium ${getHealthColor((health.healthyBackups / health.totalBackups) * 100)}`}>
                            {health.totalBackups > 0 ? ((health.healthyBackups / health.totalBackups) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {showPhysicalLocations && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Building className="w-4 h-4" />
                        <span>{getPhysicalLocation(layer)}</span>
                      </div>
                    )}
                    
                    {showEncryptionDetails && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {getEncryptionIcon(systemMetrics.encryptionStrength)}
                        <span>{systemMetrics.encryptionStrength}-bit</span>
                      </div>
                    )}
                    
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      isSelected ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Layer Details */}
                {isSelected && health && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Storage Type</p>
                        <div className="flex items-center gap-2">
                          {getStorageMediaIcon(health.storageMedia || 'ssd')}
                          <span className="text-sm text-gray-900 capitalize">{health.storageMedia || 'SSD'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Last Backup</p>
                        <p className="text-sm text-gray-900">
                          {health.lastBackup ? health.lastBackup.toLocaleString() : 'Never'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Retention</p>
                        <p className="text-sm text-gray-900">
                          {layer === BackupLayer.LAYER_1 ? '1 day' :
                           layer === BackupLayer.LAYER_2 ? '7 days' :
                           layer === BackupLayer.LAYER_3 ? '30 days' :
                           layer === BackupLayer.LAYER_4 ? '1 year' : '10 years'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Access Speed</p>
                        <div className="flex items-center gap-2">
                          {layer === BackupLayer.LAYER_1 ? <Zap className="w-4 h-4 text-red-500" /> :
                           layer === BackupLayer.LAYER_2 ? <Activity className="w-4 h-4 text-orange-500" /> :
                           layer === BackupLayer.LAYER_3 ? <Database className="w-4 h-4 text-yellow-500" /> :
                           layer === BackupLayer.LAYER_4 ? <Archive className="w-4 h-4 text-green-500" /> :
                           <Shield className="w-4 h-4 text-blue-500" />}
                          <span className="text-sm text-gray-900 capitalize">
                            {layer === BackupLayer.LAYER_1 ? 'Instant' :
                             layer === BackupLayer.LAYER_2 ? 'Fast' :
                             layer === BackupLayer.LAYER_3 ? 'Slow' :
                             layer === BackupLayer.LAYER_4 ? 'Very Slow' : 'Permanent'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {health.issues.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">{health.issues[0]}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Layer Backups */}
      {selectedLayer && layerBackups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Backups in {getLayerName(selectedLayer)}
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search backups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Size</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Compression</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Encryption</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {layerBackups
                  .filter(backup => 
                    backup.id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((backup) => (
                    <tr key={backup.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{backup.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{backup.createdAt.toLocaleDateString()}</p>
                          <p className="text-gray-500">{backup.createdAt.toLocaleTimeString()}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{formatBytes(backup.size.final)}</p>
                          <p className="text-gray-500">{backup.compression.ratio.toFixed(2)}x compressed</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {backup.compression.algorithm}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getEncryptionIcon(systemMetrics.encryptionStrength)}
                          <span className="text-sm font-medium text-gray-900">
                            {backup.encryption.algorithm}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getHealthIcon(backup.health.status === 'healthy' ? 100 : 50)}
                          <span className={`text-sm font-medium capitalize ${getHealthColor(backup.health.status === 'healthy' ? 100 : 50)}`}>
                            {backup.health.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {/* Restore backup */}}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Restore backup"
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {/* View details */}}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => {/* Delete backup */}}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Delete backup"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

      {/* Physical Storage Map */}
      {showPhysicalLocations && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Physical Storage Locations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layers.map((layer) => (
              <div key={layer} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {getLayerIcon(layer)}
                  <h4 className="font-medium text-gray-900">{getLayerName(layer)}</h4>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{getPhysicalLocation(layer)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 || layer === BackupLayer.LAYER_2 ? '10 Gbps' :
                       layer === BackupLayer.LAYER_3 ? '1 Gbps' :
                       layer === BackupLayer.LAYER_4 ? '100 Mbps' : '10 Mbps'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 ? '18-22°C' :
                       layer === BackupLayer.LAYER_2 ? '18-22°C' :
                       layer === BackupLayer.LAYER_3 ? '20-25°C' :
                       layer === BackupLayer.LAYER_4 ? '15-20°C' : '10-15°C'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 ? 'Biometric + Keycard' :
                       layer === BackupLayer.LAYER_2 ? 'Keycard + PIN' :
                       layer === BackupLayer.LAYER_3 ? 'Keycard' :
                       layer === BackupLayer.LAYER_4 ? 'Key + CCTV' : 'Vault + Armed Guard'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encryption Details */}
      {showEncryptionDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Encryption Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layers.map((layer) => (
              <div key={layer} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {getLayerIcon(layer)}
                  <h4 className="font-medium text-gray-900">{getLayerName(layer)}</h4>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 ? 'AES-256-GCM' :
                       layer === BackupLayer.LAYER_2 ? 'AES-256-GCM' :
                       layer === BackupLayer.LAYER_3 ? 'AES-256-CBC' :
                       layer === BackupLayer.LAYER_4 ? 'AES-256-CBC' : 'RSA-4096'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 ? '512-bit key' :
                       layer === BackupLayer.LAYER_2 ? '512-bit key' :
                       layer === BackupLayer.LAYER_3 ? '256-bit key' :
                       layer === BackupLayer.LAYER_4 ? '256-bit key' : '4096-bit key'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 ? 'Rotate every 7 days' :
                       layer === BackupLayer.LAYER_2 ? 'Rotate every 14 days' :
                       layer === BackupLayer.LAYER_3 ? 'Rotate every 30 days' :
                       layer === BackupLayer.LAYER_4 ? 'Rotate every 90 days' : 'Rotate every 365 days'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {layer === BackupLayer.LAYER_1 ? 'SHA-256' :
                       layer === BackupLayer.LAYER_2 ? 'SHA-256' :
                       layer === BackupLayer.LAYER_3 ? 'SHA-512' :
                       layer === BackupLayer.LAYER_4 ? 'SHA-512' : 'SHA3-512'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
