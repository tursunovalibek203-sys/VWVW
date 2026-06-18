// Barcha mahsulotlarni o'chirib, yangilarini qo'shish
// node scripts/reset-products.mjs
// 30.06.2026 qoldiqlari asosida

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

// ── MAHSULOTLAR RO'YXATI ──────────────────────────────────────────────────────
// bagType: KAPSULA | KRISHKA | RUCHKA
// warehouse: kapsula | krishka | ruchka
// currentStock: qop soni  →  route currentUnits = currentStock × unitsPerBag hisoblab qo'yadi
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ═══════════════════════════════════════════════
  //  КАПСУЛА 15 гр  (qop = 20 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 15 гр праэрач', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:20000, currentStock:31 },
  { name:'Капсула 15 гр гидро',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:20000, currentStock:0  },
  { name:'Капсула 15 гр синий',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:20000, currentStock:0  },
  { name:'Капсула 15 гр sprite',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:20000, currentStock:0  },
  { name:'Капсула 15 гр қизил',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:20000, currentStock:0  },
  { name:'Капсула 15 гр кора',    bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:20000, currentStock:1  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 21 гр  (qop = 15 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 21 гр праэрач', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:15000, currentStock:1  },
  { name:'Капсула 21 гр гидро',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:15000, currentStock:14 },
  { name:'Капсула 21 гр синий',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:15000, currentStock:1  },
  { name:'Капсула 21 гр sprite',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:15000, currentStock:1  },
  { name:'Капсула 21 гр ёд',      bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:15000, currentStock:0  },
  { name:'Капсула 21 гр октош',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:15000, currentStock:11 },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 26 гр ёг  (qop = 12 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 26 гр ёг',      bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:12000, currentStock:3  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 30 гр  (qop = 10 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 30 гр праэрач', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:10000, currentStock:4  },
  { name:'Капсула 30 гр гидро',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:10000, currentStock:10 },
  { name:'Капсула 30 гр sprite',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:10000, currentStock:1  },
  { name:'Капсула 30 гр синий',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:10000, currentStock:0  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 36 гр ёг  (qop = 10 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 36 гр ёг',      bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:10000, currentStock:5  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 52 гр  (qop = 6 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 52 гр праэрач', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:6000,  currentStock:32 },
  { name:'Капсула 52 гр ок',      bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:6000,  currentStock:8  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 70 гр  (qop = 4 500)
  // ═══════════════════════════════════════════════
  { name:'Капсула 70 гр праэрач', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4500,  currentStock:0  },
  { name:'Капсула 70 гр гидро',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4500,  currentStock:0  },
  { name:'Капсула 70 гр сайхун',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4500,  currentStock:0  },
  { name:'Капсула 70 гр синий',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4500,  currentStock:9  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 75 гр  (qop = 4 000 yoki 3 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 75 гр праэрач 4000', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:11 },
  { name:'Капсула 75 гр сайхун 4000',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:0  },
  { name:'Капсула 75 гр гидро 4000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:0  },
  { name:'Капсула 75 гр гидро 3000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:0  },
  { name:'Капсула 75 гр синий 4000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:13 },
  { name:'Капсула 75 гр синий 3000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:0  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 80 гр  (qop = 4 000 yoki 3 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 80 гр праэрач 4000', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:1  },
  { name:'Капсула 80 гр праэрач 3000', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:1  },
  { name:'Капсула 80 гр гидро 4000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:3  },
  { name:'Капсула 80 гр гидро 3000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:0  },
  { name:'Капсула 80 гр сайхун 4000',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:0  },
  { name:'Капсула 80 гр сайхун 3000',  bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:0  },
  { name:'Капсула 80 гр синий 4000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:0  },
  { name:'Капсула 80 гр синий 3000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:0  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 85 гр  (qop = 3 000 / 4 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 85 гр праэрач 3000', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:3000, currentStock:0  },
  { name:'Капсула 85 гр праэрач 4000', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:0  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 86 гр  (qop = 4 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 86 гр праэрач', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:33 },
  { name:'Капсула 86 гр синий',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:4000, currentStock:9  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 135 гр  (qop = 2 500 / 2 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 135 гр праэрач',      bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2500, currentStock:0  },
  { name:'Капсула 135 гр гидро',        bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2500, currentStock:0  },
  { name:'Капсула 135 гр сайхун',       bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2500, currentStock:4  },
  { name:'Капсула 135 гр синий 2500',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2500, currentStock:22 },
  { name:'Капсула 135 гр синий 2000',   bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2000, currentStock:0  },

  // ═══════════════════════════════════════════════
  //  КАПСУЛА 250 гр  (qop = 2 000)
  // ═══════════════════════════════════════════════
  { name:'Капсула 250 гр синий', bagType:'KAPSULA', warehouse:'kapsula', unitsPerBag:2000, currentStock:2  },

  // ════════════════════════════════════════════════════════════════
  //  КРИШКА 38мм  (qop = 3 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Кришка 38 ок',     bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:14 },
  { name:'Кришка 38 кук',    bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:40 },
  { name:'Кришка 38 сайхун', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:23 },
  { name:'Кришка 38 қизил',  bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:39 },
  { name:'Кришка 38 яшил',   bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:5  },
  { name:'Кришка 38 сарик',  bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:3000, currentStock:33 },

  // ════════════════════════════════════════════════════════════════
  //  РУЧКА 38мм  (qop = 2 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Ручка 38 ок',     bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:2000, currentStock:4  },
  { name:'Ручка 38 кук',    bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:2000, currentStock:33 },
  { name:'Ручка 38 сайхун', bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:2000, currentStock:17 },
  { name:'Ручка 38 қизил',  bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:2000, currentStock:17 },
  { name:'Ручка 38 яшил',   bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:2000, currentStock:21 },
  { name:'Ручка 38 сарик',  bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:2000, currentStock:91 },

  // ════════════════════════════════════════════════════════════════
  //  КРИШКА 48мм  (qop = 2 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Кришка 48 ок',      bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:0  },
  { name:'Кришка 48 кук',     bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:11 },
  { name:'Кришка 48 сайхун',  bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:6  },
  { name:'Кришка 48 галубой', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:2  },
  { name:'Кришка 48 қизил',   bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:22 },
  { name:'Кришка 48 апелсин', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:12 },
  { name:'Кришка 48 яшил',    bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:10 },
  { name:'Кришка 48 сарик',   bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:27 },

  // ════════════════════════════════════════════════════════════════
  //  РУЧКА 48мм  (qop = 1 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Ручка 48 ок',      bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:0   },
  { name:'Ручка 48 кук',     bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:46  },
  { name:'Ручка 48 сайхун',  bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:5   },
  { name:'Ручка 48 галубой', bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:19  },
  { name:'Ручка 48 қизил',   bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:4   },
  { name:'Ручка 48 апелсин', bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:125 },
  { name:'Ручка 48 сарик',   bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:81  },

  // ════════════════════════════════════════════════════════════════
  //  КРИШКА 55мм  (qop = 1 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Кришка 55 СН', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:1000, currentStock:131 },
  { name:'Кришка 55 Пр', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:1000, currentStock:5   },

  // ════════════════════════════════════════════════════════════════
  //  ОЙБЕК ПЛАСТ ГАВЛИ КР28  (qop = 6 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Ойбек пласт гавли КР28 ОҚ',       bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:0   },
  { name:'Ойбек пласт гавли КР28 КУК',       bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:0   },
  { name:'Ойбек пласт гавли КР28 ГАЛУБОЙ',   bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:118 },
  { name:'Ойбек пласт гавли КР28 ҚИЗИЛ',     bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:32  },
  { name:'Ойбек пласт гавли КР28 ЯШ',        bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:23  },
  { name:'Ойбек пласт гавли КР28 САРИҚ',     bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:84  },
  { name:'Ойбек пласт гавли КР28 галубой-2', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:6000, currentStock:19  },

  // ════════════════════════════════════════════════════════════════
  //  КР 48 ДОНЯ  (qop = 2 000)
  // ════════════════════════════════════════════════════════════════
  { name:'КР 48 ДОНЯ', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:2000, currentStock:8 },

  // ════════════════════════════════════════════════════════════════
  //  КР28 ГАЗСИЗ LUX PET PLAST  (qop = 5 000)
  // ════════════════════════════════════════════════════════════════
  { name:'КР28 БЕЗ ГАЗ ЭВИТА',   bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:39 },
  { name:'КР28 БЕЗ ГАЗ САЙХУН',  bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:28 },
  { name:'КР28 БЕЗ ГАЗ ГАЛУБОЙ', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:71 },

  // ════════════════════════════════════════════════════════════════
  //  КР28 ГАЗЛИК LUX PET PLAST  (qop = 5 000)
  // ════════════════════════════════════════════════════════════════
  { name:'КР28 ГАЗЛИК ҚОРА',  bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:19 },
  { name:'КР28 ГАЗЛИК ҚИЗИЛ', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:0  },

  // ════════════════════════════════════════════════════════════════
  //  КР48 БУНЁДКОР  (qop = 5 000)
  // ════════════════════════════════════════════════════════════════
  { name:'КР48 БУНЁДКОР', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:5000, currentStock:45 },

  // ════════════════════════════════════════════════════════════════
  //  КР55  (qop = 1 000)
  // ════════════════════════════════════════════════════════════════
  { name:'КР55 Оқ', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:1000, currentStock:6 },

  // ════════════════════════════════════════════════════════════════
  //  РУ 28  (qop = 5 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Ру 28 ҚИЗИЛ', bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:5000, currentStock:21 },
  { name:'Ру 28 сарик',  bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:5000, currentStock:21 },

  // ════════════════════════════════════════════════════════════════
  //  РУЧКА 15Л  (qop = 1 000)
  // ════════════════════════════════════════════════════════════════
  { name:'15 л ручка кук',   bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:21 },
  { name:'15 л ручка қизил', bagType:'RUCHKA', warehouse:'ruchka', unitsPerBag:1000, currentStock:6  },

  // ════════════════════════════════════════════════════════════════
  //  ТАРЕЛПЛАСТ  (qop = 7 000)
  // ════════════════════════════════════════════════════════════════
  { name:'Тарелпласт кр гавли 28', bagType:'KRISHKA', warehouse:'krishka', unitsPerBag:7000, currentStock:50 },
];

// ── ASOSIY FUNKSIYA ───────────────────────────────────────────────────────────
async function main() {
  console.log('🔐 Login...');
  const auth = await api('POST', '/auth/login', { login: 'admin', password: 'admin123' });
  const token = auth.token;
  if (!token) throw new Error('Token olinmadi');
  console.log('✅ Login OK\n');

  // 1. Barcha mavjud mahsulotlarni olish
  console.log('📋 Mavjud mahsulotlar yuklanmoqda...');
  const resp = await api('GET', '/products?limit=1000', null, token);
  const existing = Array.isArray(resp) ? resp : (resp.data || resp.products || []);
  console.log(`📦 ${existing.length} ta mahsulot topildi\n`);

  // 2. Barcha mahsulotlarni o'chirish
  if (existing.length > 0) {
    console.log('🗑️  BARCHA MAHSULOTLAR O\'CHIRILMOQDA...');
    let deleted = 0, failedDel = 0;
    for (const p of existing) {
      try {
        await api('DELETE', `/products/${p.id}`, null, token);
        process.stdout.write(`\r   O'chirildi: ${++deleted}/${existing.length}  `);
      } catch (e) {
        process.stdout.write(`\n   ❌ O'chirilmadi: "${p.name}" — ${e.message}\n`);
        failedDel++;
      }
    }
    console.log(`\n✅ O'chirildi: ${deleted} ta  |  ❌ Xatolik: ${failedDel} ta\n`);
  }

  // 3. Yangi mahsulotlarni yaratish
  console.log(`➕ ${PRODUCTS.length} TA YANGI MAHSULOT YARATILMOQDA...`);
  let created = 0, failedCre = 0;

  for (const p of PRODUCTS) {
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
      process.stdout.write(`\r   Yaratildi: ${++created}/${PRODUCTS.length}  `);
    } catch (e) {
      process.stdout.write(`\n   ❌ "${p.name}" — ${e.message}\n`);
      failedCre++;
    }
  }

  console.log(`\n\n═══════════════════════════════════════════`);
  console.log(`✅ Yaratildi  : ${created} ta`);
  console.log(`❌ Xatoliklar : ${failedCre} ta`);
  console.log(`📦 Jami qop   : 1 419 ta (hujjat bo'yicha)`);
  console.log(`═══════════════════════════════════════════`);
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
