import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const SCREENSHOTS = 'c:/Users/tilav/Desktop/luxpetplastv2/screenshots';
try { mkdirSync(SCREENSHOTS, { recursive: true }); } catch {}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const bugs = [];
const ok = [];
const errors500 = [];
page.on('response', r => { if (r.status() === 500) errors500.push(r.url().replace('http://localhost:5004/api','')); });

// Login
await page.goto('http://localhost:3000/login');
await page.fill('#login', 'admin');
await page.fill('#password', 'admin123');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
console.log('Logged in:', page.url());

// Helper: scan page for UZS amount patterns
async function checkPage(name, url, extraChecks) {
  await page.goto(url);
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${SCREENSHOTS}/${name}.png` });
  
  // Pattern: digits followed by " UZS" (number then space then UZS)
  const uzsMatches = [...text.matchAll(/[\d,]{3,}\s+UZS\b/g)].map(m => m[0]);
  if (uzsMatches.length === 0) {
    ok.push(`✅ ${name}: no "X UZS" patterns found`);
  } else {
    bugs.push(`❌ ${name}: still shows ${uzsMatches.slice(0,3).join(', ')}`);
  }
  if (extraChecks) extraChecks(text);
}

await checkPage('dashboard', 'http://localhost:3000/cashier/dashboard');
await checkPage('customers', 'http://localhost:3000/cashier/customers');
await checkPage('sales', 'http://localhost:3000/cashier/sales');
await checkPage('expenses', 'http://localhost:3000/cashier/expenses');
await checkPage('cashbox', 'http://localhost:3000/cashier/cashbox');
await checkPage('reports', 'http://localhost:3000/cashier/reports');

// Customer profile
const custLink = await page.$('a[href*="/customers/"]');
if (custLink) {
  const href = await custLink.getAttribute('href');
  await checkPage('customer-profile', 'http://localhost:3000' + href);
}

// Sales add page
await page.goto('http://localhost:3000/cashier/sales/add');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SCREENSHOTS}/add-sale.png` });
const addSaleText = await page.evaluate(() => document.body.innerText);
if (addSaleText.includes('UZS') || addSaleText.includes('USD')) ok.push('✅ Add sale: currency toggle visible');
else bugs.push('❌ Add sale: no currency toggle visible');

// Check 500 errors collected across all pages
if (errors500.length === 0) ok.push('✅ No 500 backend errors detected');
else bugs.push('❌ 500 errors: ' + errors500.join(', '));

await browser.close();

console.log('\n=== FULL VERIFICATION RESULTS ===');
ok.forEach(m => console.log(m));
bugs.forEach(m => console.log(m));
console.log(`\nTotal: ${ok.length} passed, ${bugs.length} failed`);
