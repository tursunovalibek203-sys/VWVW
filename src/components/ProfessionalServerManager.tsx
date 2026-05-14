import React, { useState, useEffect } from 'react';
import { 
  Server, 
  RefreshCw, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Database,
  HardDrive,
  Cloud,
  Lock,
  Key,
  Activity,
  Zap,
  Settings,
  Download,
  Upload,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  Terminal,
  Monitor,
  Wifi,
  WifiOff,
  Power,
  PowerOff,
  Save,
  Trash2,
  Copy,
  Archive,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Filter,
  Search,
  Calendar,
  Users,
  Cpu,
  MemoryStick,
  HardDrive as HardDriveIcon,
  Globe,
  ShieldCheck,
  KeyRound,
  FileLock,
  FileCheck,
  FolderLock,
  FolderOpen,
  FolderTree,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryFull,
  Thermometer,
  ThermometerSnow,
  ThermometerSun,
  Gauge,
  Timer,
  Stopwatch,
  Hourglass,
  TimerOff,
  TimerReset
} from 'lucide-react';
import { 
  enhancedBackup, 
  ServerRestartConfig,
  EnhancedBackupConfig,
  BackupType,
  StorageType,
  EncryptionType,
  CompressionType,
  BackupPriority,
  IntegrityCheck,
  BackupStatus,
  EnhancedBackupMetadata,
  createSecureBackup,
  restartServerSafely
} from '../lib/professionalDataBackupEnhanced';

interface ServerManagerProps {
  className?: string;
  refreshInterval?: number;
}

