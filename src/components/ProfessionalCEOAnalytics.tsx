import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import ModernLayout from './ModernLayout';
import { latinToCyrillic, trData } from '../lib/transliterator';
import { safeParseFloat, safePercentage } from '../lib/safe-math';
import {
  DollarSign, Users,
  AlertTriangle, Target, Activity, Flame, Brain,
  BarChart3,
  Shield, Zap, Crown, ArrowUpRight, ArrowDownRight,
  RefreshCcw, AlertCircle,
  CheckCircle, XCircle, TrendingUp as TrendIcon,
  Percent, Calculator, Eye, Award
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, ComposedChart
} from 'recharts';

// 🔥 1. MONEY FLOW - Burn Rate & Runway
function MoneyFlowCard({ data }: { data: any }) {
  const burnRate = data?.burnRate || 0;
  const runway = data?.runway || 0;
  const dailyIncome = data?.dailyIncome || 0;
  const dailyExpense = data?.dailyExpense || 0;
  const cashBalance = data?.cashBalance || 0;

  return (
    <Card className="border-2 border-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-amber-500" />
          Cash Flow Control (Pul Oqimi)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Bugungi Kirim</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(dailyIncome, 'USD')}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Bugungi Chiqim</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(dailyExpense, 'USD')}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Kassadagi Pul</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(cashBalance, 'USD')}</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Burn Rate</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(burnRate, 'USD')}/kun</p>
            <p className="text-xs text-amber-600">(kunlik xarajat)</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Runway</p>
            <p className="text-xl font-bold text-purple-600">{runway} kun</p>
            <p className="text-xs text-purple-600">(pul yetadigan vaqt)</p>
          </div>
        </div>

        {runway < 30 && (
          <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 rounded flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-medium">⚠️ Diqqat! Pul 30 kundan kam yetadi!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 🔥 2. UNIT ECONOMICS - Margin per Product
function UnitEconomicsCard({ data }: { data: any[] }) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  return (
    <Card className="border-2 border-emerald-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-500" />
          Unit Economics (Mahsulot Marjasi)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.map((product: any) => {
            const price = safeParseFloat(product.price, 0);
            const cost = safeParseFloat(product.cost, 0);
            const margin = safePercentage(price - cost, price, 0);
            const isProfitable = margin > 20;
            
            return (
              <div 
                key={product.id}
                className={`p-4 rounded-lg border-l-4 ${
                  isProfitable ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{trData(product.name)}</p>
                    <p className="text-sm text-muted-foreground">
                      Sotuv: {formatCurrency(product.price, 'USD')} | 
                      Tannarx: {formatCurrency(product.cost, 'USD')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                      {margin}%
                    </p>
                    <p className="text-xs">marja</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold mb-2">📊 Formula:</p>
          <code className="text-sm bg-gray-200 px-2 py-1 rounded">
            Margin = (Narx - Tannarx) / Narx × 100%
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            20%+ marja = foydali | 20% dan kam = zararli
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 3. COHORT ANALYSIS
function CohortAnalysisCard({ data }: { data: any[] }) {
  return (
    <Card className="border-2 border-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          Cohort Analysis (Mijoz Qaytish)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Davr</th>
                <th className="p-2 text-center">Yangi Mijoz</th>
                <th className="p-2 text-center">1-hafta</th>
                <th className="p-2 text-center">2-hafta</th>
                <th className="p-2 text-center">1-oy</th>
                <th className="p-2 text-center">3-oy</th>
                <th className="p-2 text-center">Qaytish %</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((cohort: any, idx: number) => (
                <tr key={idx} className="border-b">
                  <td className="p-2 font-medium">{cohort.period}</td>
                  <td className="p-2 text-center">{cohort.newCustomers}</td>
                  <td className="p-2 text-center bg-blue-50">{cohort.week1}%</td>
                  <td className="p-2 text-center bg-blue-50">{cohort.week2}%</td>
                  <td className="p-2 text-center bg-green-50">{cohort.month1}%</td>
                  <td className="p-2 text-center bg-green-50">{cohort.month3}%</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded ${
                      cohort.retention > 50 ? 'bg-green-200 text-green-800' : 
                      cohort.retention > 30 ? 'bg-yellow-200 text-yellow-800' : 
                      'bg-red-200 text-red-800'
                    }`}>
                      {cohort.retention}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
          <p className="font-medium">💡 Marketing samaradorligi:</p>
          <p>Qayta sotib oladigan mijoz 5x arzonroq yangi mijozdan!</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 4. LTV vs CAC (Golden Formula)
function LTVCACCard({ data }: { data: any }) {
  const ltv = data?.ltv || 0;
  const cac = data?.cac || 0;
  const ratio = cac > 0 ? (ltv / cac).toFixed(2) : '0';
  const isProfitable = parseFloat(ratio) > 3;

  return (
    <Card className="border-2 border-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-purple-500" />
          LTV vs CAC (Oltin Formula)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">LTV (Mijoz Umri Qiymati)</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(ltv, 'USD')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mijoz umri davomida olib keladi
            </p>
          </div>
          
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">CAC (Olib Kelish Narxi)</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(cac, 'USD')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bitta mijozni olib kelish narxi
            </p>
          </div>
        </div>

        <div className="mt-6 p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">LTV / CAC Nisbati</p>
          <p className={`text-5xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {ratio}x
          </p>
          <p className={`mt-2 font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {isProfitable ? '✅ Biznes o\'sadi' : '❌ Zarar qilasiz'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ideal: 3x+ | Kamida: 1x
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 5. FUNNEL ANALYTICS
function FunnelAnalyticsCard({ data }: { data: any[] }) {
  const maxValue = Math.max(...(data?.map((d: any) => d.value) || [1]));

  return (
    <Card className="border-2 border-cyan-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-6 h-6 text-cyan-500" />
          Funnel Analytics (Savdo Voronkasi)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.map((stage: any, idx: number) => {
            const percentage = (stage.value / maxValue * 100).toFixed(1);
            const prevStage = idx > 0 ? data[idx - 1] : null;
            const conversion = prevStage 
              ? ((stage.value / prevStage.value) * 100).toFixed(1)
              : '100';
            const dropoff = prevStage 
              ? (100 - parseFloat(conversion)).toFixed(1)
              : '0';

            return (
              <div key={idx} className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{stage.name}</div>
                  <div className="flex-1">
                    <div 
                      className="h-10 rounded-lg flex items-center px-3 text-white font-semibold"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: stage.color || '#3b82f6'
                      }}
                    >
                      {stage.value}
                    </div>
                  </div>
                  <div className="w-32 text-right text-sm">
                    {idx > 0 && (
                      <>
                        <span className="text-green-600">{conversion}%</span>
                        <span className="text-red-500 ml-2">(-{dropoff}%)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-cyan-50 rounded-lg">
          <p className="font-medium text-sm mb-2">🔍 Yo\'qolish joylari:</p>
          <ul className="text-sm space-y-1">
            {data?.map((stage: any, idx: number) => {
              if (idx === 0) return null;
              const prev = data[idx - 1];
              const dropoff = ((1 - stage.value / prev.value) * 100).toFixed(1);
              if (parseFloat(dropoff) > 30) {
                return (
                  <li key={idx} className="text-red-600">
                    ⚠️ {prev.name} → {stage.name}: {dropoff}% yo\'qoldi
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 6. ANOMALY DETECTION
function AnomalyDetectionCard({ data }: { data: any[] }) {
  return (
    <Card className="border-2 border-red-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          Anomaliya Aniqlash (Smart Sistema)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.map((anomaly: any, idx: number) => (
            <div 
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${
                anomaly.severity === 'critical' ? 'bg-red-50 border-red-500' :
                anomaly.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {anomaly.severity === 'critical' ? (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                ) : anomaly.severity === 'warning' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">{anomaly.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      anomaly.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      anomaly.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {anomaly.severity === 'critical' ? '🔴 KRITIK' :
                       anomaly.severity === 'warning' ? '🟠 DIQQAT' : '🔵 INFO'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{anomaly.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {anomaly.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data?.length === 0 && (
          <div className="text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-green-600">Hammasi yaxshi!</p>
            <p className="text-muted-foreground">Anomaliyalar aniqlanmadi</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 🔥 7. DEMAND FORECAST
function DemandForecastCard({ data }: { data: any }) {
  const forecast = data?.forecast || [];
  const recommendations = data?.recommendations || [];

  return (
    <Card className="border-2 border-indigo-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-6 h-6 text-indigo-500" />
          Demand Forecast (Oldindan Bilish)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="actual" fill="#3b82f6" name="Haqiqiy" />
              <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={3} name="Prognoz" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <p className="font-semibold mb-2">📦 Ombor Tavsiyalari:</p>
          {recommendations?.map((rec: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <div>
                <p className="font-medium">{trData(rec.productName)}</p>
                <p className="text-sm text-muted-foreground">
                  Ertaga: {rec.predictedSales} dona sotiladi
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-600">
                  +{rec.restockAmount} dona oling
                </p>
                <p className="text-xs text-muted-foreground">
                  Joriy: {rec.currentStock}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 8. DYNAMIC PRICING
function DynamicPricingCard({ data }: { data: any[] }) {
  return (
    <Card className="border-2 border-pink-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-pink-500" />
          Dynamic Pricing (Avto Narx)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.map((item: any) => (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold">{trData(item.productName)}</p>
                <span className={`px-2 py-1 rounded text-xs ${
                  item.demand === 'high' ? 'bg-red-100 text-red-700' :
                  item.demand === 'low' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  Talab: {item.demand === 'high' ? '🔥 Yuqori' : item.demand === 'low' ? '📉 Past' : '➡️ Normal'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Hozirgi narx</p>
                  <p className="text-lg font-semibold">{formatCurrency(item.currentPrice, 'USD')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tavsiya</p>
                  <p className={`text-lg font-bold ${
                    item.suggestedPrice > item.currentPrice ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(item.suggestedPrice, 'USD')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">O\'zgarish</p>
                  <p className={`text-lg font-bold flex items-center justify-center ${
                    item.change > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {item.change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(item.change)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 9. FRAUD DETECTION
function FraudDetectionCard({ data }: { data: any[] }) {
  return (
    <Card className="border-2 border-rose-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-rose-600" />
          Fraud Detection (Firibgarlik Aniqlash)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.map((fraud: any, idx: number) => (
            <div key={idx} className="p-4 bg-rose-50 border-l-4 border-rose-600 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">{fraud.type}</h4>
                    <span className="text-xs px-2 py-1 bg-rose-200 text-rose-800 rounded">
                      {fraud.riskScore}% xavf
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{fraud.description}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>Kassir: {trData(fraud.cashierName)}</p>
                    <p>Vaqt: {fraud.timestamp}</p>
                    <p>Summa: {formatCurrency(fraud.amount, 'USD')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">🛡️ Tekshirilmoqda:</p>
          <ul className="text-xs text-muted-foreground mt-1 space-y-1">
            <li>• Katta summali bekor qilishlar</li>
            <li>• Chek orqali pul olish</li>
            <li>• Bir xil karta bilan ko\'p refund</li>
            <li>• Ish vaqti tashqaridagi operatsiyalar</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 10. REAL KPI SYSTEM
function RealKPICard({ data }: { data: any }) {
  const kpis = [
    { name: 'ROI', value: data?.roi || 0, target: 20, unit: '%', icon: TrendIcon },
    { name: 'ROAS', value: data?.roas || 0, target: 3, unit: 'x', icon: Target },
    { name: 'Conversion', value: data?.conversion || 0, target: 5, unit: '%', icon: Percent },
    { name: 'Inventory Turnover', value: data?.inventoryTurnover || 0, target: 12, unit: '', icon: RefreshCcw },
  ];

  return (
    <Card className="border-2 border-violet-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-6 h-6 text-violet-500" />
          Real KPI System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const isGood = kpi.value >= kpi.target;
            
            return (
              <div key={idx} className={`p-4 rounded-lg ${isGood ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${isGood ? 'text-green-600' : 'text-yellow-600'}`} />
                  <p className="text-sm text-muted-foreground">{kpi.name}</p>
                </div>
                <p className={`text-3xl font-bold ${isGood ? 'text-green-600' : 'text-yellow-600'}`}>
                  {kpi.value}{kpi.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target: {kpi.target}{kpi.unit}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-violet-50 rounded-lg">
          <p className="font-semibold text-sm mb-2">📈 KPI Ta\'riflari:</p>
          <ul className="text-xs space-y-1">
            <li><strong>ROI:</strong> Qaytish darajasi (daromad / investitsiya)</li>
            <li><strong>ROAS:</strong> Reklama samarasi (sotuv / reklama xarajati)</li>
            <li><strong>Conversion:</strong> Kirganlardan sotib olganlar %</li>
            <li><strong>Inventory Turnover:</strong> Ombor aylanish tezligi</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 11. AUTOMATION STATUS
function AutomationCard({ data }: { data: any }) {
  return (
    <Card className="border-2 border-teal-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="w-6 h-6 text-teal-500" />
          Automation Status (Avtomatlashtirish)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.map((automation: any) => (
            <div 
              key={automation.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                automation.status === 'active' ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  automation.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <div>
                  <p className="font-medium">{trData(automation.name)}</p>
                  <p className="text-xs text-muted-foreground">{trData(automation.description)}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className={automation.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                  {automation.status === 'active' ? '✅ Faol' : '⏸️ To\'xtagan'}
                </p>
                {automation.lastRun && (
                  <p className="text-xs text-muted-foreground">
                    Oxirgi: {automation.lastRun}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-teal-50 rounded-lg">
          <p className="text-sm font-medium">🤖 Avtomatik vazifalar:</p>
          <ul className="text-xs text-muted-foreground mt-1 space-y-1">
            <li>• Telegram kunlik hisobot (08:00)</li>
            <li>• Ombor qayta to\'ldirish tavsiyasi</li>
            <li>• Excel eksport (har kuni)</li>
            <li>• Anomaliya monitoring (real-time)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// 🔥 12. CEO MODE - Executive Summary
function CEOModeCard({ data }: { data: any }) {
  return (
    <Card className="border-2 border-gold bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <Crown className="w-6 h-6 text-amber-600" />
          CEO Mode (Boshqaruvchi Xulosasi)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Haftalik xulosa */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="font-semibold text-amber-800 mb-2">📊 Bu hafta xulosa:</p>
            <p className="text-lg">{data?.weeklySummary}</p>
          </div>

          {/* Ogohlantirishlar */}
          {data?.alerts?.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="font-semibold text-red-700 mb-2">🚨 Ogohlantirishlar:</p>
              <ul className="space-y-2">
                {data.alerts.map((alert: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tavsiyalar */}
          {data?.recommendations?.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="font-semibold text-green-700 mb-2">💡 Tavsiyalar:</p>
              <ul className="space-y-2">
                {data.recommendations.map((rec: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4 mt-0.5" />
                    {rec.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Asosiy ko\'rsatkichlar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Foyda o\'zgarishi</p>
              <p className={`text-xl font-bold ${(data?.profitChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(data?.profitChange || 0) > 0 ? '+' : ''}{data?.profitChange}%
              </p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Zararli mahsulotlar</p>
              <p className="text-xl font-bold text-red-600">{data?.unprofitableProducts || 0}</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Reklama samaradorligi</p>
              <p className="text-xl font-bold text-blue-600">{data?.marketingEfficiency || 'N/A'}</p>
            </div>
          </div>

          {/* AI Qaror */}
          {data?.aiDecision && (
            <div className="p-4 bg-amber-100 rounded-lg border border-amber-300">
              <p className="font-semibold text-amber-800 mb-1">🤖 AI Tavsiyasi:</p>
              <p className="text-amber-900">{data.aiDecision}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============
export default function ProfessionalCEOAnalytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operations' | 'intelligence'>('overview');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const { data } = await api.get('/analytics/ceo-dashboard');
      setAnalyticsData(data);
    } catch (error) {
      // Fallback demo data
      setAnalyticsData({
        moneyFlow: {
          burnRate: 2500000,
          runway: 45,
          dailyIncome: 4500000,
          dailyExpense: 2500000,
          cashBalance: 112500000
        },
        unitEconomics: [
          { id: 1, name: '0.5L Preform', price: 2500, cost: 1800 },
          { id: 2, name: 'KR Ruchka', price: 800, cost: 550 },
          { id: 3, name: 'Qop 10kg', price: 3500, cost: 3200 }
        ],
        cohortAnalysis: [
          { period: 'Hafta 1', newCustomers: 45, week1: 80, week2: 65, month1: 45, month3: 30, retention: 67 },
          { period: 'Hafta 2', newCustomers: 38, week1: 75, week2: 60, month1: 40, month3: 25, retention: 66 }
        ],
        ltvCac: { ltv: 850000, cac: 250000 },
        funnel: [
          { name: 'Ko\'rdi', value: 1000, color: '#3b82f6' },
          { name: 'Qiziqdi', value: 350, color: '#8b5cf6' },
          { name: 'Savatga', value: 180, color: '#f59e0b' },
          { name: 'Sotib oldi', value: 95, color: '#10b981' }
        ],
        anomalies: [
          { title: 'Sotuv keskin tushdi', description: 'Bugun sotuv o\'tgan haftaga nisbatan 35% kam', severity: 'warning', timestamp: '2026-04-20 14:30' },
          { title: 'Ombor tugayapti', description: '0.5L Preform 50 dona qoldi', severity: 'critical', timestamp: '2026-04-20 10:15' }
        ],
        forecast: {
          forecast: [
            { date: 'Dush', actual: 120, predicted: 115 },
            { date: 'Sesh', actual: 135, predicted: 140 },
            { date: 'Chor', actual: 110, predicted: 125 },
            { date: 'Pay', actual: null, predicted: 130 },
            { date: 'Jum', actual: null, predicted: 145 }
          ],
          recommendations: [
            { productName: '0.5L Preform', predictedSales: 45, currentStock: 50, restockAmount: 100 },
            { productName: 'KR Ruchka', predictedSales: 120, currentStock: 200, restockAmount: 0 }
          ]
        },
        dynamicPricing: [
          { id: 1, productName: '0.5L Preform', currentPrice: 2500, suggestedPrice: 2700, change: 8, demand: 'high' },
          { id: 2, productName: 'Qop 5kg', currentPrice: 2000, suggestedPrice: 1800, change: -10, demand: 'low' }
        ],
        fraud: [
          { type: 'Katta bekor qilish', description: 'Kassir A 500,000 so\'mlik chekni bekor qildi', riskScore: 85, cashierName: 'Kassir A', timestamp: '2026-04-20 15:45', amount: 500000 }
        ],
        kpi: { roi: 18.5, roas: 2.8, conversion: 4.2, inventoryTurnover: 10 },
        automation: [
          { id: 1, name: 'Telegram Hisobot', description: 'Kunlik hisobot yuborish', status: 'active', lastRun: '08:00' },
          { id: 2, name: 'Ombor Monitoring', description: 'Kam qolgan mahsulotlarni aniqlash', status: 'active', lastRun: 'Real-time' },
          { id: 3, name: 'Excel Eksport', description: 'Sotuvlar hisobotini generatsiya', status: 'inactive', lastRun: 'Kecha' }
        ],
        ceoMode: {
          weeklySummary: 'Bu hafta foyda 18% tushdi. 3 ta mahsulot zarar qilmoqda. Reklama pulini ijtimoiy tarmoqlarga ko\'chirish tavsiya etiladi.',
          alerts: [
            { message: '3 ta mahsulot zarar qilmoqda' },
            { message: 'Kassir B da g\'alati operatsiyalar' }
          ],
          recommendations: [
            { message: 'Reklama pulini ijtimoiy tarmoqlarga o\'tkaz' },
            { message: '0.5L Preform narxini 8% oshir' }
          ],
          profitChange: -18,
          unprofitableProducts: 3,
          marketingEfficiency: 'O\'rtacha',
          aiDecision: 'Hozircha reklama budjetini oshirmang, avval mavjud mijozlarni saqlab qoling'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-semibold">CEO Analytics yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Umumiy', icon: BarChart3 },
    { id: 'financial', name: 'Moliyaviy', icon: DollarSign },
    { id: 'operations', name: 'Operatsiyalar', icon: Activity },
    { id: 'intelligence', name: 'AI Tahlil', icon: Brain }
  ];

  return (
    <ModernLayout 
      title={latinToCyrillic("CEO Analytics")}
      subtitle={latinToCyrillic("12 ta professional biznes tahlil moduli")}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="w-8 h-8 text-amber-600" />
              CEO Professional Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              12 ta professional biznes tahlil moduli
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* CEO Mode - Always on top */}
        <CEOModeCard data={analyticsData?.ceoMode} />

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MoneyFlowCard data={analyticsData?.moneyFlow} />
            <LTVCACCard data={analyticsData?.ltvCac} />
            <RealKPICard data={analyticsData?.kpi} />
            <AnomalyDetectionCard data={analyticsData?.anomalies} />
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UnitEconomicsCard data={analyticsData?.unitEconomics} />
            <MoneyFlowCard data={analyticsData?.moneyFlow} />
            <LTVCACCard data={analyticsData?.ltvCac} />
            <DynamicPricingCard data={analyticsData?.dynamicPricing} />
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelAnalyticsCard data={analyticsData?.funnel} />
            <DemandForecastCard data={analyticsData?.forecast} />
            <CohortAnalysisCard data={analyticsData?.cohortAnalysis} />
            <AutomationCard data={analyticsData?.automation} />
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnomalyDetectionCard data={analyticsData?.anomalies} />
            <FraudDetectionCard data={analyticsData?.fraud} />
            <RealKPICard data={analyticsData?.kpi} />
            <DemandForecastCard data={analyticsData?.forecast} />
          </div>
        )}
      </div>
      </div>
    </ModernLayout>
  );
}
