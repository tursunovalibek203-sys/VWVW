import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Upload, 
  Download, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Shield,
  Lock,
  Database,
  FolderOpen,
  FileText,
  Clock,
  HardDrive,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Share2,
  Link
} from 'lucide-react';
import { 
  CloudBackupService, 
  createCloudBackupService,
  BackupResult,
  CloudFileInfo
} from '../lib/cloudBackupService';

interface CloudBackupComponentProps {
  className?: string;
}

export default function CloudBackupComponent({ className = '' }: CloudBackupComponentProps) {
  const [selectedProvider, setSelectedProvider] = useState<'google-drive' | 'dropbox' | 'onedrive' | 'aws-s3'>('google-drive');
  const [backupService, setBackupService] = useState<CloudBackupService | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [backupHistory, setBackupHistory] = useState<BackupResult[]>([]);
  const [, setCloudFiles] = useState<CloudFileInfo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupInterval, setBackupInterval] = useState(60);
  const [accessToken, setAccessToken] = useState('');
  const [apiKey] = useState('');
  const [bucketName, setBucketName] = useState('luxpetplast-backup');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSelectedFiles] = useState<string[]>([]);
  const [systemStatus, setSystemStatus] = useState({
    lastBackup: null as Date | null,
    totalBackups: 0,
    totalSize: 0,
    successRate: 100,
    isOnline: true
  });

  useEffect(() => {
    const config = {
      provider: selectedProvider,
      accessToken,
      apiKey,
      bucketName,
      encryptionKey: encryptionEnabled ? encryptionKey : undefined,
      compressionEnabled,
      autoBackup,
      backupInterval
    };

    const service = createCloudBackupService(config);
    setBackupService(service);

    // Load backup history
    loadBackupHistory();
  }, [selectedProvider, accessToken, apiKey, bucketName, encryptionKey, compressionEnabled, autoBackup, backupInterval]);

  const loadBackupHistory = () => {
    // Load from localStorage or API
    const history = localStorage.getItem('cloudBackupHistory');
    if (history) {
      setBackupHistory(JSON.parse(history));
    }
  };

  const saveBackupHistory = (result: BackupResult) => {
    const newHistory = [result, ...backupHistory];
    setBackupHistory(newHistory);
    localStorage.setItem('cloudBackupHistory', JSON.stringify(newHistory));
  };

  const handleBackup = async () => {
    if (!backupService) {
      console.log('Backup service not configured');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate file selection and backup
      const files = await getFilesToBackup();
      
      // Update progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);

      const result = await backupService.backup(files);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        saveBackupHistory(result);
        updateSystemStatus(result);
        console.log('Backup completed successfully!');
      } else {
        console.log(`Backup failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`Backup error: ${error}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const getFilesToBackup = async (): Promise<File[]> => {
    const files: File[] = [];
    
    // Simulate getting files from local system
    const fileTypes = [
      { name: 'customers.json', size: 1024, type: 'application/json' },
      { name: 'sales.json', size: 2048, type: 'application/json' },
      { name: 'products.json', size: 1536, type: 'application/json' },
      { name: 'inventory.json', size: 512, type: 'application/json' },
      { name: 'financial.json', size: 1024, type: 'application/json' },
      { name: 'settings.json', size: 256, type: 'application/json' },
      { name: 'backup_layer1.json', size: 5120, type: 'application/json' },
      { name: 'backup_layer2.json', size: 10240, type: 'application/json' },
      { name: 'backup_layer3.json', size: 20480, type: 'application/json' },
      { name: 'logs.json', size: 4096, type: 'application/json' }
    ];

    for (const fileType of fileTypes) {
      const content = JSON.stringify({
        data: `Sample data for ${fileType.name}`,
        timestamp: new Date().toISOString(),
        size: fileType.size,
        backupId: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      const file = new File([content], fileType.name, { type: fileType.type });
      files.push(file);
    }

    return files;
  };

  const updateSystemStatus = (result: BackupResult) => {
    setSystemStatus(prev => ({
      ...prev,
      lastBackup: result.timestamp,
      totalBackups: prev.totalBackups + 1,
      totalSize: prev.totalSize + (result.size || 0),
      successRate: result.success ? prev.successRate : Math.max(0, prev.successRate - 5)
    }));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google-drive':
        return <Cloud className="w-5 h-5 text-blue-600" />;
      case 'dropbox':
        return <Cloud className="w-5 h-5 text-blue-500" />;
      case 'onedrive':
        return <Cloud className="w-5 h-5 text-blue-700" />;
      case 'aws-s3':
        return <Cloud className="w-5 h-5 text-orange-600" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-600" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google-drive':
        return 'Google Drive';
      case 'dropbox':
        return 'Dropbox';
      case 'onedrive':
        return 'OneDrive';
      case 'aws-s3':
        return 'AWS S3';
      default:
        return 'Unknown';
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
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  const filteredHistory = backupHistory.filter(backup => 
    backup.timestamp.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cloud Backup</h2>
            <p className="text-sm text-gray-500">Professional cloud storage and backup</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {systemStatus.isOnline ? (
              <><Wifi className="w-4 h-4 text-green-600" /><span className="text-sm text-green-600">Online</span></>
            ) : (
              <><WifiOff className="w-4 h-4 text-red-600" /><span className="text-sm text-red-600">Offline</span></>
            )}
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Toggle advanced settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Backups</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{systemStatus.totalBackups}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Total Size</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{formatBytes(systemStatus.totalSize)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Success Rate</span>
            </div>
            <span className="text-lg font-bold text-green-600">{systemStatus.successRate}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Last Backup</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {systemStatus.lastBackup ? systemStatus.lastBackup.toLocaleDateString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cloud Provider</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['google-drive', 'dropbox', 'onedrive', 'aws-s3'] as const).map((provider) => (
            <button
              key={provider}
              onClick={() => setSelectedProvider(provider)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedProvider === provider 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {getProviderIcon(provider)}
                <span className="text-sm font-medium text-gray-900">{getProviderName(provider)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      {showAdvanced && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter access token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedProvider === 'aws-s3' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bucket Name</label>
                <input
                  type="text"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="Enter bucket name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {encryptionEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Encryption Key</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    placeholder="Enter encryption key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={compressionEnabled}
                  onChange={(e) => setCompressionEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Compression</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={encryptionEnabled}
                  onChange={(e) => setEncryptionEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Encryption</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Auto Backup</span>
              </label>
            </div>

            {autoBackup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Backup Interval (minutes)</label>
                <input
                  type="number"
                  value={backupInterval}
                  onChange={(e) => setBackupInterval(parseInt(e.target.value) || 60)}
                  min="1"
                  max="1440"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Backup interval in minutes"
                  placeholder="60"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backup Action */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Backup Action</h3>
            <p className="text-sm text-gray-500">Start backup to {getProviderName(selectedProvider)}</p>
          </div>
          
          <button
            onClick={handleBackup}
            disabled={isUploading || !accessToken}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-pulse" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Start Backup
              </>
            )}
          </button>
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Backup History</h3>
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
                <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Provider</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Size</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((backup, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{backup.timestamp.toLocaleDateString()}</p>
                        <p className="text-gray-500">{backup.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getProviderIcon(selectedProvider)}
                        <span className="text-sm font-medium text-gray-900">{getProviderName(selectedProvider)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {backup.size ? formatBytes(backup.size) : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">
                        {backup.duration ? formatDuration(backup.duration) : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-2 ${getStatusColor(backup.success)}`}>
                        {getStatusIcon(backup.success)}
                        <span className="text-sm font-medium capitalize">
                          {backup.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {backup.downloadUrl && (
                          <button
                            onClick={() => window.open(backup.downloadUrl, '_blank')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="View backup"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(backup.downloadUrl || '')}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No backup history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
