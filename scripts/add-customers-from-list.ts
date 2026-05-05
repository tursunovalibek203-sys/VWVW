import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Mijozlarni qo\'shish...');

  // Dollar mijozlari (1-fayl)
  const dollarCustomers = [
    'Фахри ака ег',
    'Мухташам оил',
    'Охун ег',
    'Шахи ег-Гиждувон',
    'Шахи ег-Бухоро',
    'Шахи ег-Тошкент 1111',
    'Шамси ег-Тошкент яшил',
    'Фарход-Шамси',
    'Уткир ака ёг',
    'Туйка ака Морс',
    'Eco Water',
    'Баликчи масла завод',
    'Охангарон масло завод',
    'Косон масло завод',
    'Жонибек Нукус-Муздек сум',
    'Шухрат ака Тоткент',
    'Обидхон ака НАМАНГАН',
    'Фаррух ака Ромитан',
    'Ифтихор Андижон',
    'Бахром ака Шахрисабз',
    'Мумин ака Морс',
    'Aquarius',
    'Шерзод ака Кукон',
    'БЕКАЖОН',
    'EVER-MAC CALDO',
    'Daily',
    'Atlantis',
    'Фарход Эллик калъа',
    'Навоий-Solis',
    'Навоий-Paxtachi',
    'ZAM-ZAM',
    'Абдусамад',
    'Элёр гел',
    'Emir water',
    'Равшан ака Бухоро',
    'Хамдам гел',
    'Кузи ожизлар',
    'Himolife',
    'Зохид ака выдувной',
    'Aqua Gold',
    'ZILOL SUV',
    'Smart',
    'Мохи аъло',
    'Мухтор ота',
    'Ecolife-Кахрамон',
    'Termiz 8881',
    'Шохжахон Карши',
    'Жондор гел Сухроб ака',
    'VeVa',
    'Дилшод-Астарбоб',
    'Али Навоий капсула',
    'Абдувохид ака',
    'Охунни жураси-Саид ака',
    'Термиз 77-27 Музаффар ака',
    'Хуршид ака масло завод',
    'Миша ака',
    'Азиз ака Шахрисабз',
    'Мурод ака Маргилон',
    'Ганишер ака Карши',
    'Файзулло Борига барака',
    'Карши гел-Бек ака',
    'Зангиота-Сирож',
    'Феруз ака Карши',
    'Фахриддин ака водий',
    'Хоразм-Дилшод ака',
    'Хоразм Шавкат ака',
    'Навоий гел',
    'Олот ёг',
    'Fis',
    'Нукус янги клиент',
    'ТОТКЕНТ СОВУН',
    'Садбарг',
    'Е-вита',
    'Гиждувон-КУКУРУЗ',
    'Тожигистон Салих ака',
    'Sof water'
  ];

  // So'm mijozlari (2-fayl)
  const sumCustomers = [
    'Пешку масло завод',
    'Гиждувон масло завод',
    'Чимбой масло завод',
    'Сардоба масло завод',
    'Султон масло завод',
    'Наманган тола текстил',
    'Амиробод',
    'Magiс',
    'Равшан ака Карши',
    'Мансур ака Карши',
    'Карши Бренд пакет',
    'Oqtosh mineral',
    'Dafane',
    'LONG WATER',
    'Хисрав Самарканд',
    'Alyaska water',
    'Жавохир-Veva жураси',
    'Yagona water',
    'Нур ватер',
    'Safis suv',
    'Шукур ака Карши',
    'Doctor water',
    'Зарафшон Бобур',
    'Уйгун Шеробод',
    'Мирали ака',
    'Пойтахт сув',
    'Акбархон Шавкат сирё',
    'качоклар',
    'Тош акани доммоти',
    'Мухаммад-Булвар',
    'Endeles',
    'Собир ака Термиз',
    'Dream water',
    'Озод ака Термиз',
    'Водийлик тогоча',
    'Сирдарё 5-10л',
    'Осиё',
    'Сирдарё 90.107-00-47',
    'Каттакургон 5-10',
    'Ал-Бухорий 5-10 Сайхун',
    'Навоий Акмал ака',
    'Вохид РМЗ',
    'Туйка ака жиянлари',
    'Шахноза опа ёд',
    'Мухриддин Учкудук',
    'Келес 30-43',
    'Самарканд 39-40',
    'Мухри Золотая вода',
    'Жиззах-Галлаорол',
    'Азиз Шофиркон',
    'Бобомурод ака Зарафшон',
    'Лазиз ака Навоий',
    'Акбар Каттакургон',
    'Жиззах Манас пост',
    'Shabnam silver',
    'MILTER',
    'Тошкент Келес',
    'Нурали',
    'Dr.water',
    'Dunyo',
    'Чиноз'
  ];

  let created = 0;
  let updated = 0;

  // Dollar mijozlarini qo'shish
  for (const name of dollarCustomers) {
    const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@dollar.com`;
    const existing = await prisma.customer.findUnique({
      where: { email }
    });

    if (existing) {
      await prisma.customer.update({
        where: { email },
        data: {
          category: 'VIP',
          balance: 0,
          debt: 0
        }
      });
      updated++;
    } else {
      await prisma.customer.create({
        data: {
          name,
          email,
          phone: '+99890000000',
          category: 'VIP',
          balance: 0,
          debt: 0
        }
      });
      created++;
    }
  }

  // So'm mijozlarini qo'shish
  for (const name of sumCustomers) {
    const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sum.com`;
    const existing = await prisma.customer.findUnique({
      where: { email }
    });

    if (existing) {
      await prisma.customer.update({
        where: { email },
        data: {
          category: 'NORMAL',
          balance: 0,
          debt: 0
        }
      });
      updated++;
    } else {
      await prisma.customer.create({
        data: {
          name,
          email,
          phone: '+99890000000',
          category: 'NORMAL',
          balance: 0,
          debt: 0
        }
      });
      created++;
    }
  }

  console.log(`✅ ${created} ta yangi mijoz qo'shildi`);
  console.log(`✅ ${updated} ta mijoz yangilandi`);
  console.log(`🎉 Jami: ${dollarCustomers.length + sumCustomers.length} ta mijoz`);
  console.log(`   - Dollar mijozlari: ${dollarCustomers.length} ta (VIP)`);
  console.log(`   - So'm mijozlari: ${sumCustomers.length} ta (NORMAL)`);
}

main()
  .catch((e) => {
    console.error('❌ Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
