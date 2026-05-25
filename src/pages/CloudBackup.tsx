import { useEffect, useState } from 'react';
import {
  Cloud, Download, Upload, RefreshCw, Clock, HardDrive, Database,
  Calendar, CheckCircle, Trash2, Eye, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

const t = latinToCyrillic;

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

const statusVariant = (status: BackupRecord['status']): 'success' | 'error' | 'warning' | 'neutral' => {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'in_progress': return 'warning';
    default: return 'neutral';
  }
};

const statusText = (status: BackupRecord['status']) => {
  switch (status) {
    case 'completed': return t('Muvaffaqiyatli');
    case 'failed': return t('Xatolik');
    case 'in_progress': return t('Jarayonda');
    default: return status;
  }
};

// White rounded-2xl stat card with tinted icon
function StatCard({
  icon: Icon,
  iconTint,
  value,
  label,
}: {
  icon: typeof Database;
  iconTint: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconTint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}

export default function CloudBackup() {
  const { addToast } = useToast();
  const [backups, setBackups] = useState<BackupRecord[]>(mockBackups);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);

  // Brief initial skeleton so the page mounts with the house loading pattern
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
      addToast({ type: 'success', title: t('Zaxira yaratildi'), message: t('Yangi zaxira nusxasi tayyor') });
    }, 3000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      addToast({ type: 'info', title: t('Yangilandi'), message: t('Zaxiralar tarixi yangilandi') });
    }, 800);
  };

  const handleExport = () => {
    addToast({ type: 'info', title: t('Eksport'), message: t('Zaxira nusxasi eksport qilinmoqda') });
  };

  const handleDownload = (backup: BackupRecord) => {
    addToast({ type: 'success', title: t('Yuklab olindi'), message: backup.name });
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    const name = restoreTarget.name;
    setSelectedBackup(null);
    addToast({ type: 'success', title: t('Tiklandi'), message: `${t('Tanlangan zaxiradan tiklandi')}: ${name}` });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const name = deleteTarget.name;
    setBackups((prev) => prev.filter((b) => b.id !== id));
    addToast({ type: 'success', title: t('Ochirildi'), message: name });
  };

  const totalSize = backups.reduce((sum, backup) => sum + parseFloat(backup.size), 0);
  const completedBackups = backups.filter((b) => b.status === 'completed').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-white/5 rounded-full blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{t('Bulut zaxiralash')}</h1>
              <p className="text-sm text-blue-100 mt-1">{t('Malumotlarni avto zaxiralash va tiklash')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRefresh}
              isLoading={refreshing}
              loadingText={t('Yangilanmoqda')}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="!bg-white/15 hover:!bg-white/25 !text-white !shadow-none ring-1 ring-white/25 backdrop-blur-sm"
            >
              {t('Yangilash')}
            </Button>
            <Button
              onClick={handleBackup}
              isLoading={isBackingUp}
              loadingText={t('Zaxiralanmoqda')}
              leftIcon={<Upload className="w-4 h-4" />}
              className="!bg-white !text-blue-700 hover:!bg-blue-50 shadow-md"
            >
              {t('Yangi zaxira')}
            </Button>
          </div>
        </div>
      </div>

      {initialLoading ? (
        <CardSkeleton count={3} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard icon={Database} iconTint="bg-sky-50 text-sky-600" value={String(backups.length)} label={t('Jami zaxiralar')} />
            <StatCard icon={CheckCircle} iconTint="bg-emerald-50 text-emerald-600" value={String(completedBackups)} label={t('Muvaffaqiyatli')} />
            <StatCard icon={HardDrive} iconTint="bg-purple-50 text-purple-600" value={`${totalSize.toFixed(1)} MB`} label={t('Jami hajm')} />
            <StatCard icon={Clock} iconTint="bg-amber-50 text-amber-600" value={t('Kuniga 2 marta')} label={t('Avto zaxiralash')} />
          </div>

          {/* Backup actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{t('Zaxira yaratish')}</h3>
              <p className="text-sm text-gray-400 mt-1 mb-5 flex-1">{t('Joriy malumotlardan yangi zaxira nusxasini yarating')}</p>
              <Button
                fullWidth
                onClick={handleBackup}
                isLoading={isBackingUp}
                loadingText={t('Zaxiralanmoqda')}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                {t('Zaxiralash')}
              </Button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{t('Eksport qilish')}</h3>
              <p className="text-sm text-gray-400 mt-1 mb-5 flex-1">{t('Zaxira nusxasini fayl korinishida yuklab oling')}</p>
              <Button fullWidth variant="success" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
                {t('Eksport')}
              </Button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{t('Tiklash')}</h3>
              <p className="text-sm text-gray-400 mt-1 mb-5 flex-1">{t('Oldingi zaxiradan malumotlarni qayta tiklang')}</p>
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  const latest = backups.find((b) => b.status === 'completed') ?? null;
                  if (latest) setRestoreTarget(latest);
                  else addToast({ type: 'warning', title: t('Zaxira topilmadi'), message: t('Tiklash uchun zaxira mavjud emas') });
                }}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                {t('Tiklash')}
              </Button>
            </div>
          </div>

          {/* Storage info */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">{t('Saqlash joyi')}</h3>
              </div>
              <span className="text-sm font-medium text-gray-500">Google Drive</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t('Band qilingan')}</span>
              <span className="text-sm font-semibold text-gray-900">75.6 MB / 15 GB</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-full" style={{ width: '0.5%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-3">{t('Oxirgi zaxira')}: 2 {t('soat oldin')}</p>
          </div>

          {/* Backup history */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">{t('Zaxiralar tarixi')}</h3>
              <Badge variant="neutral">{backups.length}</Badge>
            </div>

            {backups.length === 0 ? (
              <EmptyState
                icon={Cloud}
                title={t('Hali zaxira yoq')}
                description={t('Birinchi zaxira nusxasini yaratib boshlang')}
                action={
                  <Button onClick={handleBackup} isLoading={isBackingUp} loadingText={t('Zaxiralanmoqda')} leftIcon={<Upload className="w-4 h-4" />}>
                    {t('Zaxiralash')}
                  </Button>
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/70">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Nomi')}</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Sana')}</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Hajm')}</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Turi')}</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Holati')}</th>
                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Amallar')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {backups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Database className="w-4 h-4 text-sky-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{backup.name}</p>
                                <p className="text-xs text-gray-400">{backup.location}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4 text-gray-300" />
                              {backup.date}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{backup.size}</td>
                          <td className="px-6 py-4">
                            <Badge variant={backup.type === 'auto' ? 'info' : 'neutral'}>
                              {backup.type === 'auto' ? t('Avtomatik') : t('Qolda')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusVariant(backup.status)}>{statusText(backup.status)}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedBackup(backup)}
                                title={t('Korish')}
                                aria-label={t('Korish')}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(backup)}
                                title={t('Yuklab olish')}
                                aria-label={t('Yuklab olish')}
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(backup)}
                                title={t('Ochirish')}
                                aria-label={t('Ochirish')}
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

                {/* Mobile cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {backups.map((backup) => (
                    <div key={backup.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Database className="w-5 h-5 text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{backup.name}</p>
                            <p className="text-xs text-gray-400 truncate">{backup.location} · {backup.size}</p>
                          </div>
                        </div>
                        <Badge variant={statusVariant(backup.status)}>{statusText(backup.status)}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {backup.date}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedBackup(backup)}
                            title={t('Korish')}
                            aria-label={t('Korish')}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(backup)}
                            title={t('Yuklab olish')}
                            aria-label={t('Yuklab olish')}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(backup)}
                            title={t('Ochirish')}
                            aria-label={t('Ochirish')}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={!!selectedBackup}
        onClose={() => setSelectedBackup(null)}
        title={t('Zaxira tafsilotlari')}
        footer={
          selectedBackup ? (
            <>
              <Button variant="secondary" onClick={() => setSelectedBackup(null)}>
                {t('Yopish')}
              </Button>
              <Button
                variant="primary"
                onClick={() => setRestoreTarget(selectedBackup)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                {t('Tiklash')}
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedBackup && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selectedBackup.name}</p>
                <p className="text-sm text-gray-400">{selectedBackup.location}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">{t('Sana')}</p>
                <p className="font-medium text-gray-900 text-sm">{selectedBackup.date}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">{t('Hajm')}</p>
                <p className="font-medium text-gray-900 text-sm">{selectedBackup.size}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">{t('Turi')}</p>
                <p className="font-medium text-gray-900 text-sm">
                  {selectedBackup.type === 'auto' ? t('Avtomatik') : t('Qolda')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">{t('Holati')}</p>
                <Badge variant={statusVariant(selectedBackup.status)}>{statusText(selectedBackup.status)}</Badge>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Restore confirmation (destructive) */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
        title={t('Zaxiradan tiklash')}
        message={t('Joriy malumotlar tanlangan zaxira bilan almashtiriladi. Davom etasizmi?')}
        confirmText={t('Tiklash')}
        cancelText={t('Bekor qilish')}
        variant="danger"
      />

      {/* Delete confirmation (destructive) */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('Zaxirani ochirish')}
        message={t('Bu zaxira butunlay ochiriladi. Bu amalni qaytarib bolmaydi.')}
        confirmText={t('Ochirish')}
        cancelText={t('Bekor qilish')}
        variant="danger"
      />
    </div>
  );
}
