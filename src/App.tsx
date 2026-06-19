import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useEffect, Suspense, lazy } from 'react';
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import { ScriptProvider } from './contexts/ScriptContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { AuthGuard } from './components/guards/AuthGuard';
import { RoleGuard } from './components/guards/RoleGuard';
import { ROLES, PERMISSIONS } from './lib/permissions';

// ========== LAZY LOADED PAGES ==========
// Auth pages
const Login = lazy(() => import('./pages/Login'));
const CashierLogin = lazy(() => import('./pages/CashierLogin'));

// Dashboard & Main
const Dashboard = lazy(() => import('./pages/Dashboard'));


// Inventory
const SimplifiedInventory = lazy(() => import('./pages/SimplifiedInventory'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const AddProduct = lazy(() => import('./pages/AddProduct'));

// Sales
const Sales = lazy(() => import('./pages/SalesModern'));
const AddSale = lazy(() => import('./pages/AddSaleClean'));

// Customers
const Customers = lazy(() => import('./pages/CustomersModern'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const CustomerProfileModern = lazy(() => import('./pages/CustomerProfileModern'));

// Orders & Cashbox
const Orders = lazy(() => import('./pages/Orders'));
const Cashbox = lazy(() => import('./pages/Cashbox'));
const Daftar = lazy(() => import('./pages/Daftar'));

// Finance
const Expenses = lazy(() => import('./pages/Expenses'));
const Revenue = lazy(() => import('./pages/Revenue'));

// Reports & Analytics
const Reports = lazy(() => import('./pages/ReportsModern'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Activity = lazy(() => import('./pages/Activity'));

// Management
const CashierManagement = lazy(() => import('./pages/CashierManagement'));
const Drivers = lazy(() => import('./pages/Drivers').then(m => ({ default: m.Drivers })));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Production = lazy(() => import('./pages/Production'));
const Quality = lazy(() => import('./pages/Quality'));
const Logistics = lazy(() => import('./pages/Logistics'));

// Tools
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Bots = lazy(() => import('./pages/Bots'));
const CloudBackup = lazy(() => import('./pages/CloudBackup'));
const Shortcuts = lazy(() => import('./pages/Shortcuts'));
const ModernChat = lazy(() => import('./pages/ModernChat'));

const Settings = lazy(() => import('./pages/Settings'));

// Layouts
const ProfessionalLayout = lazy(() => import('./components/ProfessionalLayout'));
const CashierLayout = lazy(() => import('./layouts/CashierLayout'));
const WarehouseLayout = lazy(() => import('./layouts/WarehouseLayout'));

// Warehouse pages
const WarehouseHome = lazy(() => import('./pages/warehouse/WarehouseHome'));
const WarehouseAddBag = lazy(() => import('./pages/warehouse/WarehouseAddBag'));
const WarehouseReports = lazy(() => import('./pages/warehouse/WarehouseReports'));


function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keep Render backend awake — ping every 9 minutes to prevent cold start
  useEffect(() => {
    const backendUrl = (import.meta as any).env?.VITE_API_BASE_URL ||
      (window.location.hostname === 'localhost' ? 'http://localhost:5003/api' : '/api');
    const ping = () => fetch(`${backendUrl}/health`, { method: 'GET' }).catch(() => {});
    ping(); // immediate ping on load
    const id = setInterval(ping, 9 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ToastProvider>
      <LanguageProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Yuklanmoqda...</p>
                </div>
              </div>
            }>
              <ScriptProvider>
                <AppRoutes />
              </ScriptProvider>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </LanguageProvider>
    </ToastProvider>
  );
}

// Separate component for routes to use hooks inside Router context
function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const onUnauthorized = () => {
      const path = window.location.pathname;
      if (path !== '/' && path !== '/login' && path !== '/cashier/login') {
        navigate(path.startsWith('/cashier') ? '/cashier/login' : '/login', { replace: true });
      }
    };
    window.addEventListener('app:unauthorized', onUnauthorized);
    return () => window.removeEventListener('app:unauthorized', onUnauthorized);
  }, [navigate]);

  return (
    <Routes>
      {/* ========== PUBLIC ROUTES ========== */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cashier/login" element={<CashierLogin />} />
      
      {/* ========== WAREHOUSE ROUTES (Protected) ========== */}
      <Route path="/warehouse/*" element={
        <AuthGuard>
          <RoleGuard requiredPermission={PERMISSIONS.ACCESS_WAREHOUSE_PANEL} fallback="/login">
            <WarehouseLayout>
              <Routes>
                <Route path="" element={<WarehouseHome />} />
                <Route path="products" element={<SimplifiedInventory />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="add-product" element={<AddProduct />} />
                <Route path="add-bag" element={<WarehouseAddBag />} />
                <Route path="reports" element={<WarehouseReports />} />
                <Route path="*" element={<Navigate to="/warehouse" />} />
              </Routes>
            </WarehouseLayout>
          </RoleGuard>
        </AuthGuard>
      } />

      {/* ========== CASHIER ROUTES (Protected) ========== */}
      <Route path="/cashier/*" element={
        <AuthGuard>
          <RoleGuard requiredPermission={PERMISSIONS.ACCESS_CASHIER_PANEL} fallback="/dashboard">
            <CashierLayout>
              <Routes>
                <Route path="sales" element={<Sales />} />
                <Route path="sales/add" element={<AddSale />} />
                <Route path="products" element={<SimplifiedInventory />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="add-product" element={<AddProduct />} />
                <Route path="inventory" element={<SimplifiedInventory />} />
                <Route path="orders" element={<Orders />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerProfileModern />} />
                <Route path="cashbox" element={<Cashbox />} />
                <Route path="chat" element={<ModernChat />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="*" element={<Navigate to="/cashier/sales" />} />
              </Routes>
            </CashierLayout>
          </RoleGuard>
        </AuthGuard>
      } />
      
      {/* ========== PROFESSIONAL ROUTES (Protected) ========== */}
      <Route path="*" element={
        <AuthGuard>
          <RoleGuard requiredPermission={PERMISSIONS.VIEW_DASHBOARD} fallback="/cashier/sales">
            <ProfessionalLayout>
              <Routes>
                {/* Dashboard */}
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Inventory */}
                <Route path="products" element={<SimplifiedInventory />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="add-product" element={<AddProduct />} />
                <Route path="inventory" element={<SimplifiedInventory />} />
                
                {/* Sales */}
                <Route path="sales" element={<Sales />} />
                <Route path="sales/add" element={<AddSale />} />
                
                {/* Customers */}
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerProfile />} />
                
                {/* Orders & Cashbox */}
                <Route path="orders" element={<Orders />} />
                <Route path="cashbox" element={<Cashbox />} />
                <Route path="daftar" element={<Daftar />} />
                
                {/* Finance */}
                <Route path="expenses" element={<Expenses />} />
                <Route path="revenue" element={<Revenue />} />
                
                {/* Reports */}
                <Route path="reports" element={<Reports />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="activity" element={<Activity />} />
                
                {/* Management */}
                <Route path="cashiers" element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                    <CashierManagement />
                  </RoleGuard>
                } />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="production" element={<Production />} />
                <Route path="quality" element={<Quality />} />
                <Route path="logistics" element={<Logistics />} />
                
                {/* Tools */}
                <Route path="ai-assistant" element={<AIAssistant />} />
                <Route path="bots" element={<Bots />} />
                <Route path="cloud-backup" element={<CloudBackup />} />
                <Route path="shortcuts" element={<Shortcuts />} />
                <Route path="settings" element={
                  <RoleGuard requiredPermission={PERMISSIONS.MANAGE_SETTINGS}>
                    <Settings />
                  </RoleGuard>
                } />
                
                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </ProfessionalLayout>
          </RoleGuard>
        </AuthGuard>
      } />
    </Routes>
  );
}

export default App;
