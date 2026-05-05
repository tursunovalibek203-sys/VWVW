import { DriverBotManager } from './driver-bot';
import { initAdminBot } from './admin-bot';
import { initCustomerBot } from './customer-bot';

export class BotManager {
  private static instance: BotManager;
  private bots: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  public async initAllBots() {
    console.log('🤖 3 ta alohida botlarni ishga tushirish...');

    try {
      // 1. Mijoz Bot (Customer Bot)
      if (process.env.TELEGRAM_CUSTOMER_BOT_TOKEN) {
        try {
          const customerBot = initCustomerBot();
          if (customerBot) {
            this.bots.set('customer', customerBot);
            console.log('✅ Mijoz Bot ishga tushdi (@luxpetplastbot)');
          }
        } catch (error: any) {
          console.error('❌ Mijoz Bot xatolik:', error.message);
          if (error.message?.includes('ENOTFOUND') || error.message?.includes('api.telegram.org')) {
            console.log('⚠️ Telegram API ga ulanib bo\'lmadi. Internet yoki Telegram bloklangan bo\'lishi mumkin.');
          }
        }
      }
      
      // 2. Haydovchi Bot (Driver Bot)
      if (process.env.TELEGRAM_DRIVER_BOT_TOKEN) {
        try {
          const driverBot = DriverBotManager.initDriverBot('default', process.env.TELEGRAM_DRIVER_BOT_TOKEN);
          if (driverBot) {
            this.bots.set('driver', driverBot);
            console.log('✅ Haydovchi Bot ishga tushdi');
          }
        } catch (error: any) {
          console.error('❌ Haydovchi Bot xatolik:', error.message);
          if (error.message?.includes('ENOTFOUND') || error.message?.includes('api.telegram.org')) {
            console.log('⚠️ Telegram API ga ulanib bo\'lmadi. Internet yoki Telegram bloklangan bo\'lishi mumkin.');
          }
        }
      }
      
      // 3. Admin Bot (Admin Bot)
      if (process.env.TELEGRAM_ADMIN_BOT_TOKEN) {
        try {
          const adminBot = initAdminBot();
          if (adminBot) {
            this.bots.set('admin', adminBot);
            console.log('✅ Admin Bot ishga tushdi');
          }
        } catch (error: any) {
          console.error('❌ Admin Bot xatolik:', error.message);
          if (error.message?.includes('ENOTFOUND') || error.message?.includes('api.telegram.org')) {
            console.log('⚠️ Telegram API ga ulanib bo\'lmadi. Internet yoki Telegram bloklangan bo\'lishi mumkin.');
          }
        }
      }

      console.log(`🎉 ${this.bots.size} ta bot muvaffaqiyatli ishga tushdi!`);
      
      // Bot statistikasini ko'rsatish
      this.showBotStats();

    } catch (error) {
      console.error('❌ Botlarni ishga tushirishda xatolik:', error);
    }
  }

  public getBot(botName: string) {
    return this.bots.get(botName);
  }

  public getAllBots() {
    return Array.from(this.bots.entries());
  }

  public getBotCount() {
    return this.bots.size;
  }

