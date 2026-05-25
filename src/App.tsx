import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useEffect, Suspense, lazy } from 'react';
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

// ========== LAZY LOADED PAGES ==========
// Auth pages
const Login = lazy(() => import('./pages/Login'));
const CashierLogin = lazy(() => import('./pages/CashierLogin'));

// Dashboard & Main
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardModern = lazy(() => import('./pages/DashboardModern'));

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

// Finance
const Expenses = lazy(() => import('./pages/Expenses'));
const Revenue = lazy(() => import('./pages/Revenue'));

// Reports & Analytics
const Reports = lazy(() => import('./pages/ReportsModern'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Activity = lazy(() => import('./pages/Activity'));

// Management
const CashierManagement = lazy(() => import('./pages/CashierManagement'));
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
const CashierBot = lazy(() => import('./pages/CashierBot'));
const Settings = lazy(() => import('./pages/Settings'));

// Layouts
const ProfessionalLayout = lazy(() => import('./components/ProfessionalLayout'));
const CashierLayout = lazy(() => import('./layouts/CashierLayout'));


function App() {
  const { token, user } = useAuthStore();
  const { theme } = useThemeStore();
  
  useEffect(() => {
    // Apply theme
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Suspense fallback={null}>
              <AppRoutes token={token} user={user} />
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

// Separate component for routes to use hooks inside Router context
function AppRoutes({ token, user }: { token: string | null; user: any }) {
  const location = useLocation();
  const isCashier = user?.role?.toUpperCase() === 'CASHIER' || user?.role?.toUpperCase() === 'SELLER';
  
  const isCashierRoute = location.pathname.startsWith('/cashier');
  
  // Redirect cashier to /cashier if trying to access professional routes
  if (token && isCashier && !isCashierRoute) {
    return <Navigate to="/cashier/sales" replace />;
  }

  return (
    <Routes>
      {/* ========== PUBLIC ROUTES ========== */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cashier/login" element={<CashierLogin />} />
      
      {/* ========== CASHIER ROUTES (Protected) ========== */}
      <Route path="/cashier/*" element={
        token ? (
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
              <Route path="bot" element={<CashierBot />} />
              <Route path="chat" element={<ModernChat />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="*" element={<Navigate to="/cashier/sales" />} />
            </Routes>
          </CashierLayout>
        ) : (
          <Navigate to="/cashier/login" replace />
        )
      } />
      
      {/* ========== PROFESSIONAL ROUTES (Protected) ========== */}
      <Route path="*" element={
        token ? (
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
              
              {/* Finance */}
              <Route path="expenses" element={<Expenses />} />
              <Route path="revenue" element={<Revenue />} />
              
              {/* Reports */}
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="activity" element={<Activity />} />
              
              {/* Management */}
              <Route path="cashiers" element={<CashierManagement />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="production" element={<Production />} />
              <Route path="quality" element={<Quality />} />
              <Route path="logistics" element={<Logistics />} />
              
              {/* Tools */}
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="bots" element={<Bots />} />
              <Route path="cloud-backup" element={<CloudBackup />} />
              <Route path="shortcuts" element={<Shortcuts />} />
              <Route path="settings" element={<Settings />} />
              
              {/* Default redirect */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </ProfessionalLayout>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}

export default App;
