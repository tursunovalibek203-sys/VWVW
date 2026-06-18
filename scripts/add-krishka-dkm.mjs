// Faqat КРИШКА ДКМ mahsulotlarini qo'shimcha qo'shish (mavjudlarga tegmaydi)
// node scripts/add-krishka-dkm.mjs

const BASE = 'https://luxpetplast-api.onrender.com/api';

async function api(method, path, body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status} ${t.slice(0, 200)}`); }
  return r.json().catch(() => ({}));
}

// unitsPerBag farqlanadigan bir xil rangdagi mahsulotlar nomiga qop sig'imi qo'shildi
const PRODUCTS = [
  { name: 'Кришка ДКМ кук 6000',    bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 78 },
  { name: 'Кришка ДКМ яшил 6000',   bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 78 },
  { name: 'Кришка ДКМ сарик 4000',  bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 4000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 52 },
  { name: 'Кришка ДКМ қизил 6000',  bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 78 },
  { name: 'Кришка ДКМ сарик 6000',  bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 78 },
  { name: 'Кришка ДКМ оранж 1000',  bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 1000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 13 },
  { name: 'Кришка ДКМ кук 2000',    bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 26 },
  { name: 'Кришка ДКМ яшил 4000',   bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 4000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 52 },
  { name: 'Кришка ДКМ сарик 2000',  bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000,  currentStock: 0, pricePerPiece: 0.013, pricePerBag: 26 },
  { name: 'Кришка ДКМ ок 10000',    bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 10000, currentStock: 0, pricePerPiece: 0.013, pricePerBag: 130 },
];

async function main() {
  console.log('🔐 Login...');
  const auth = await api('POST', '/auth/login', { login: 'admin', password: 'admin123' });
  const token = auth.token;
  if (!token) throw new Error('Token olinmadi');
  console.log('✅ Login OK\n');

  console.log('📋 Mavjud mahsulotlar tekshirilmoqda...');
  const resp = await api('GET', '/products?limit=1000', null, token);
  const existing = Array.isArray(resp) ? resp : (resp.data || resp.products || []);
  const existingNames = new Set(existing.map(p => p.name));
  console.log(`📦 ${existing.length} ta mavjud mahsulot\n`);

  console.log(`➕ ${PRODUCTS.length} TA ДКМ MAHSULOT QO'SHILMOQDA...`);
  let created = 0, skipped = 0, failed = 0;

  for (const p of PRODUCTS) {
    if (existingNames.has(p.name)) {
      console.log(`   ⏭️  O'tkazib yuborildi (mavjud): "${p.name}"`);
      skipped++;
      continue;
    }
    try {
      await api('POST', '/products', {
        name: p.name,
        bagType: p.bagType,
        warehouse: p.warehouse,
        unitsPerBag: p.unitsPerBag,
        currentStock: p.currentStock,
        pricePerBag: p.pricePerBag,
        pricePerPiece: p.pricePerPiece,
        minStockLimit: 0,
        optimalStock: 0,
        maxCapacity: 0,
        isParent: false,
      }, token);
      console.log(`   ✅ Yaratildi: "${p.name}"`);
      created++;
    } catch (e) {
      console.log(`   ❌ "${p.name}" — ${e.message}`);
      failed++;
    }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ Yaratildi  : ${created} ta`);
  console.log(`⏭️  O'tkazildi : ${skipped} ta`);
  console.log(`❌ Xatoliklar : ${failed} ta`);
  console.log(`═══════════════════════════════════════════`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
