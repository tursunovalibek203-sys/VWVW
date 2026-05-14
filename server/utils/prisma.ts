import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
  }
}

function validateDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw || raw.trim().length === 0) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Set DATABASE_URL in .env (local) or provider env (production)');
    process.exit(1);
  }

  // Check if it's SQLite (file:// or file:)
  if (raw.toLowerCase().startsWith('file:')) {
    console.log('✅ SQLite database configured:', raw);
    return raw;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch (e) {
    console.error('❌ DATABASE_URL is not a valid URL');
    console.error('Provided:', maskDatabaseUrl(raw));
    console.error('Tip: If your password contains special chars (; @ : / #), URL-encode them (e.g. ; -> %3B)');
    process.exit(1);
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'postgresql:' && protocol !== 'postgres:') {
    console.error('❌ DATABASE_URL protocol must be postgresql://');
    console.error('Provided:', maskDatabaseUrl(raw));
    process.exit(1);
  }

  const username = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port;
  const database = url.pathname?.replace(/^\//, '') || '';

  if (!username || !host || !database) {
    console.error('❌ DATABASE_URL must include username, host, and database name');
    console.error('Provided:', maskDatabaseUrl(raw));
    process.exit(1);
  }

  if (password.length === 0) {
    console.error('❌ DATABASE_URL must include a non-empty password');
    console.error('Provided:', maskDatabaseUrl(raw));
    process.exit(1);
  }

  if (port && !/^\d+$/.test(port)) {
    console.error('❌ DATABASE_URL port is invalid');
    console.error('Provided:', maskDatabaseUrl(raw));
    process.exit(1);
  }

  const sslmode = url.searchParams.get('sslmode');
  const needsSsl = host.endsWith('.supabase.co') || process.env.NODE_ENV === 'production';
  if (needsSsl && sslmode !== 'require') {
    console.error('❌ DATABASE_URL must include sslmode=require for this environment');
    console.error('Provided:', maskDatabaseUrl(raw));
    console.error('Example: postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require');
    process.exit(1);
  }

  const connectionLimit = url.searchParams.get('connection_limit');
  if (connectionLimit && (!/^\d+$/.test(connectionLimit) || Number(connectionLimit) <= 0)) {
    console.error('❌ DATABASE_URL connection_limit must be a positive integer');
    console.error('Provided:', maskDatabaseUrl(raw));
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'development') {
    const masked = maskDatabaseUrl(raw);
    console.log('✅ DATABASE_URL validated', {
      username,
      host,
      port: port || '5432',
      database,
      sslmode: sslmode || null,
      connection_limit: connectionLimit || null,
      url: masked,
    });
  }

  return raw;
}

const VALIDATED_DATABASE_URL = validateDatabaseUrl();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: VALIDATED_DATABASE_URL,
    },
  },
});

// Connection management
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
