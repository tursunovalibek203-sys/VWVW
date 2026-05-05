import { useState } from 'react';
import { 
  Cloud, Download, Upload, RefreshCw, Clock, Shield, 
  HardDrive, Database, Calendar, CheckCircle, XCircle,
  AlertTriangle, MoreHorizontal, Settings, Trash2, Eye,
  FileText, Folder, Search, Filter, ChevronDown
} from 'lucide-react';

interface BackupRecord {
  id: string;
  name: string;
  date: string;
  size: string;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed' | 'in_progress';
  location: string;
}

const mockBackups: BackupRecord[] = [
  { id: '1', name: 'Auto Backup #245', date: '2024-01-15 12:00:00', size: '15.2 MB', type: 'auto', status: 'completed', location: 'Google Drive' },
  { id: '2', name: 'Auto Backup #244', date: '2024-01-14 12:00:00', size: '15.1 MB', type: 'auto', status: 'completed', location: 'Google Drive' },
  { id: '3', name: 'Manual Backup - Monthly', date: '2024-01-10 15:30:00', size: '15.3 MB', type: 'manual', status: 'completed', location: 'Local' },
  { id: '4', name: 'Auto Backup #243', date: '2024-01-13 12:00:00', size: '15.0 MB', type: 'auto', status: 'failed', location: 'Google Drive' },
  { id: '5', name: 'Auto Backup #242', date: '2024-01-12 12:00:00', size: '14.9 MB', type: 'auto', status: 'completed', location: 'Google Drive' },
];

export default function CloudBackup() {
  const [backups, setBackups] = useState<BackupRecord[]>(mockBackups);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        name: `Manual Backup #${backups.length + 1}`,
        date: new Date().toLocaleString('uz-UZ'),
        size: '15.2 MB',
        type: 'manual',
        status: 'completed',
        location: 'Local',
      };
      setBackups([newBackup, ...backups]);
      setIsBackingUp(false);
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'failed': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Muvaffaqiyatli';
      case 'failed': return 'Xatolik';
      case 'in_progress': return 'Jarayonda';
      default: return status;
    }
  };

  const totalSize = backups.reduce((sum, backup) => {
    const sizeMB = parseFloat(backup.size);
    return sum + sizeMB;
  }, 0);

  const completedBackups = backups.filter(b => b.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulut zaxiralash</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ma'lumotlarni avto zaxiralash va restore</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackup}
                disabled={isBackingUp}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Zaxiralanmoqda...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Zaxiralash
                  </>
                )}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Settings className="w-4 h-4" />
                Sozlamalar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                <Database className="w-5 h-5 text-sky-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{backups.length}</p>
            <p className="text-sm text-sky-600 mt-1">Jami zaxiralashlar</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{completedBackups}</p>
            <p className="text-sm text-emerald-600 mt-1">Muvaffaqiyatli</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalSize.toFixed(1)} MB</p>
            <p className="text-sm text-purple-600 mt-1">Jami hajm</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">Kuniga 2 marta</p>
            <p className="text-sm text-amber-600 mt-1">Avto zaxiralash</p>
          </div>
        </div>

        {/* Storage Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Saqlash joyi</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">Google Drive</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Ishlatilgan</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">75.6 MB / 15 GB</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" style={{ width: '0.5%' }} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Oxirgi zaxiralash: 2 soat oldin</p>
          </div>
        </div>

        {/* Backups Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zaxiralash tarixi</h3>
              <div className="flex items-center gap-2">
                <button title="Filter" aria-label="Filter" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
                <button title="Search" aria-label="Search" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nomi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hajm</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Turi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joylashuv</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                          <Database className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{backup.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{backup.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{backup.size}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                        backup.type === 'auto' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {backup.type === 'auto' ? 'Avtomatik' : 'Qo\'lda'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{backup.location}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(backup.status)}`}>
                        {getStatusText(backup.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedBackup(backup)}
                          title="Ko'rish"
                          aria-label="Ko'rish"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          title="Yuklab olish"
                          aria-label="Yuklab olish"
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          title="O'chirish"
                          aria-label="O'chirish"
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Zaxiralash tafsilotlari</h2>
              <button 
                onClick={() => setSelectedBackup(null)}
                title="Yopish"
                aria-label="Yopish"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedBackup.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBackup.location}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sana</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedBackup.date}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hajm</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedBackup.size}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status</p>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedBackup.status)}`}>
                  {getStatusText(selectedBackup.status)}
                </span>
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Restore
                </button>
                <button 
                  onClick={() => setSelectedBackup(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
