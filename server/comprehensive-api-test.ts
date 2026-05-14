import axios, { AxiosInstance } from 'axios';
import { prisma } from './utils/prisma.ts';

const API_URL = process.env.API_URL || 'http://localhost:5003/api';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'Test@123456';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  message: string;
  responseTime?: number;
}

const results: TestResult[] = [];
let authToken: string = '';
let axiosInstance: AxiosInstance;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logResult(result: TestResult) {
  const statusColor = result.status === 'PASS' ? colors.green : result.status === 'FAIL' ? colors.red : colors.yellow;
  const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
  log(`  [${result.status}] ${result.method} ${result.endpoint}${time} - ${result.message}`, statusColor);
}

async function testEndpoint(
  method: string,
  endpoint: string,
  data?: any,
  expectedStatus: number = 200
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    let response;
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await axiosInstance.get(endpoint);
        break;
      case 'POST':
        response = await axiosInstance.post(endpoint, data || {});
        break;
      case 'PUT':
        response = await axiosInstance.put(endpoint, data || {});
        break;
      case 'PATCH':
        response = await axiosInstance.patch(endpoint, data || {});
        break;
      case 'DELETE':
        response = await axiosInstance.delete(endpoint);
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    const responseTime = Date.now() - startTime;
    const success = response.status === expectedStatus;
    
    return {
      endpoint,
      method,
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: `Got status ${response.status}, expected ${expectedStatus}`,
      responseTime
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const status = error.response?.status || 'unknown';
    
    return {
      endpoint,
      method,
      status: 'FAIL',
      statusCode: status,
      message: error.response?.data?.message || error.message || 'Unknown error',
      responseTime
    };
  }
}

async function setupTestUser() {
  try {
    // Create or get test user
    const existingUser = await prisma.user.findFirst({
      where: { username: TEST_USERNAME }
    });

    if (existingUser) {
      log(`✓ Test user already exists: ${TEST_USERNAME}`, colors.cyan);
      return;
    }

    const hashedPassword = await import('bcryptjs').then(bcrypt => 
      bcrypt.hash(TEST_PASSWORD, 10)
    );

    await prisma.user.create({
      data: {
        username: TEST_USERNAME,
        password: hashedPassword,
        name: 'Test User',
        email: 'test@example.com',
        role: 'MANAGER'
      }
    });

    log(`✓ Test user created: ${TEST_USERNAME}`, colors.cyan);
  } catch (error: any) {
    log(`⚠ Test user setup: ${error.message}`, colors.yellow);
  }
}

async function authenticateUser(): Promise<boolean> {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });

    authToken = response.data.token;
    axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    log(`✓ Authentication successful`, colors.green);
    log(`  Token: ${authToken.substring(0, 20)}...`, colors.blue);
    return true;
  } catch (error: any) {
    log(`✗ Authentication failed: ${error.message}`, colors.red);
    return false;
  }
}

