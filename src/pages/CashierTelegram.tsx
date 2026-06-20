import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TelegramConnect from '../components/TelegramConnect';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';

const t = latinToCyrillic;

const fieldClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none font-medium text-sm text-slate-900 transition-all placeholder:text-slate-400';

export default function CashierTelegram() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAdmin } = useAuthStore();

  const [forumGroupId, setForumGroupId] = useState('');
  const [forumSaving, setForumSaving] = useState(false);
  const [forumStatus, setForumStatus] = useState<'idle' | 'linked' | 'none'>('idle');
  const [tgLinked, setTgLinked] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created: number; failed: number; total: number; message: string;
  } | null>(null);

  useEffect(() => {
    loadForumConfig();
  }, []);

  const loadForumConfig = async () => {
    try {
      const [forumRes, tgRes] = await Promise.all([
        api.get('/telegram-user/forum-config'),
        api.get('/telegram-user/status'),
      ]);
      setForumGroupId(forumRes.data.groupId || '');
      setForumStatus(forumRes.data.configured ? 'linked' : 'none');
      setTgLinked(tgRes.data.linked);
    } catch {
      setForumStatus('none');
    }
  };

  const handleSaveForumGroup = async () => {
    if (!forumGroupId.trim()) return;
    setForumSaving(true);
    try {
      await api.post('/telegram-user/forum-config', { groupId: forumGroupId.trim() });
      setForumStatus('linked');
      addToast({ type: 'success', title: t('Saqlandi'), message: t('Forum guruh ID saqlandi') });
    } catch (e: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: e.response?.data?.error || e.message });
    } finally {
      setForumSaving(false);
    }
  };

  const handleBulkCreateTopics = async () => {
    setBulkRunning(true);
    setBulkResult(null);
    try {
      const { data } = await api.post('/telegram-user/bulk-create-topics');
      setBulkResult(data);
      addToast({ type: 'success', title: t('Tayyor'), message: data.message });
    } catch (e: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: e.response?.data?.error || e.message });
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t('Telegram sozlamalari')}</h1>
          <p className="text-xs text-slate-400">{t('Shaxsiy akkaunt va forum guruhi')}</p>
        </div>
      </div>

      {/* Shaxsiy akkaunt */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-1">{t('Shaxsiy Telegram akkaunt')}</h2>
        <p className="text-xs text-slate-400 mb-4">
          {t('Savdo cheklari va xabarlar sizning akkauntingizdan yuboriladi')}
        </p>
        <div className="rounded-xl bg-slate-900 p-4">
          <TelegramConnect onLinkedChange={setTgLinked} />
        </div>
      </div>

      {/* Forum guruhi — faqat admin ko'radi */}
      {isAdmin() && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            <h2 className="font-semibold text-slate-800">{t('Forum Guruhi')}</h2>
          </div>
          <p className="text-xs text-slate-400 -mt-2">
            {t('Barcha mijozlar shu guruh ichida alohida topicda boshqariladi')}
          </p>

          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
            !tgLinked
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : forumStatus === 'linked'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-50 text-slate-500 border border-slate-200'
          }`}>
            {!tgLinked ? (
              <><XCircle className="w-4 h-4 flex-shrink-0" />{t('Avval akkauntni ulang')}</>
            ) : forumStatus === 'linked' ? (
              <><CheckCircle className="w-4 h-4 flex-shrink-0" />{t('Guruh ulangan')}</>
            ) : (
              <><XCircle className="w-4 h-4 flex-shrink-0" />{t('Guruh ID kiritilmagan')}</>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">{t('Guruh ID')}</label>
            <div className="flex gap-2">
              <input
                className={fieldClass + ' flex-1'}
                value={forumGroupId}
                onChange={(e) => setForumGroupId(e.target.value)}
                placeholder="-1001234567890"
                disabled={!tgLinked}
              />
              <button
                type="button"
                onClick={handleSaveForumGroup}
                disabled={!tgLinked || forumSaving || !forumGroupId.trim()}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                {forumSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {t('Saqlash')}
              </button>
            </div>
            <p className="text-xs text-slate-400">{t("Guruhga @username_to_id_bot qo'shib ID oling")}</p>
          </div>

          {/* Bulk create */}
          {forumStatus === 'linked' && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t('Barcha mijozlar uchun topic yarat')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t("Topici yo'q barcha mijozlar uchun bir martada")}</p>
                </div>
                <button
                  type="button"
                  onClick={handleBulkCreateTopics}
                  disabled={!tgLinked || bulkRunning}
                  className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  {bulkRunning
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />{t('Yaratilmoqda...')}</>
                    : <><Users className="w-3.5 h-3.5" />{t('Hammasi uchun')}</>}
                </button>
              </div>

              {bulkResult && (
                <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm border ${
                  bulkResult.failed > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {bulkResult.failed > 0
                    ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-semibold">{bulkResult.message}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {t('Jami')}: {bulkResult.total} · {t('Yaratildi')}: {bulkResult.created} · {t('Xatolik')}: {bulkResult.failed}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