export default function ProfessionalServerManager({
  className = '',
  refreshInterval = 30000
}: ServerManagerProps) {
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'restarting' | 'maintenance'>('online');
  const [backups, setBackups] = useState<EnhancedBackupMetadata[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<EnhancedBackupMetadata | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showBackupDetails, setShowBackupDetails] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showEncryptionKeys, setShowEncryptionKeys] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    uptime: 0,
    temperature: 0
  });

  // Default backup configuration
  const [backupConfig, setBackupConfig] = useState<EnhancedBackupConfig>({
    type: BackupType.FULL,
    storageType: StorageType.HYBRID,
    encryptionType: EncryptionType.AES256,
    compressionType: CompressionType.ZSTD,
    integrityCheck: IntegrityCheck.SHA256,
    priority: BackupPriority.HIGH,
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12,
      yearly: 5
    },
    schedule: {
      enabled: true,
      interval: '0 2 * * *', // Daily at 2 AM
      timezone: 'Asia/Tashkent'
    },
    locations: {
      primary: './backups/primary',
      secondary: ['./backups/secondary', './backups/cloud'],
      tertiary: ['./backups/offsite']
    },
    compression: {
      enabled: true,
      level: 6
    },
    encryption: {
      enabled: true,
      keyRotation: true,
      keyLength: 256,
      algorithm: 'aes-256-cbc'
    },
    verification: {
      enabled: true,
      postBackup: true,
      postRestore: true,
      checksumVerification: true
    },
    notifications: {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      channels: ['email', 'slack', 'telegram']
    },
    performance: {
      maxConcurrentJobs: 3,
      bandwidthLimit: 100,
      cpuLimit: 80
    }
  });

  // Default restart configuration
  const [restartConfig, setRestartConfig] = useState<ServerRestartConfig>({
    backupBeforeRestart: true,
    verifyBackup: true,
    gracefulShutdown: true,
    maxWaitTime: 30000,
    restartTimeout: 60000,
    healthCheckUrl: 'http://localhost:3000/health',
    healthCheckTimeout: 10000,
    rollbackEnabled: true,
    notifications: {
      enabled: true,
      channels: ['email', 'slack']
    }
  });

  useEffect(() => {
    loadServerData();
    
    const interval = setInterval(() => {
      loadServerData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadServerData = async () => {
    try {
      setRefreshing(true);
      
      // Load system metrics
      const metrics = await getSystemMetrics();
      setSystemMetrics(metrics);
      
      // Load backups
      const backupManager = enhancedBackup.getInstance();
      const backupList = backupManager.listBackups();
      setBackups(backupList);
      
      // Check server status
      const status = await checkServerStatus();
      setServerStatus(status);
      
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load server data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getSystemMetrics = async () => {
    // Simulate system metrics
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
      uptime: Math.random() * 86400,
      temperature: 20 + Math.random() * 60
    };
  };

  const checkServerStatus = async (): Promise<'online' | 'offline' | 'restarting' | 'maintenance'> => {
    // Simulate server status check
    return 'online';
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    setServerStatus('restarting');
    
    try {
      const result = await restartServerSafely(restartConfig);
      
      if (result.success) {
        setServerStatus('online');
        // Show success notification
        console.log('Server restarted successfully');
      } else {
        setServerStatus('offline');
        // Show error notification
        console.error('Server restart failed:', result.errors);
      }
      
      setShowRestartModal(false);
      
    } catch (error) {
      console.error('Restart failed:', error);
      setServerStatus('offline');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    
    try {
      const result = await createSecureBackup('Manual Backup');
      
      if (result.success) {
        // Show success notification
        console.log('Backup created successfully');
        loadServerData();
      } else {
        // Show error notification
        console.error('Backup creation failed:', result.errors);
      }
      
      setShowBackupModal(false);
      
    } catch (error) {
      console.error('Backup creation failed:', error);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'completed':
      case 'verified':
        return 'text-green-600';
      case 'offline':
      case 'failed':
      case 'corrupted':
        return 'text-red-600';
      case 'restarting':
      case 'in_progress':
      case 'pending':
        return 'text-yellow-600';
      case 'maintenance':
      case 'encrypted':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'completed':
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'offline':
      case 'failed':
      case 'corrupted':
        return <XCircle className="w-4 h-4" />;
      case 'restarting':
      case 'in_progress':
      case 'pending':
        return <RefreshCw className="w-4 h-4 animate-pulse" />;
      case 'maintenance':
      case 'encrypted':
        return <Shield className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getEncryptionIcon = (type: EncryptionType) => {
    switch (type) {
      case 'aes256':
      case 'aes512':
        return <Lock className="w-4 h-4" />;
      case 'rsa4096':
        return <Key className="w-4 h-4" />;
      case 'chacha20poly1305':
        return <Shield className="w-4 h-4" />;
      default:
        return <FileLock className="w-4 h-4" />;
    }
  };

  const getStorageIcon = (type: StorageType) => {
    switch (type) {
      case 'local':
        return <HardDrive className="w-4 h-4" />;
      case 'cloud':
        return <Cloud className="w-4 h-4" />;
      case 'hybrid':
        return <Globe className="w-4 h-4" />;
      case 'distributed':
        return <Network className="w-4 h-4" />;
      case 'blockchain':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <FolderOpen className="w-4 h-4" />;
    }
  };

  const filteredBackups = backups.filter(backup => 
    backup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    backup.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSystemHealthScore = () => {
    const cpuScore = 100 - systemMetrics.cpu;
    const memoryScore = 100 - systemMetrics.memory;
    const diskScore = 100 - systemMetrics.disk;
    const tempScore = systemMetrics.temperature < 70 ? 100 : Math.max(0, 100 - (systemMetrics.temperature - 70) * 2);
    
    return Math.round((cpuScore + memoryScore + diskScore + tempScore) / 4);
  };

  const healthScore = getSystemHealthScore();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Server Manager</h2>
            <p className="text-sm text-gray-500">
              100% Data Protection & System Management
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
            onClick={loadServerData}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Server Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Server Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                serverStatus === 'online' ? 'bg-green-100' :
                serverStatus === 'offline' ? 'bg-red-100' :
                serverStatus === 'restarting' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {serverStatus === 'online' ? <Wifi className="w-5 h-5 text-green-600" /> :
                 serverStatus === 'offline' ? <WifiOff className="w-5 h-5 text-red-600" /> :
                 serverStatus === 'restarting' ? <RefreshCw className="w-5 h-5 text-yellow-600 animate-pulse" /> :
                 <Settings className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Server Status</p>
                <p className={`text-lg font-bold capitalize ${getStatusColor(serverStatus)}`}>
                  {serverStatus}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Uptime</span>
            <span className="text-sm font-medium">{formatDuration(systemMetrics.uptime * 1000)}</span>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                healthScore >= 90 ? 'bg-green-100' :
                healthScore >= 70 ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                <Activity className={`w-5 h-5 ${
                  healthScore >= 90 ? 'text-green-600' :
                  healthScore >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className={`text-lg font-bold ${
                  healthScore >= 90 ? 'text-green-600' :
                  healthScore >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {healthScore}%
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Temperature</span>
            <span className="text-sm font-medium">{systemMetrics.temperature.toFixed(1)}Â°C</span>
          </div>
        </div>

        {/* Backup Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Backups</p>
                <p className="text-lg font-bold text-gray-900">{backups.length}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Last Backup</span>
            <span className="text-sm font-medium">
              {backups.length > 0 ? formatDuration(Date.now() - backups[0].createdAt.getTime()) : 'Never'}
            </span>
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Security</p>
                <p className="text-lg font-bold text-purple-600">100%</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Encryption</span>
            <span className="text-sm font-medium">{backupConfig.encryptionType}</span>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">CPU Usage</span>
              <span className="text-sm font-bold text-gray-900">{systemMetrics.cpu.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  systemMetrics.cpu < 70 ? 'bg-green-500' :
                  systemMetrics.cpu < 90 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${systemMetrics.cpu}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Memory Usage</span>
              <span className="text-sm font-bold text-gray-900">{systemMetrics.memory.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  systemMetrics.memory < 70 ? 'bg-green-500' :
                  systemMetrics.memory < 90 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${systemMetrics.memory}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Disk Usage</span>
              <span className="text-sm font-bold text-gray-900">{systemMetrics.disk.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  systemMetrics.disk < 70 ? 'bg-green-500' :
                  systemMetrics.disk < 90 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${systemMetrics.disk}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Network</span>
              <span className="text-sm font-bold text-gray-900">{systemMetrics.network.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  systemMetrics.network < 70 ? 'bg-green-500' :
                  systemMetrics.network < 90 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${systemMetrics.network}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setShowRestartModal(true)}
          disabled={isRestarting || serverStatus === 'restarting'}
          className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PowerOff className="w-5 h-5 text-red-600" />
          <div className="text-left">
            <p className="font-medium text-red-900">Restart Server</p>
            <p className="text-sm text-red-600">Safe restart with backup</p>
          </div>
        </button>

        <button
          onClick={() => setShowBackupModal(true)}
          disabled={isCreatingBackup}
          className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <p className="font-medium text-blue-900">Create Backup</p>
            <p className="text-sm text-blue-600">Full system backup</p>
          </div>
        </button>

        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-purple-600" />
          <div className="text-left">
            <p className="font-medium text-purple-900">Advanced Options</p>
            <p className="text-sm text-purple-600">System configuration</p>
          </div>
        </button>

        <button
          onClick={() => setShowEncryptionKeys(!showEncryptionKeys)}
          className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
        >
          <Key className="w-5 h-5 text-green-600" />
          <div className="text-left">
            <p className="font-medium text-green-900">Encryption Keys</p>
            <p className="text-sm text-green-600">Manage security keys</p>
          </div>
        </button>
      </div>

      {/* Backups Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Backup History</h3>
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => setShowBackupDetails(!showBackupDetails)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Size</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Encryption</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBackups.map((backup) => (
                <tr key={backup.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{backup.name}</p>
                      <p className="text-sm text-gray-500">{backup.id}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {backup.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(backup.status)}
                      <span className={`text-sm font-medium ${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{formatBytes(backup.size.final)}</p>
                      <p className="text-gray-500">{backup.compression.ratio.toFixed(2)}x compressed</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{backup.createdAt.toLocaleDateString()}</p>
                      <p className="text-gray-500">{backup.createdAt.toLocaleTimeString()}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getEncryptionIcon(backup.encryption.algorithm)}
                      <span className="text-sm font-medium text-gray-900">
                        {backup.encryption.algorithm}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedBackup(backup)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {/* Restore backup */}}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {/* Delete backup */}}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
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

      {/* Restart Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restart Server</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="backupBeforeRestart"
                  checked={restartConfig.backupBeforeRestart}
                  onChange={(e) => setRestartConfig(prev => ({ ...prev, backupBeforeRestart: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="backupBeforeRestart" className="text-sm text-gray-700">
                  Create backup before restart
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="verifyBackup"
                  checked={restartConfig.verifyBackup}
                  onChange={(e) => setRestartConfig(prev => ({ ...prev, verifyBackup: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="verifyBackup" className="text-sm text-gray-700">
                  Verify backup integrity
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="gracefulShutdown"
                  checked={restartConfig.gracefulShutdown}
                  onChange={(e) => setRestartConfig(prev => ({ ...prev, gracefulShutdown: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="gracefulShutdown" className="text-sm text-gray-700">
                  Graceful shutdown
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="rollbackEnabled"
                  checked={restartConfig.rollbackEnabled}
                  onChange={(e) => setRestartConfig(prev => ({ ...prev, rollbackEnabled: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="rollbackEnabled" className="text-sm text-gray-700">
                  Enable rollback on failure
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRestartModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRestarting ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-pulse" />
                    Restarting...
                  </div>
                ) : (
                  'Restart Server'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Backup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Backup Type</label>
                <select
                  value={backupConfig.type}
                  onChange={(e) => setBackupConfig(prev => ({ ...prev, type: e.target.value as BackupType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">Full Backup</option>
                  <option value="incremental">Incremental</option>
                  <option value="differential">Differential</option>
                  <option value="real_time">Real-time</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Encryption</label>
                <select
                  value={backupConfig.encryptionType}
                  onChange={(e) => setBackupConfig(prev => ({ ...prev, encryptionType: e.target.value as EncryptionType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aes256">AES-256</option>
                  <option value="aes512">AES-512</option>
                  <option value="rsa4096">RSA-4096</option>
                  <option value="chacha20poly1305">ChaCha20-Poly1305</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                <select
                  value={backupConfig.compressionType}
                  onChange={(e) => setBackupConfig(prev => ({ ...prev, compressionType: e.target.value as CompressionType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gzip">Gzip</option>
                  <option value="zip">Zip</option>
                  <option value="lz4">LZ4</option>
                  <option value="zstd">Zstandard</option>
                  <option value="brotli">Brotli</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBackupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingBackup ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-pulse" />
                    Creating...
                  </div>
                ) : (
                  'Create Backup'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