async function runTests() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('🧪 COMPREHENSIVE API TEST SUITE', colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);

  // Setup test user
  await setupTestUser();

  // Authenticate
  if (!(await authenticateUser())) {
    log('\n✗ Cannot proceed without authentication', colors.red);
    process.exit(1);
  }

  log('\n📋 Starting API Tests...\n', colors.blue);

  // ====================
  // HEALTH CHECK
  // ====================
  log('Health Check:', colors.cyan);
  results.push(await testEndpoint('GET', '/health'));

  // ====================
  // AUTH ROUTES
  // ====================
  log('\nAuth Routes:', colors.cyan);
  results.push(await testEndpoint('GET', '/auth/me'));

  // ====================
  // PRODUCTS
  // ====================
  log('\nProducts:', colors.cyan);
  results.push(await testEndpoint('GET', '/products'));
  results.push(await testEndpoint('GET', '/products?limit=10&skip=0'));

  // ====================
  // PRODUCT TYPES
  // ====================
  log('\nProduct Types:', colors.cyan);
  results.push(await testEndpoint('GET', '/product-types'));

  // ====================
  // PRODUCT CATEGORIES
  // ====================
  log('\nProduct Categories:', colors.cyan);
  results.push(await testEndpoint('GET', '/product-categories'));

  // ====================
  // CUSTOMERS
  // ====================
  log('\nCustomers:', colors.cyan);
  results.push(await testEndpoint('GET', '/customers'));
  results.push(await testEndpoint('GET', '/customers?limit=10&skip=0'));

  // ====================
  // SALES
  // ====================
  log('\nSales:', colors.cyan);
  results.push(await testEndpoint('GET', '/sales'));
  results.push(await testEndpoint('GET', '/sales?limit=10&skip=0'));

  // ====================
  // DASHBOARD
  // ====================
  log('\nDashboard:', colors.cyan);
  results.push(await testEndpoint('GET', '/dashboard'));
  results.push(await testEndpoint('GET', '/dashboard/stats'));

  // ====================
  // CASHIER
  // ====================
  log('\nCashier:', colors.cyan);
  results.push(await testEndpoint('GET', '/cashier/balance'));
  results.push(await testEndpoint('GET', '/cashier/transactions'));

  // ====================
  // CASHBOX
  // ====================
  log('\nCashbox:', colors.cyan);
  results.push(await testEndpoint('GET', '/cashbox'));

  // ====================
  // USERS
  // ====================
  log('\nUsers:', colors.cyan);
  results.push(await testEndpoint('GET', '/users'));

  // ====================
  // EXPENSES
  // ====================
  log('\nExpenses:', colors.cyan);
  results.push(await testEndpoint('GET', '/expenses'));

  // ====================
  // REPORTS
  // ====================
  log('\nReports:', colors.cyan);
  results.push(await testEndpoint('GET', '/reports'));

  // ====================
  // ANALYTICS
  // ====================
  log('\nAnalytics:', colors.cyan);
  results.push(await testEndpoint('GET', '/analytics'));

  // ====================
  // SETTINGS
  // ====================
  log('\nSettings:', colors.cyan);
  results.push(await testEndpoint('GET', '/settings'));

  // ====================
  // NOTIFICATIONS
  // ====================
  log('\nNotifications:', colors.cyan);
  results.push(await testEndpoint('GET', '/notifications'));

  // ====================
  // AUDIT LOGS
  // ====================
  log('\nAudit Logs:', colors.cyan);
  results.push(await testEndpoint('GET', '/audit-logs'));

  // ====================
  // FORECAST
  // ====================
  log('\nForecast:', colors.cyan);
  results.push(await testEndpoint('GET', '/forecast'));

  // ====================
  // RAW MATERIALS
  // ====================
  log('\nRaw Materials:', colors.cyan);
  results.push(await testEndpoint('GET', '/raw-materials'));

  // ====================
  // SUPPLIERS
  // ====================
  log('\nSuppliers:', colors.cyan);
  results.push(await testEndpoint('GET', '/suppliers'));

  // ====================
  // PRODUCTION
  // ====================
  log('\nProduction:', colors.cyan);
  results.push(await testEndpoint('GET', '/production'));

  // ====================
  // QUALITY CHECKS
  // ====================
  log('\nQuality Checks:', colors.cyan);
  results.push(await testEndpoint('GET', '/quality-checks'));

  // ====================
  // INVENTORY AI
  // ====================
  log('\nInventory AI:', colors.cyan);
  results.push(await testEndpoint('GET', '/inventory-ai'));

  // ====================
  // LOGISTICS
  // ====================
  log('\nLogistics:', colors.cyan);
  results.push(await testEndpoint('GET', '/logistics'));

  // ====================
  // DRIVERS
  // ====================
  log('\nDrivers:', colors.cyan);
  results.push(await testEndpoint('GET', '/drivers'));

  // ====================
  // STATISTICS
  // ====================
  log('\nStatistics:', colors.cyan);
  results.push(await testEndpoint('GET', '/statistics'));

  // ====================
  // RESULTS SUMMARY
  // ====================
  log('\n' + '='.repeat(80), colors.cyan);
  log('📊 TEST RESULTS SUMMARY', colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  log(`Total Tests: ${total}`, colors.blue);
  log(`✓ Passed: ${passed}`, colors.green);
  log(`✗ Failed: ${failed}`, colors.red);
  log(`⊘ Skipped: ${skipped}`, colors.yellow);

  const passRate = ((passed / total) * 100).toFixed(1);
  log(`Pass Rate: ${passRate}%\n`, colors.blue);

  // Failed tests
  const failedTests = results.filter(r => r.status === 'FAIL');
  if (failedTests.length > 0) {
    log('Failed Tests:', colors.red);
    failedTests.forEach(test => {
      log(`  ✗ ${test.method} ${test.endpoint}`, colors.red);
      log(`    Status: ${test.statusCode}`, colors.red);
      log(`    Message: ${test.message}`, colors.red);
    });
  }

  log('\n' + '='.repeat(80) + '\n', colors.cyan);

  // Exit codes
  if (failed === 0) {
    log(`✓ All tests passed! API is working correctly.`, colors.green);
    process.exit(0);
  } else {
    log(`✗ ${failed} test(s) failed. Check the issues above.`, colors.red);
    process.exit(1);
  }
}

// Run tests
(async () => {
  try {
    await runTests();
  } catch (error) {
    log(`\n✗ Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
