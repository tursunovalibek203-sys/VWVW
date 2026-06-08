import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../utils/prisma';
import { OrderWorkflow } from '../services/order-workflow';
import { createCustomerTopic } from '../utils/telegram-forum';

let customerBot: TelegramBot | null = null;

export function initCustomerBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.log('⚠️ Customer bot token not found');
    return null;
  }

  try {
    customerBot = new TelegramBot(token, { polling: true });
    setupCustomerCommands();
    console.log('👥 Customer Bot ishga tushdi!');
    return customerBot;
  } catch (error) {
    console.error('Customer Bot xatolik:', error);
    return null;
  }
}

function setupCustomerCommands() {
  if (!customerBot) return;

  // Start komandasi
  customerBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Allaqachon ulangan mijozni tekshirish
    const existing = await prisma.customer.findFirst({
      where: { telegramChatId: chatId.toString() }
    });

    if (existing) {
      await sendMainMenu(chatId, existing.name);
      return;
    }

    // Yangi foydalanuvchi — telefon raqam so'rash
    await customerBot?.sendMessage(
      chatId,
      '👋 *Xush kelibsiz!*\n\nTizimga kirish uchun telefon raqamingizni yuboring\\. Bot sizni mijozlar ro\'yxatidan topib ulaydi\\.',
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          keyboard: [
            [{ text: '📱 Telefon raqamni yuborish', request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
  });

  // Telefon raqam qabul qilish va mijozni ulash
  customerBot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;
    if (!contact) return;

    const phone = contact.phone_number.replace(/\D/g, '');

    // Telefon raqam bo'yicha mijozni qidirish (oxirgi 9 raqam bo'yicha)
    const allCustomers = await prisma.customer.findMany({
      where: { telegramChatId: null }
    });

    const matched = allCustomers.find(c => {
      const dbPhone = c.phone.replace(/\D/g, '');
      return dbPhone.endsWith(phone.slice(-9)) || phone.endsWith(dbPhone.slice(-9));
    });

    if (matched) {
      // Mavjud mijozga Telegram ulash
      await prisma.customer.update({
        where: { id: matched.id },
        data: {
          telegramChatId: chatId.toString(),
          telegramUsername: msg.from?.username || matched.telegramUsername || undefined
        }
      });

      // Forum topicni avtomatik yaratish
      createCustomerTopic(matched.id).catch(err =>
        console.error('Topic yaratishda xatolik:', err)
      );

      await sendMainMenu(chatId, matched.name);
      console.log(`✅ Mijoz ulandi: ${matched.name} (${chatId})`);
    } else {
      // Yangi mijoz yaratish
      const newCustomer = await prisma.customer.create({
        data: {
          name: `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim() || 'Yangi mijoz',
          phone: `+${phone}`,
          telegramChatId: chatId.toString(),
          telegramUsername: msg.from?.username || '',
          category: 'NEW'
        }
      });

      createCustomerTopic(newCustomer.id).catch(err =>
        console.error('Topic yaratishda xatolik:', err)
      );

      await sendMainMenu(chatId, newCustomer.name);
      console.log(`✅ Yangi mijoz yaratildi: ${newCustomer.name} (${chatId})`);
    }
  });

  // Komandalar
  customerBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Telefon yuborish (contact) — yuqoridagi handler ushlaydi
    if (msg.contact) return;

    // Ulanmagan foydalanuvchilar uchun — telefon so'rash
    const linked = await prisma.customer.findFirst({
      where: { telegramChatId: chatId.toString() }
    });
    if (!linked && text !== '/start') {
      await customerBot?.sendMessage(
        chatId,
        '📱 Iltimos, avval telefon raqamingizni yuboring.',
        {
          reply_markup: {
            keyboard: [
              [{ text: '📱 Telefon raqamni yuborish', request_contact: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
      return;
    }

    if (text === '🛒 Buyurtma berish' || text === '/orders') {
      await handleNewOrder(chatId);
    } else if (text === '💰 Balans' || text === '/balance') {
      await handleBalance(chatId);
    } else if (text === '📊 Mening sotuvlarim' || text === '/history') {
      await handleSalesHistory(chatId);
    } else if (text === '📋 Katalog' || text === '/catalog') {
      await handleCatalog(chatId);
    } else if (text === '👤 Profil' || text === '/profile') {
      await handleProfile(chatId);
    } else if (text === '❓ Yordam' || text === '/help') {
      await handleCustomerHelp(chatId);
    }
  });

  // Callback query handler
  customerBot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data) return;

    try {
      if (data.startsWith('product_')) {
        const productId = data.replace('product_', '');
        await handleProductSelect(chatId, productId, query.id, query.message?.message_id);
      } else if (data.startsWith('add_cart_')) {
        const [, productId, quantity] = data.split('_');
        await handleAddToCart(chatId, productId, parseInt(quantity), query.id);
      } else if (data.startsWith('custom_quantity_')) {
        const productId = data.replace('custom_quantity_', '');
        await handleCustomQuantity(chatId, productId, query.id);
      } else if (data === 'view_cart') {
        await handleViewCart(chatId, query.id);
      } else if (data === 'confirm_order') {
        await handleConfirmOrder(chatId, query.id);
      } else if (data === 'cancel_order') {
        await handleCancelOrder(chatId, query.id);
      } else if (data === 'clear_cart') {
        await handleClearCart(chatId, query.id);
      }
    } catch (error) {
      console.error('Customer bot callback error:', error);
    }
  });
}

// Asosiy menyu yuborish
async function sendMainMenu(chatId: number, name: string) {
  const msg =
    `👋 *Xush kelibsiz, ${name}\\!*\n\n` +
    `📱 Buyurtma berish\n` +
    `💰 Balans va qarzlar\n` +
    `📊 Sotuvlar tarixi\n\n` +
    `Tugmalardan foydalaning:`;

  await customerBot?.sendMessage(chatId, msg, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      keyboard: [
        [{ text: '🛒 Buyurtma berish' }, { text: '💰 Balans' }],
        [{ text: '📊 Mening sotuvlarim' }, { text: '📋 Katalog' }],
        [{ text: '👤 Profil' }, { text: '❓ Yordam' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

// Mijozni topish yoki yaratish
async function findOrCreateCustomer(chatId: number, from: any) {
  try {
    let customer = await prisma.customer.findFirst({
      where: { telegramChatId: chatId.toString() }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: from?.first_name || 'Telegram User',
          phone: from?.username ? `@${from.username}` : '',
          telegramChatId: chatId.toString(),
          telegramUsername: from?.username || '',
          category: 'NEW'
        }
      });
    }

    return customer;
  } catch (error) {
    console.error('Find/Create customer error:', error);
    throw error;
  }
}

// Yangi buyurtma
async function handleNewOrder(chatId: number) {
  try {
    const products = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      take: 10,
      orderBy: { name: 'asc' }
    });

    if (products.length === 0) {
      await customerBot?.sendMessage(chatId, '😔 Hozircha mavjud mahsulotlar yo\'q');
      return;
    }

    let message = '🛒 **BUYURTMA BERISH**\n\n';
    message += '📦 **Mavjud mahsulotlar:**\n\n';

    const keyboard = [];
    for (let i = 0; i < products.length; i += 2) {
      const row = [];
      row.push({
        text: `${products[i].name} - $${products[i].pricePerBag}`,
        callback_data: `product_${products[i].id}`
      });
      
      if (products[i + 1]) {
        row.push({
          text: `${products[i + 1].name} - $${products[i + 1].pricePerBag}`,
          callback_data: `product_${products[i + 1].id}`
        });
      }
      keyboard.push(row);
    }

    keyboard.push([{ text: '🛒 Savatni ko\'rish', callback_data: 'view_cart' }]);

    await customerBot?.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('New order error:', error);
    await customerBot?.sendMessage(chatId, '❌ Xatolik yuz berdi');
  }
}

// Mahsulot tanlash
async function handleProductSelect(chatId: number, productId: string, queryId: string, messageId?: number) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      await customerBot?.answerCallbackQuery(queryId, { text: 'Mahsulot topilmadi!' });
      return;
    }

    // Savatga qo'shish uchun session yaratish
    const customer = await findCustomerByChatId(chatId);
    if (!customer) return;

    const message = `
📦 **${product.name}**

💰 **Narx:** $${product.pricePerBag} / qop
📊 **Mavjud:** ${product.currentStock} qop
📏 **Qop turi:** ${product.bagType}
📝 **Tavsif:** ${(product as any).description || 'Tavsif yo\'q'}

🛒 **Miqdorni tanlang:**
    `;

    await customerBot?.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '1 qop', callback_data: `add_cart_${productId}_1` },
            { text: '5 qop', callback_data: `add_cart_${productId}_5` },
            { text: '10 qop', callback_data: `add_cart_${productId}_10` }
          ],
          [
            { text: '🔢 Boshqa miqdor', callback_data: `custom_quantity_${productId}` }
          ],
          [
            { text: '⬅️ Orqaga', callback_data: 'back_to_products' }
          ]
        ]
      }
    });

    await customerBot?.answerCallbackQuery(queryId);
  } catch (error) {
    console.error('Product select error:', error);
    await customerBot?.answerCallbackQuery(queryId, { text: 'Xatolik yuz berdi!' });
  }
}

// Balans va qarzlar
async function handleBalance(chatId: number) {
  try {
    const customer = await findCustomerByChatId(chatId);
    if (!customer) {
      await customerBot?.sendMessage(chatId, '❌ Mijoz ma\'lumotlari topilmadi');
      return;
    }

    // Jami sotuvlar va to'lovlar
    const [totalSales, totalPayments, unpaidSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { customerId: customer.id },
        _sum: { totalAmount: true }
      }),
      prisma.sale.aggregate({
        where: { customerId: customer.id },
        _sum: { paidAmount: true }
      }),
      prisma.sale.findMany({
        where: { 
          customerId: customer.id,
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] }
        },
        include: { product: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const totalDebt = (totalSales._sum.totalAmount || 0) - (totalPayments._sum.paidAmount || 0);

    let message = `
💰 **MOLIYAVIY HISOBOT**

👤 **Mijoz:** ${customer.name}
📊 **Kategoriya:** ${customer.category}

💵 **Moliyaviy holat:**
• Jami xaridlar: $${totalSales._sum.totalAmount || 0}
• To'langan: $${totalPayments._sum.paidAmount || 0}
• Qarz: $${totalDebt.toFixed(2)}

${totalDebt > 0 ? '⚠️ **To\'lov kerak!**' : '✅ **Qarz yo\'q**'}
    `;

    if (unpaidSales.length > 0) {
      message += '\n\n📋 **To\'lanmagan sotuvlar:**\n';
      unpaidSales.slice(0, 5).forEach((sale, index) => {
        const debt = sale.totalAmount - sale.paidAmount;
        message += `${index + 1}. ${sale.product?.name} - $${debt.toFixed(2)}\n`;
      });
    }

    await customerBot?.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💳 To\'lov qilish', callback_data: 'make_payment' },
            { text: '📊 Batafsil', callback_data: 'detailed_balance' }
          ],
          [{ text: '🔄 Yangilash', callback_data: 'refresh_balance' }]
        ]
      }
    });
  } catch (error) {
    console.error('Balance error:', error);
    await customerBot?.sendMessage(chatId, '❌ Xatolik yuz berdi');
  }
}

// Sotuvlar tarixi
async function handleSalesHistory(chatId: number) {
  try {
    const customer = await findCustomerByChatId(chatId);
    if (!customer) {
      await customerBot?.sendMessage(chatId, '❌ Mijoz ma\'lumotlari topilmadi');
      return;
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: customer.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (sales.length === 0) {
      await customerBot?.sendMessage(chatId, '📝 Hozircha sotuvlar tarixi yo\'q');
      return;
    }

    let message = '📊 **SOTUVLAR TARIXI**\n\n';

    sales.forEach((sale, index) => {
      const status = sale.paymentStatus === 'PAID' ? '✅' : sale.paymentStatus === 'PARTIAL' ? '🟡' : '❌';
      message += `${index + 1}. ${status} ${sale.product?.name}\n`;
      message += `   💰 Summa: $${sale.totalAmount}\n`;
      message += `   📅 Sana: ${new Date(sale.createdAt).toLocaleDateString()}\n`;
      message += `   📦 Miqdor: ${sale.quantity} qop\n\n`;
    });

    await customerBot?.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 Batafsil hisobot', callback_data: 'detailed_history' },
            { text: '📤 Eksport', callback_data: 'export_history' }
          ],
          [{ text: '🔄 Yangilash', callback_data: 'refresh_history' }]
        ]
      }
    });
  } catch (error) {
    console.error('Sales history error:', error);
    await customerBot?.sendMessage(chatId, '❌ Xatolik yuz berdi');
  }
}

// Katalog
async function handleCatalog(chatId: number) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });

    if (products.length === 0) {
      await customerBot?.sendMessage(chatId, '📝 Hozircha mahsulotlar yo\'q');
      return;
    }

    let message = '📋 **MAHSULOTLAR KATALOGI**\n\n';

    products.forEach((product, index) => {
      const availability = product.currentStock > 0 ? '✅ Mavjud' : '❌ Tugagan';
      message += `${index + 1}. **${product.name}**\n`;
      message += `   💰 Narx: $${product.pricePerBag}\n`;
      message += `   📦 ${availability} (${product.currentStock} qop)\n`;
      message += `   📏 Qop: ${product.bagType}\n\n`;
    });

    await customerBot?.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Buyurtma berish', callback_data: 'start_order' }],
          [{ text: '🔄 Yangilash', callback_data: 'refresh_catalog' }]
        ]
      }
    });
  } catch (error) {
    console.error('Catalog error:', error);
    await customerBot?.sendMessage(chatId, '❌ Xatolik yuz berdi');
  }
}

// Profil
async function handleProfile(chatId: number) {
  try {
    const customer = await findCustomerByChatId(chatId);
    if (!customer) {
      await customerBot?.sendMessage(chatId, '❌ Mijoz ma\'lumotlari topilmadi');
      return;
    }

    const salesCount = await prisma.sale.count({
      where: { customerId: customer.id }
    });

    const message = `
👤 **PROFIL MA'LUMOTLARI**

📝 **Asosiy ma'lumotlar:**
• Ism: ${customer.name}
• Telefon: ${customer.phone || 'Kiritilmagan'}
• Email: ${customer.email || 'Kiritilmagan'}
• Manzil: ${customer.address || 'Kiritilmagan'}

📊 **Statistika:**
• Kategoriya: ${customer.category}
• Sotuvlar soni: ${salesCount} ta
• Ro'yxatdan o'tgan: ${new Date(customer.createdAt).toLocaleDateString()}

📱 **Telegram:**
• Chat ID: ${customer.telegramChatId}
• Username: ${customer.telegramUsername || 'Yo\'q'}
    `;

    await customerBot?.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✏️ Tahrirlash', callback_data: 'edit_profile' },
            { text: '🔄 Yangilash', callback_data: 'refresh_profile' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    await customerBot?.sendMessage(chatId, '❌ Xatolik yuz berdi');
  }
}

// Yordam
async function handleCustomerHelp(chatId: number) {
  const helpMessage = `
❓ **YORDAM**

🛍️ **Mijoz boti** quyidagi imkoniyatlarni taqdim etadi:

🛒 **Buyurtma berish**
• Mahsulotlar katalogini ko'rish
• Savatga qo'shish
• Buyurtma berish

💰 **Moliyaviy ma'lumotlar**
• Balans va qarzlarni ko'rish
• To'lov tarixi
• To'lov qilish

📊 **Sotuvlar tarixi**
• Barcha xaridlaringiz
• Batafsil hisobotlar
• Eksport qilish

👤 **Profil boshqaruvi**
• Ma'lumotlarni ko'rish
• Tahrirlash
• Sozlamalar

📞 **Aloqa:**
• Texnik yordam: @support
• Sotuvlar bo'limi: @sales
• Bosh ofis: +998 XX XXX XX XX

🕐 **Ish vaqti:**
Dushanba-Juma: 9:00-18:00
Shanba: 9:00-14:00
Yakshanba: Dam olish kuni
  `;

  await customerBot?.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown'
  });
}

// Savatcha tizimi
const customerCarts = new Map<number, Array<{
  productId: string;
  productName: string;
  quantity: number;
  pricePerBag: number;
}>>();

// Savatga qo'shish
async function handleAddToCart(chatId: number, productId: string, quantity: number, queryId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      await customerBot?.answerCallbackQuery(queryId, { text: 'Mahsulot topilmadi!' });
      return;
    }

    if (quantity > product.currentStock) {
      await customerBot?.answerCallbackQuery(queryId, { 
        text: `Faqat ${product.currentStock} qop mavjud!` 
      });
      return;
    }

    // Savatga qo'shish
    let cart = customerCarts.get(chatId) || [];
    
    // Mavjud mahsulotni topish
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        productId,
        productName: product.name,
        quantity,
        pricePerBag: product.pricePerBag
      });
    }
    
    customerCarts.set(chatId, cart);

    await customerBot?.answerCallbackQuery(queryId, { 
      text: `✅ ${quantity} qop ${product.name} savatga qo'shildi!` 
    });

    // Savatni ko'rsatish
    await showCartSummary(chatId);

  } catch (error) {
    console.error('Add to cart error:', error);
    await customerBot?.answerCallbackQuery(queryId, { text: 'Xatolik yuz berdi!' });
  }
}

// Savatni ko'rsatish
async function handleViewCart(chatId: number, queryId: string) {
  await showCartSummary(chatId);
  await customerBot?.answerCallbackQuery(queryId);
}

async function showCartSummary(chatId: number) {
  const cart = customerCarts.get(chatId) || [];
  
  if (cart.length === 0) {
    await customerBot?.sendMessage(chatId, '🛒 Savatingiz bo\'sh\n\nMahsulot qo\'shish uchun: /orders');
    return;
  }

  let message = '🛒 **SAVATINGIZ**\n\n';
  let totalAmount = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.quantity * item.pricePerBag;
    totalAmount += itemTotal;
    
    message += `${index + 1}. **${item.productName}**\n`;
    message += `   📦 Miqdor: ${item.quantity} qop\n`;
    message += `   💰 Narx: $${item.pricePerBag} x ${item.quantity} = $${itemTotal}\n\n`;
  });

  message += `💵 **Jami summa: $${totalAmount.toFixed(2)}**`;

  const keyboard = [
    [
      { text: '✅ Buyurtma berish', callback_data: 'confirm_order' },
      { text: '🗑️ Tozalash', callback_data: 'clear_cart' }
    ],
    [
      { text: '➕ Mahsulot qo\'shish', callback_data: 'add_more_products' }
    ]
  ];

  await customerBot?.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

// Buyurtmani tasdiqlash
async function handleConfirmOrder(chatId: number, queryId: string) {
  try {
    const customer = await findCustomerByChatId(chatId);
    if (!customer) {
      await customerBot?.answerCallbackQuery(queryId, { text: 'Mijoz ma\'lumotlari topilmadi!' });
      return;
    }

    const cart = customerCarts.get(chatId) || [];
    if (cart.length === 0) {
      await customerBot?.answerCallbackQuery(queryId, { text: 'Savat bo\'sh!' });
      return;
    }

    // Buyurtma ma'lumotlarini tayyorlash
    const orderData = {
      customerId: customer.id,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        pricePerBag: item.pricePerBag
      })),
      telegramChatId: chatId.toString()
    };

    // Buyurtma workflow'ini ishga tushirish
    const result = await OrderWorkflow.processCustomerOrder(orderData);

    if (result.success) {
      // Savatni tozalash
      customerCarts.delete(chatId);
      
      await customerBot?.answerCallbackQuery(queryId, { text: '✅ Buyurtma muvaffaqiyatli!' });
      
      // Batafsil ma'lumot yuborish
      let statusMessage = `
🎉 **BUYURTMA MUVAFFAQIYATLI!**

📋 **Buyurtma raqami:** ${result.order.orderNumber}
💰 **Jami summa:** $${result.order.totalAmount}

📊 **Mahsulotlar holati:**
`;

      result.stockStatus.forEach((item: any) => {
        const status = item.stockStatus.available ? '✅ Mavjud' : '🏭 Ishlab chiqariladi';
        statusMessage += `• ${item.stockStatus.productName}: ${status}\n`;
      });

      statusMessage += `\n⏳ Buyurtmangiz jarayoni boshlandi. Har bir bosqich haqida xabar beramiz!`;

      await customerBot?.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      
    } else {
      await customerBot?.answerCallbackQuery(queryId, { text: '❌ Buyurtmada xatolik!' });
    }

  } catch (error) {
    console.error('Confirm order error:', error);
    await customerBot?.answerCallbackQuery(queryId, { text: 'Xatolik yuz berdi!' });
  }
}

