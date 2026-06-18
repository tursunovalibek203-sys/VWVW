// Mijozlar USD qarzini o'rnatish - Dollar bo'limi 30.06.2026
// node scripts/set-customer-debts.mjs

const BASE = 'https://luxpetplast-api.onrender.com/api';

const CUSTOMERS = [
  { name: 'Фахри ака ег', debtUSD: 7941 },
  { name: 'Мухташам оил', debtUSD: 63026 },
  { name: 'Охун ег', debtUSD: 46969 },
  { name: 'Шахи ака ег-Гиждувон', debtUSD: 12396 },
  { name: 'Шахи ег-Секрет', debtUSD: 21996 },
  { name: 'Шахи ака ег-Тошкент 1111', debtUSD: 15207 },
  { name: 'Шамси ака ег-Тошкент домл', debtUSD: 42216 },
  { name: 'Шамси ака-Фарход ака 1125', debtUSD: 0 },
  { name: 'Шамси ака ег-Бухоро', debtUSD: 8000 },
  { name: 'Уткир ака ёг', debtUSD: 0 },
  { name: 'Туйка ака Морс', debtUSD: 33933 },
  { name: 'Eco Water', debtUSD: 113932.6 },
  { name: 'Балиқчи масла завод', debtUSD: 43032 },
  { name: 'Оҳангарон масло завод', debtUSD: 90609 },
  { name: 'Косон масло завод', debtUSD: 10888 },
  { name: 'Жонибек Нукус-Муздек сум', debtUSD: 75660 },
  { name: 'Шухрат ака Тоткент', debtUSD: 4968 },
  { name: 'Обидхон ака НАМАНГАН', debtUSD: 59916 },
  { name: 'Фаррух ака Ромитан', debtUSD: 5500 },
  { name: 'Ифтихор Андижон', debtUSD: 7456 },
  { name: 'Бахром ака Шахрисабз', debtUSD: 3110 },
  { name: 'Мумин ака Морс', debtUSD: 68819 },
  { name: 'Aquarius', debtUSD: 24818 },
  { name: 'Шерзод ака Марғилон', debtUSD: 61800.5 },
  { name: 'БЕКАЖОН', debtUSD: 17564 },
  { name: 'EVER-MAC CALDO', debtUSD: 1496 },
  { name: 'Daily', debtUSD: 23451 },
  { name: 'Atlantis', debtUSD: 16735 },
  { name: 'Фарход Эллик қалъа', debtUSD: 2754 },
  { name: 'Навоий-Solis', debtUSD: 3805 },
  { name: 'Навоий-Paxtachi', debtUSD: 4748 },
  { name: 'ZAM-ZAM', debtUSD: 43000 },
  { name: 'Абдусамад', debtUSD: 43399.5 },
  { name: 'Элёр гел', debtUSD: 8205 },
  { name: 'Emir water', debtUSD: 1194 },
  { name: 'Равшан ака Бухоро', debtUSD: 1071.5 },
  { name: 'Ҳамдам гел', debtUSD: 4493.3 },
  { name: 'Кузи ожизлар', debtUSD: 9064.5 },
  { name: 'Himolife', debtUSD: 2529 },
  { name: 'Зоҳид ака выдувной', debtUSD: 9759 },
  { name: 'Aqua Gold', debtUSD: 0 },
  { name: 'ZILOL SUV', debtUSD: 487 },
  { name: 'Smart', debtUSD: 3649.5 },
  { name: 'Моҳи аъло', debtUSD: 5100 },
  { name: 'Мухтор ота', debtUSD: 970 },
  { name: 'Ecolife-Каҳрамон', debtUSD: 672 },
  { name: 'Termiz 8881', debtUSD: 6647 },
  { name: 'Шоҳжаҳон Карши', debtUSD: 8104 },
  { name: 'Жондор гел Сухроб ака', debtUSD: 1456 },
  { name: 'VeVa', debtUSD: 5049 },
  { name: 'Дилшод-Астарбоб', debtUSD: 1080 },
  { name: 'Али Навоий капсула', debtUSD: 0 },
  { name: 'Абдувоҳид ака', debtUSD: 13610.5 },
  { name: 'Охунни жураси-Саид ака', debtUSD: 3456 },
  { name: 'Термиз 77-27 Музаффар ака', debtUSD: 7306 },
  { name: 'Хуршид ака масло завод', debtUSD: 0 },
  { name: 'Миша ака', debtUSD: 14397 },
  { name: 'Азиз ака Шахрисабз', debtUSD: 5008 },
  { name: 'Мурод ака Марғилон', debtUSD: 2700 },
  { name: 'Ганишер ака Карши', debtUSD: 0 },
  { name: 'Файзулло Борига барака', debtUSD: 1592 },
  { name: 'Карши гел-Бек ака', debtUSD: 4861 },
  { name: 'Зангиота-Сирож', debtUSD: 10431 },
  { name: 'Феруз ака Карши', debtUSD: 0 },
  { name: 'Фахриддин ака водий', debtUSD: 38196 },
  { name: 'Хоразм-Дилшод ака', debtUSD: 7314 },
  { name: 'Хоразм Шавкат ака', debtUSD: 3220 },
  { name: 'Навоий гел', debtUSD: 0 },
  { name: 'Олот ёг', debtUSD: 1110 },
  { name: 'Fis', debtUSD: 50 },
  { name: 'Нукус янги клиент', debtUSD: 6798 },
  { name: 'ТОТКЕНТ СОВУН', debtUSD: 0 },
  { name: 'Садбарг', debtUSD: 1971 },
  { name: 'Е-вита', debtUSD: 0 },
  { name: 'Гиждувон-КУКУРУЗ', debtUSD: 0 },
  { name: 'Тожигистон Салих ака', debtUSD: 0 },
  { name: 'Sof water', debtUSD: 0 },
  { name: 'Эркин ака янги йул', debtUSD: 2873 },
  { name: 'GARDEN', debtUSD: 2472 },
  { name: 'Жонибек ака Термиз', debtUSD: 0 },
  { name: 'Barg-Sarvar', debtUSD: 0 },
];

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${r.status} ${t.slice(0, 200)}`);
  }
  return r.json();
}

async function main() {
  // 1. Login
  console.log('🔐 Login...');
  const auth = await api('POST', '/auth/login', { login: 'admin', password: 'admin123' });
  const token = auth.token;
  if (!token) throw new Error('Token olinmadi');
  console.log('✅ Login muvaffaqiyatli');

  // 2. Barcha mijozlarni yuklab olish
  console.log('📋 Mavjud mijozlar yuklanmoqda...');
  let existing = [];
  try {
    const r = await api('GET', '/customers?limit=1000', null, token);
    existing = Array.isArray(r) ? r : (r.data || r.customers || []);
  } catch (e) {
    console.log('⚠️  Mijozlar yuklanmadi, davom etilmoqda...');
  }
  console.log(`✅ ${existing.length} ta mavjud mijoz topildi`);

  let created = 0, updated = 0, errors = 0;

  for (const c of CUSTOMERS) {
    // Nom bo'yicha qidirish (exact first, then partial)
    let found = existing.find(e => e.name === c.name);
    if (!found) {
      // Qisman mos kelish (birinchi 6 ta harf)
      const prefix = c.name.slice(0, 6).toLowerCase();
      found = existing.find(e => e.name && e.name.toLowerCase().startsWith(prefix));
    }

    if (found) {
      // Mavjudni yangilash
      try {
        await api('PUT', `/customers/${found.id}`, { debtUSD: c.debtUSD }, token);
        console.log(`✅ YANGILANDI: "${found.name}" → $${c.debtUSD}`);
        updated++;
      } catch (e) {
        console.log(`❌ Yangilash xatolik: "${c.name}" — ${e.message}`);
        errors++;
      }
    } else {
      // Yangi yaratish
      try {
        const created_c = await api('POST', '/customers', {
          name: c.name,
          phone: '+998000000000',
          category: 'VIP',
        }, token);
        const newId = created_c.id || created_c.customer?.id;
        if (newId) {
          await api('PUT', `/customers/${newId}`, { debtUSD: c.debtUSD }, token);
          console.log(`➕ YARATILDI: "${c.name}" → $${c.debtUSD}`);
          existing.push({ id: newId, name: c.name });
          created++;
        }
      } catch (e) {
        console.log(`❌ Yaratish xatolik: "${c.name}" — ${e.message}`);
        errors++;
      }
    }
  }

  console.log('\n═══════════════════════════════');
  console.log(`✅ Yangilandi : ${updated} ta`);
  console.log(`➕ Yaratildi  : ${created} ta`);
  console.log(`❌ Xatoliklar : ${errors} ta`);
  console.log('═══════════════════════════════');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
