import { prisma } from '../server/utils/prisma';

async function main() {
  const startedAt = Date.now();
  const result = await prisma.$queryRawUnsafe('SELECT 1 as ok');
  const ms = Date.now() - startedAt;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, result, ms }));
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ ok: false, error: e?.message || String(e) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