  private showBotStats() {
    console.log('\n📊 BOT STATISTIKASI:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.bots.forEach((bot, name) => {
      const status = bot ? '🟢 Faol' : '🔴 Nofaol';
      console.log(`${name.padEnd(15)} | ${status}`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Jami: ${this.bots.size} ta bot\n`);
  }

  // Bot holatini tekshirish
  public async checkBotHealth() {
    const healthReport = {
      totalBots: this.bots.size,
      activeBots: 0,
      inactiveBots: 0,
      botStatus: {} as any
    };

    for (const [name, bot] of this.bots) {
      try {
        if (bot && typeof bot.getMe === 'function') {
          await bot.getMe();
          healthReport.activeBots++;
          healthReport.botStatus[name] = 'active';
        } else {
          healthReport.inactiveBots++;
          healthReport.botStatus[name] = 'inactive';
        }
      } catch (error) {
        healthReport.inactiveBots++;
        healthReport.botStatus[name] = 'error';
      }
    }

    return healthReport;
  }

  // Botlarga xabar yuborish
  public async broadcastMessage(message: string, botNames?: string[]) {
    const targetBots = botNames || Array.from(this.bots.keys());
    const results = [];

    for (const botName of targetBots) {
      const bot = this.bots.get(botName);
      if (bot) {
        try {
          // Bu yerda admin chat ID'larini olish kerak
          const adminChatIds = process.env.TELEGRAM_ADMIN_CHAT_ID?.split(',') || [];
          
          for (const chatId of adminChatIds) {
            if (chatId.trim()) {
              await bot.sendMessage(chatId.trim(), message);
            }
          }
          
          results.push({ bot: botName, status: 'success' });
        } catch (error) {
          results.push({ bot: botName, status: 'error', error: error });
        }
      }
    }

    return results;
  }

  // Botlarni to'xtatish
  public async stopAllBots() {
    console.log('🛑 Barcha botlarni to\'xtatish...');
    
    for (const [name, bot] of this.bots) {
      try {
        if (bot && typeof bot.stopPolling === 'function') {
          await bot.stopPolling();
          console.log(`✅ ${name} bot to'xtatildi`);
        }
      } catch (error) {
        console.error(`❌ ${name} botni to'xtatishda xatolik:`, error);
      }
    }

    this.bots.clear();
    console.log('🏁 Barcha botlar to\'xtatildi');
  }

  // Bot qayta ishga tushirish
  public async restartBot(botName: string) {
    console.log(`🔄 ${botName} botni qayta ishga tushirish...`);
    
    const bot = this.bots.get(botName);
    if (bot) {
      try {
        if (typeof bot.stopPolling === 'function') {
          await bot.stopPolling();
        }
        this.bots.delete(botName);
        
        // Botni qayta ishga tushirish
        let newBot;
        switch (botName) {
          case 'customer':
            newBot = initCustomerBot();
            break;
          case 'driver':
            newBot = DriverBotManager.initDriverBot('default', process.env.TELEGRAM_DRIVER_BOT_TOKEN || '');
            break;
          case 'admin':
            newBot = initAdminBot();
            break;
        }
        
        if (newBot) {
          this.bots.set(botName, newBot);
          console.log(`✅ ${botName} bot muvaffaqiyatli qayta ishga tushdi`);
          return true;
        }
      } catch (error) {
        console.error(`❌ ${botName} botni qayta ishga tushirishda xatolik:`, error);
      }
    }
    
    return false;
  }

  // Webhook sozlash (production uchun)
  public async setupWebhooks(baseUrl: string) {
    console.log('🔗 Webhooklar sozlanmoqda...');
    
    const webhookResults = [];
    
    for (const [name, bot] of this.bots) {
      try {
        if (bot && typeof bot.setWebHook === 'function') {
          const webhookUrl = `${baseUrl}/webhook/${name}`;
          await bot.setWebHook(webhookUrl);
          webhookResults.push({ bot: name, status: 'success', url: webhookUrl });
          console.log(`✅ ${name} bot webhook sozlandi: ${webhookUrl}`);
        }
      } catch (error) {
        webhookResults.push({ bot: name, status: 'error', error: error });
        console.error(`❌ ${name} bot webhook xatolik:`, error);
      }
    }
    
    return webhookResults;
  }

  // Webhook o'chirish
  public async removeWebhooks() {
    console.log('🗑️ Webhooklar o\'chirilmoqda...');
    
    for (const [name, bot] of this.bots) {
      try {
        if (bot && typeof bot.deleteWebHook === 'function') {
          await bot.deleteWebHook();
          console.log(`✅ ${name} bot webhook o'chirildi`);
        }
      } catch (error) {
        console.error(`❌ ${name} bot webhook o'chirishda xatolik:`, error);
      }
    }
  }

  // Xabar yuborish (worker uchun)
  public async sendMessage(chatId: string, message: string, options?: any) {
    const customerBot = this.bots.get('customer');
    if (customerBot && typeof customerBot.sendMessage === 'function') {
      try {
        await customerBot.sendMessage(chatId, message, options);
        return { success: true };
      } catch (error) {
        console.error('❌ Xabar yuborishda xatolik:', error);
        return { success: false, error };
      }
    }
    return { success: false, error: 'Bot not found' };
  }
}

// Singleton instance export
export const botManager = BotManager.getInstance();