// Savatni tozalash
async function handleClearCart(chatId: number, queryId: string) {
  customerCarts.delete(chatId);
  await customerBot?.answerCallbackQuery(queryId, { text: '🗑️ Savat tozalandi!' });
  await customerBot?.sendMessage(chatId, '🛒 Savat tozalandi\n\nYangi mahsulot qo\'shish uchun: /orders');
}

// Maxsus miqdor
async function handleCustomQuantity(chatId: number, productId: string, queryId: string) {
  await customerBot?.answerCallbackQuery(queryId, { 
    text: 'Miqdorni yozing (masalan: 15)' 
  });
  
  // Bu yerda foydalanuvchidan miqdor kutish logikasi bo'lishi kerak
  // Hozircha oddiy variant
  await customerBot?.sendMessage(chatId, 
    '🔢 Kerakli miqdorni yozing (raqam):\n\nMasalan: 15'
  );
}

// Yordamchi funksiyalar
async function findCustomerByChatId(chatId: number) {
  return await prisma.customer.findFirst({
    where: { telegramChatId: chatId.toString() }
  });
}

async function handleQuantityChange(chatId: number, productId: string, action: string, queryId: string) {
  // Miqdor o'zgartirish logikasi
  await customerBot?.answerCallbackQuery(queryId, { text: 'Miqdor yangilandi!' });
}

async function handleOrderAction(chatId: number, action: string, queryId: string) {
  // Buyurtma amaliyotlari
  await customerBot?.answerCallbackQuery(queryId, { text: 'Amaliyot bajarildi!' });
}

async function handleCancelOrder(chatId: number, queryId: string) {
  // Buyurtmani bekor qilish
  customerCarts.delete(chatId);
  await customerBot?.answerCallbackQuery(queryId, { text: 'Buyurtma bekor qilindi!' });
  await customerBot?.sendMessage(chatId, '❌ Buyurtma bekor qilindi');
}

export { customerBot };