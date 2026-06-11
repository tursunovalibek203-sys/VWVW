import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const SCREENSHOTS = 'c:/Users/tilav/Desktop/luxpetplastv2/screenshots';
try { mkdirSync(SCREENSHOTS, { recursive: true }); } catch {}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const bugs = [];
const ok = [];

// Login
await page.goto('http://localhost:3000/login');
await page.fill('#login', 'admin');
await page.fill('#password', 'admin123');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
console.log('Logged in, URL:', page.url());

// 1. Test Customers page - balance column
await page.goto('http://localhost:3000/cashier/customers');
await page.waitForTimeout(3000);
const custText = await page.evaluate(() => document.body.innerText);
writeFileSync(SCREENSHOTS + '/customers-fixed.txt', custText.slice(0, 3000));

if (custText.includes("so'm") && !custText.match(/\d+ UZS/)) {
  ok.push('✅ Customers page: balance/debt shows so\'m correctly');
} else if (custText.match(/\d+ UZS/)) {
  const match = custText.match(/[\d,]+ UZS/);
  bugs.push('❌ Customers still shows UZS: ' + match?.[0]);
}
await page.screenshot({ path: SCREENSHOTS + '/customers-fixed.png', fullPage: false });

// 2. Test Expenses page
await page.goto('http://localhost:3000/cashier/expenses');
await page.waitForTimeout(2000);
const expText = await page.evaluate(() => document.body.innerText);
if (expText.includes("so'm") && !expText.match(/\d{3,} UZS/)) {
  ok.push("✅ Expenses page: amounts show so'm correctly");
} else if (expText.match(/\d{3,} UZS/)) {
  const match = expText.match(/[\d,]+ UZS/);
  bugs.push('❌ Expenses still shows UZS: ' + match?.[0]);
}
await page.screenshot({ path: SCREENSHOTS + '/expenses-fixed.png', fullPage: false });

// 3. Test Reports page
await page.goto('http://localhost:3000/cashier/reports');
await page.waitForTimeout(3000);
const repText = await page.evaluate(() => document.body.innerText);
if (repText.includes("so'm")) {
  ok.push("✅ Reports page: currency labels show so'm");
} else {
  bugs.push('❌ Reports page: no so\'m found, possible issue');
}
await page.screenshot({ path: SCREENSHOTS + '/reports-fixed.png', fullPage: false });

// 4. Check for any 500 errors
const errors500 = [];
page.on('response', r => { if (r.status() === 500) errors500.push(r.url()); });
await page.goto('http://localhost:3000/cashier/reports');
await page.waitForTimeout(3000);
if (errors500.length === 0) ok.push('✅ No 500 errors on reports page');
else bugs.push('❌ 500 errors: ' + errors500.join(', '));

await browser.close();

console.log('\n=== RESULTS ===');
ok.forEach(m => console.log(m));
bugs.forEach(m => console.log(m));
if (bugs.length === 0) console.log('\n✅ All verified fixes look correct!');
else console.log('\n❌ Still ' + bugs.length + ' issue(s) to fix');
