import { useState } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import Button from './Button';
import api from '../lib/api';

export default function DataBackup() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await api.get('/backup/export');
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aziztrades-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Ma\'lumotlar muvaffaqiyatli eksport qilindi!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Eksport qilishda xatolik yuz berdi' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await api.post('/backup/import', data);
      
      setMessage({ type: 'success', text: 'Ma\'lumotlar muvaffaqiyatli import qilindi! Sahifani yangilang.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Import qilishda xatolik yuz berdi. Fayl formatini tekshiring.' });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <CardTitle>Ma'lumotlar Zaxirasi</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Barcha ma'lumotlarni eksport qiling yoki avvalgi zaxiradan tiklang.
          </p>

          {message && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export */}
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">Eksport</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Barcha ma'lumotlarni JSON formatida yuklab oling
              </p>
              <Button
                onClick={handleExport}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Yuklanmoqda...' : 'Ma\'lumotlarni Eksport Qilish'}
              </Button>
            </div>

            {/* Import */}
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Import</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Avvalgi zaxiradan ma'lumotlarni tiklang
              </p>
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={loading}
                  className="hidden"
                  id="import-file"
                />
                <Button
                  variant="secondary"
                  disabled={loading}
                  className="w-full cursor-pointer"
                  onClick={() => document.getElementById('import-file')?.click()}
                >
                  {loading ? 'Yuklanmoqda...' : 'Fayl Tanlash'}
                </Button>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900 dark:text-yellow-100">
                <p className="font-semibold mb-1">Muhim Ogohlantirish:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Import qilish mavjud ma'lumotlarni o'chiradi</li>
                  <li>Import qilishdan oldin joriy ma'lumotlarni eksport qiling</li>
                  <li>Faqat Lux Pet Plast dan eksport qilingan fayllarni import qiling</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
