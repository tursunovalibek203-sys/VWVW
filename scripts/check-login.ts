import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { login: 'admin' } });
if (!user) { console.log('USER NOT FOUND'); process.exit(1); }
console.log('Found user:', user.login, user.role, user.active);
console.log('Hash prefix:', user.password.substring(0, 10));
const ok = await bcrypt.compare('admin123', user.password);
console.log('bcrypt.compare result:', ok);
await prisma.$disconnect();
