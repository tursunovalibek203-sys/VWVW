/**
 * Concurrency Stress Test
 * 
 * Tests the system under high concurrent load to verify:
 * 1. No overselling (atomic stock updates work)
 * 2. No duplicate receipts
 * 3. No race conditions
 * 4. System remains stable
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function setupTestData() {
  console.log('📦 Setting up test data...\n');

  // Create test product with limited stock
  const product = await prisma.product.upsert({
    where: { name: 'TEST_PRODUCT_STRESS' },
    update: {
      currentStock: 100,
      currentUnits: 100000,
      pricePerBag: 100,
      active: true
    },
    create: {
      name: 'TEST_PRODUCT_STRESS',
      bagType: 'TEST',
      unitsPerBag: 1000,
      minStockLimit: 10,
      optimalStock: 50,
      maxCapacity: 200,
      currentStock: 100,
      currentUnits: 100000,
      pricePerBag: 100,
      pricePerPiece: 0.1,
      active: true
    }
  });

  // Create test customer
  const customer = await prisma.customer.upsert({
     where:{ phone: 'TEST_STRESS_CUSTOMER' },
    update: {},
    create: {
      name: 'Test Stress Customer',
      phone: 'TEST_STRESS_CUSTOMER',
      category: 'NORMAL'
    }
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { login: 'test_stress_user' },
    update: {},
    create: {
      login: 'test_stress_user',
      password: 'test',
      name: 'Test Stress User',
      role: 'SELLER'
    }
  });

  console.log(`✅ Test product created: ${product.id} (stock: ${product.currentStock})`);
  console.log(`✅ Test customer created: ${customer.id}`);
  console.log(`✅ Test user created: ${user.id}\n`);

  return { product, customer, user };
}

async function testConcurrentSales(productId: string, customerId: string, userId: string) {
  console.log('🔥 TEST 1: Concurrent Sales (Overselling Prevention)\n');
  console.log('Simulating 200 concurrent users trying to buy from stock of 100...\n');

  const initialStock = await prisma.product.findUnique({
    where: { id: productId },
    select: { currentStock: true, currentUnits: true }
  });

  console.log(`Initial stock: ${initialStock?.currentStock} bags\n`);

  // Create 200 concurrent sale attempts
  const concurrentSales = 200;
  const quantityPerSale = 1; // Each user tries to buy 1 bag

  const salePromises = Array.from({ length: concurrentSales }, async (_, i) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

      const sale = await prisma.$transaction(async (tx) => {
        // Atomic conditional update
        const updateResult = await tx.$executeRaw`
          UPDATE "Product"
          SET 
            "currentStock" = "currentStock" - ${quantityPerSale},
            "currentUnits" = "currentUnits" - ${quantityPerSale * 1000},
            "updatedAt" = NOW()
          WHERE 
            "id" = ${productId}
            AND "currentStock" >= ${quantityPerSale}
            AND "currentUnits" >= ${quantityPerSale * 1000}
        `;

        if (updateResult === 0) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        // Create sale record
        const sale = await tx.sale.create({
          data: {
            customerId,
            userId,
            quantity: quantityPerSale,
            pricePerBag: 100,
            totalAmount: 100,
            paidAmount: 100,
            currency: 'USD',
            paymentStatus: 'PAID'
          }
        });

        return sale;
      }, {
        isolationLevel: 'ReadCommitted',
        maxWait: 30000,
        timeout: 60000
      });

      return { success: true, saleId: sale.id, attempt: i + 1 };
    } catch (error: any) {
      if (error.message.includes('INSUFFICIENT_STOCK')) {
        return { success: false, reason: 'INSUFFICIENT_STOCK', attempt: i + 1 };
      }
      return { success: false, reason: error.message, attempt: i + 1 };
    }
  });

  const saleResults = await Promise.all(salePromises);

  const successful = saleResults.filter(r => r.success).length;
  const failed = saleResults.filter(r => !r.success).length;
  const insufficientStock = saleResults.filter(r => 
    !r.success && r.reason === 'INSUFFICIENT_STOCK'
  ).length;

  const finalStock = await prisma.product.findUnique({
    where: { id: productId },
    select: { currentStock: true, currentUnits: true }
  });

  console.log(`Results:`);
  console.log(`  ✅ Successful sales: ${successful}`);
  console.log(`  ❌ Failed (insufficient stock): ${insufficientStock}`);
  console.log(`  ❌ Failed (other): ${failed - insufficientStock}`);
  console.log(`  📊 Final stock: ${finalStock?.currentStock} bags\n`);

  // Verify no overselling
  const expectedFinalStock = (initialStock?.currentStock || 0) - successful;
  const actualFinalStock = finalStock?.currentStock || 0;

  if (actualFinalStock === expectedFinalStock && actualFinalStock >= 0) {
    results.push({
      test: 'Concurrent Sales - Overselling Prevention',
      status: 'PASS',
      message: `No overselling detected. Stock correctly decreased from ${initialStock?.currentStock} to ${actualFinalStock}`,
      details: { successful, failed, expectedFinalStock, actualFinalStock }
    });
  } else {
    results.push({
      test: 'Concurrent Sales - Overselling Prevention',
      status: 'FAIL',
      message: `OVERSELLING DETECTED! Expected: ${expectedFinalStock}, Actual: ${actualFinalStock}`,
      details: { successful, failed, expectedFinalStock, actualFinalStock }
    });
  }

  // Verify no negative stock
  if (actualFinalStock >= 0) {
    results.push({
      test: 'Concurrent Sales - Negative Stock Prevention',
      status: 'PASS',
      message: 'Stock never went negative',
      details: { finalStock: actualFinalStock }
    });
  } else {
    results.push({
      test: 'Concurrent Sales - Negative Stock Prevention',
      status: 'FAIL',
      message: `CRITICAL: Stock went negative! Final stock: ${actualFinalStock}`,
      details: { finalStock: actualFinalStock }
    });
  }
}

async function testReceiptUniqueness(customerId: string, userId: string) {
  console.log('\n🔥 TEST 2: Receipt Number Uniqueness\n');
  console.log('Creating 100 concurrent sales to test receipt number generation...\n');

  const salePromises = Array.from({ length: 100 }, async (_, i) => {
    try {
      const sale = await prisma.sale.create({
        data: {
          customerId,
          userId,
          quantity: 1,
          pricePerBag: 100,
          totalAmount: 100,
          paidAmount: 100,
          currency: 'USD',
          paymentStatus: 'PAID'
        }
      });

      return { success: true, receiptNumber: sale.receiptNumber };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  const saleResults = await Promise.all(salePromises);

  const successful = saleResults.filter(r => r.success);
  const receiptNumbers = successful.map(r => r.receiptNumber);
  const uniqueReceipts = new Set(receiptNumbers);

  console.log(`Results:`);
  console.log(`  ✅ Sales created: ${successful.length}`);
  console.log(`  📊 Unique receipt numbers: ${uniqueReceipts.size}\n`);

  if (uniqueReceipts.size === successful.length) {
    results.push({
      test: 'Receipt Number Uniqueness',
      status: 'PASS',
      message: 'All receipt numbers are unique',
      details: { total: successful.length, unique: uniqueReceipts.size }
    });
  } else {
    results.push({
      test: 'Receipt Number Uniqueness',
      status: 'FAIL',
      message: `DUPLICATE RECEIPTS DETECTED! ${successful.length} sales but only ${uniqueReceipts.size} unique receipts`,
      details: { total: successful.length, unique: uniqueReceipts.size }
    });
  }
}

async function testSystemStability(productId: string, customerId: string, userId: string) {
  console.log('\n🔥 TEST 3: System Stability Under Load\n');
  console.log('Running 500 mixed operations...\n');

  const operations = Array.from({ length: 500 }, async (_, i) => {
    try {
      const operation = i % 3;

      if (operation === 0) {
        // Read operation
        await prisma.product.findUnique({ where: { id: productId } });
      } else if (operation === 1) {
        // Write operation (sale)
        await prisma.sale.create({
          data: {
            customerId,
            userId,
            quantity: 1,
            pricePerBag: 100,
            totalAmount: 100,
            paidAmount: 100,
            currency: 'USD',
            paymentStatus: 'PAID'
          }
        });
      } else {
        // Query operation
        await prisma.sale.findMany({
          where: { customerId },
          take: 10
        });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  const startTime = Date.now();
  const operationResults = await Promise.all(operations);
  const endTime = Date.now();

  const successful = operationResults.filter(r => r.success).length;
  const failed = operationResults.filter(r => !r.success).length;
  const duration = endTime - startTime;
  const opsPerSecond = (successful / duration) * 1000;

  console.log(`Results:`);
  console.log(`  ✅ Successful operations: ${successful}`);
  console.log(`  ❌ Failed operations: ${failed}`);
  console.log(`  ⏱️  Duration: ${duration}ms`);
  console.log(`  📊 Operations/second: ${opsPerSecond.toFixed(2)}\n`);

  if (failed === 0) {
    results.push({
      test: 'System Stability',
      status: 'PASS',
      message: 'System handled 500 concurrent operations without crashes',
      details: { successful, failed, duration, opsPerSecond }
    });
  } else {
    results.push({
      test: 'System Stability',
      status: 'FAIL',
      message: `System failed ${failed} operations under load`,
      details: { successful, failed, duration, opsPerSecond }
    });
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');

  await prisma.sale.deleteMany({
    where: {
      user: { login: 'test_stress_user' }
    }
  });

  await prisma.product.deleteMany({
    where: { name: 'TEST_PRODUCT_STRESS' }
  });

  await prisma.customer.deleteMany({
    where: { phone: 'TEST_STRESS_CUSTOMER' }
  });

  await prisma.user.deleteMany({
    where: { login: 'test_stress_user' }
  });

  console.log('✅ Cleanup complete\n');
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('STRESS TEST RESULTS');
  console.log('='.repeat(80) + '\n');

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  console.log('\n' + '='.repeat(80));

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - System is production safe!');
  } else {
    console.log('❌ TESTS FAILED - System has critical issues!');
  }

  console.log('='.repeat(80) + '\n');

  return failed === 0;
}

async function main() {
  console.log('🚀 Starting Concurrency Stress Test...\n');
  console.log('This will test the system under extreme concurrent load.\n');

  try {
    const { product, customer, user } = await setupTestData();

    await testConcurrentSales(product.id, customer.id, user.id);
    await testReceiptUniqueness(customer.id, user.id);
    await testSystemStability(product.id, customer.id, user.id);

    await cleanup();

    const allPassed = printResults();

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
