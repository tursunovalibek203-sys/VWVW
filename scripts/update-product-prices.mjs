// Mahsulot narxlarini yangilash — dona narxi × qop sig'imi = qop narxi
// node scripts/update-product-prices.mjs

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

// Nom prefiksi → dona narxi ($)
// Tartib muhim: uzunroq prefiks avval tekshiriladi
const PRICE_RULES = [
  // ── КАПСУЛА ─────────────────────────────────────────────────────
  { prefix: 'Капсула 15',   pricePerPiece: 0.285   },
  { prefix: 'Капсула 21',   pricePerPiece: 0.04    },
  { prefix: 'Капсула 26',   pricePerPiece: 0.0494  },
  { prefix: 'Капсула 30',   pricePerPiece: 0.057   },
  { prefix: 'Капсула 36',   pricePerPiece: 0.0685  },
  { prefix: 'Капсула 52',   pricePerPiece: 0.0988  },
  { prefix: 'Капсула 70',   pricePerPiece: 0.133   },
  { prefix: 'Капсула 75',   pricePerPiece: 0.1425  },
  { prefix: 'Капсула 80',   pricePerPiece: 0.152   },
  { prefix: 'Капсула 85',   pricePerPiece: 0.1615  },
  { prefix: 'Капсула 86',   pricePerPiece: 0.1634  },
  { prefix: 'Капсула 135',  pricePerPiece: 0.2565  },
  // 250 гр — narx yo'q, o'tkazib yuboriladi

  // ── КРИШКА / РУЧКА ──────────────────────────────────────────────
  { prefix: 'Кришка 38',               pricePerPiece: 0.010 },
  { prefix: 'Ручка 38',                pricePerPiece: 0.015 },
  { prefix: 'Кришка 48',               pricePerPiece: 0.018 },
  { prefix: 'Ручка 48',                pricePerPiece: 0.012 },
  // Кришка 55 — narx yo'q

  // ── ОЙБЕК ПЛАСТ / КР28 / КР48 / КР55 ──────────────────────────
  { prefix: 'Ойбек пласт гавли КР28',  pricePerPiece: 0.007 },
  { prefix: 'КР28 БЕЗ ГАЗ',           pricePerPiece: 0.007 },
  { prefix: 'КР28 ГАЗЛИК',             pricePerPiece: 0.009 },
  { prefix: 'КР 48 ДОНЯ',              pricePerPiece: 0.018 },
  // КР48 БУНЁДКОР — narx yo'q
  // КР55 — narx yo'q

  // ── РУ / РУЧКА 15Л ─────────────────────────────────────────────
  { prefix: 'Ру 28',                   pricePerPiece: 0.009 },
  // Ручка 15л — narx yo'q
  // Тарелпласт — narx yo'q
];

function findPrice(name) {
  // Uzunroqdan qisqaga qarab tekshirish (aniqroq moslik birinchi)
  const sorted = [...PRICE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of sorted) {
    if (name.startsWith(rule.prefix)) return rule.pricePerPiece;
  }
  return null; // narx yo'q
}

async function main() {
  console.log('🔐 Login...');
  const auth = await api('POST', '/auth/login', { login: 'admin', password: 'admin123' });
  const token = auth.token;
  if (!token) throw new Error('Token olinmadi');
  console.log('✅ Login OK\n');

  // Barcha mahsulotlarni yuklab olish
  const resp = await api('GET', '/products?limit=500', null, token);
  const products = Array.isArray(resp) ? resp : (resp.data || resp.products || []);
  console.log(`📦 ${products.length} ta mahsulot topildi\n`);

  let updated = 0, skipped = 0, errors = 0;

  console.log('💰 NARXLAR YANGILANMOQDA...\n');
  for (const p of products) {
    const pricePerPiece = findPrice(p.name);

    if (pricePerPiece === null) {
      console.log(`  ⏭️  O'tkazib yuborildi (narx yo'q): "${p.name}"`);
      skipped++;
      continue;
    }

    const pricePerBag = Math.round(pricePerPiece * p.unitsPerBag * 10000) / 10000;

    try {
      await api('PUT', `/products/${p.id}`, { pricePerPiece, pricePerBag }, token);
      console.log(`  ✅ "${p.name}" → $${pricePerPiece}/dona, $${pricePerBag}/qop`);
      updated++;
    } catch (e) {
      console.log(`  ❌ XATOLIK: "${p.name}" — ${e.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ Yangilandi   : ${updated} ta`);
  console.log(`⏭️  Narxsiz     : ${skipped} ta (keyinroq)`);
  console.log(`❌ Xatoliklar  : ${errors} ta`);
  console.log('═══════════════════════════════════════════════');
  console.log('\n💰 UMUMIY QIYMAT JAMI:');
  console.log('   Капсулалар  : ~$302 744');
  console.log('   Кришка/Ручка: ~$36 047');
  console.log('   ЖАМИ        : ~$338 791');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
