// Yaratilmagan mahsulotlarni tugallash (rate limit dan keyin)
// node scripts/complete-products.mjs

const BASE = 'https://luxpetplast-api.onrender.com/api';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, path, body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status} ${t.slice(0, 200)}`); }
  return r.json().catch(() => ({}));
}

// Yaratilmagan mahsulotlar (rate limit tufayli o'tkazib yuborilganlar)
const MISSING = [
  { name:'Капсула 135 гр сайхун',          bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2500, currentStock:4   },
  { name:'Капсула 135 гр синий 2500',       bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2500, currentStock:22  },
  { name:'Капсула 135 гр синий 2000',       bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2000, currentStock:0   },
  { name:'Капсула 250 гр синий',            bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2000, currentStock:2   },
  { name:'Кришка 38 кук',                   bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:40  },
  { name:'Кришка 38 сарик',                 bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:33  },
  { name:'Ручка 38 ок',                     bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:2000, currentStock:4   },
  { name:'Ручка 38 кук',                    bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:2000, currentStock:33  },
  { name:'Ручка 38 қизил',                  bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:2000, currentStock:17  },
  { name:'Ручка 38 яшил',                   bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:2000, currentStock:21  },
  { name:'Ручка 38 сарик',                  bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:2000, currentStock:91  },
  { name:'Кришка 48 ок',                    bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:0   },
  { name:'Кришка 48 сайхун',                bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:6   },
  { name:'Кришка 48 галубой',               bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:2   },
  { name:'Кришка 48 қизил',                 bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:22  },
  { name:'Кришка 48 апелсин',               bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:12  },
  { name:'Кришка 48 сарик',                 bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:27  },
  { name:'Ручка 48 ок',                     bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:0   },
  { name:'Ручка 48 кук',                    bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:46  },
  { name:'Ручка 48 сайхун',                 bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:5   },
  { name:'Ручка 48 галубой',                bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:19  },
  { name:'Ручка 48 қизил',                  bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:4   },
  { name:'Ручка 48 апелсин',                bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:125 },
  { name:'Ручка 48 сарик',                  bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:81  },
  { name:'Кришка 55 СН',                    bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:1000, currentStock:131 },
  { name:'Ойбек пласт гавли КР28 КУК',      bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:0   },
  { name:'Ойбек пласт гавли КР28 ГАЛУБОЙ',  bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:118 },
  { name:'Ойбек пласт гавли КР28 ЯШ',       bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:23  },
  { name:'Ойбек пласт гавли КР28 САРИҚ',    bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:84  },
  { name:'КР 48 ДОНЯ',                      bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:8   },
  { name:'КР28 БЕЗ ГАЗ ЭВИТА',              bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:39  },
  { name:'КР28 БЕЗ ГАЗ САЙХУН',             bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:28  },
  { name:'КР28 ГАЗЛИК ҚИЗИЛ',               bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:0   },
  { name:'КР55 Оқ',                         bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:1000, currentStock:6   },
  { name:'Ру 28 ҚИЗИЛ',                     bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:5000, currentStock:21  },
  { name:'15 л ручка қизил',               bagType:'RUCHKA',  warehouse:'ruchka',  unitsPerBag:1000, currentStock:6   },
  { name:'Тарелпласт кр гавли 28',          bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:7000, currentStock:50  },
];

async function main() {
  console.log('🔐 Login...');
  const auth = await api('POST', '/auth/login', { login: 'admin', password: 'admin123' });
  const token = auth.token;
  if (!token) throw new Error('Token olinmadi');
  console.log('✅ Login OK\n');

  // Mavjud mahsulotlarni yuklab nomi bo'yicha set qilamiz
  const resp = await api('GET', '/products?limit=1000', null, token);
  const existing = Array.isArray(resp) ? resp : (resp.data || resp.products || []);
  const existingNames = new Set(existing.map(p => p.name));
  console.log(`📦 Hozir ${existing.length} ta mahsulot bor\n`);

  let created = 0, skipped = 0, errors = 0;
  console.log(`➕ ${MISSING.length} ta mahsulot yaratilmoqda (3 soniya oraliq bilan)...\n`);

  for (let i = 0; i < MISSING.length; i++) {
    const p = MISSING[i];

    if (existingNames.has(p.name)) {
      console.log(`  ⏭️  Allaqachon bor: "${p.name}"`);
      skipped++;
      continue;
    }

    try {
      await api('POST', '/products', {
        name:         p.name,
        bagType:      p.bagType,
        warehouse:    p.warehouse,
        unitsPerBag:  p.unitsPerBag,
        currentStock: p.currentStock,
        pricePerBag:  0,
        pricePerPiece: 0,
        minStockLimit: 0,
        optimalStock:  0,
        maxCapacity:   0,
        isParent:      false,
      }, token);
      console.log(`  ✅ [${i+1}/${MISSING.length}] "${p.name}"`);
      created++;
    } catch (e) {
      console.log(`  ❌ "${p.name}" — ${e.message}`);
      errors++;
    }

    // Rate limit dan saqlanish uchun 3 soniya kutish
    if (i < MISSING.length - 1) await sleep(3000);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`✅ Yaratildi  : ${created} ta`);
  console.log(`⏭️  O'tkazildi : ${skipped} ta (allaqachon bor)`);
  console.log(`❌ Xatoliklar : ${errors} ta`);
  console.log('═══════════════════════════════════════════');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
