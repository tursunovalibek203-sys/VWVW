import bcrypt from 'bcryptjs';

async function verifyPassword() {
  const hash = '$2a$10$OqivGZcAaxp1Ry3qPyHmhufPmnZKeiVZFs.jjWv3vayyO3DlxVmCq';
  const password = 'admin123';
  
  const valid = await bcrypt.compare(password, hash);
  console.log('\n=== PASSWORD VERIFICATION ===');
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash.substring(0, 20)}...`);
  console.log(`Valid: ${valid}`);
}

verifyPassword().catch(console.error);
