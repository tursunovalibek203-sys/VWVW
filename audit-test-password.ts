import bcrypt from 'bcryptjs';

async function testPassword() {
  const hashedPassword = '$2a$10$OqivGZcAaxp1RK9PZk3.TeuqZ7L0IHaagCDgO7dNl5dXWPp5IJMJ6';
  const inputPassword = 'admin123';
  
  try {
    const isValid = await bcrypt.compare(inputPassword, hashedPassword);
    console.log(`\n=== PASSWORD VERIFICATION ===`);
    console.log(`Input: ${inputPassword}`);
    console.log(`Hash: ${hashedPassword}`);
    console.log(`Match: ${isValid}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPassword();
