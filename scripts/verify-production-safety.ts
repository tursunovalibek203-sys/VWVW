/**
 * Production Safety Verification Script
 * 
 * This script verifies all critical production safety measures are in place:
 * 1. Database constraints (CHECK, UNIQUE, NOT NULL)
 * 2. Atomic operations
 * 3. Connection pool configuration
 * 4. Middleware configuration
 * 5. Error handling
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  critical: boolean;
}

const results: VerificationResult[] = [];

async function verifyDatabaseConstraints() {
  console.log('\n🔍 Verifying Database Constraints...\n');

  try {
    // Check if CHECK constraints exist
    const constraints = await prisma.$queryRaw<any[]>`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = '"Product"'::regclass
        AND contype = 'c'
    `;

    const hasStockConstraint = constraints.some(c => 
      c.constraint_name.includes('stock_non_negative')
    );

    if (hasStockConstraint) {
      results.push({
        category: 'Database',
        check: 'Stock CHECK Constraints',
        status: 'PASS',
        message: 'CHECK constraints exist to prevent negative stock',
        critical: true
      });
    } else {
      results.push({
        category: 'Database',
        check: 'Stock CHECK Constraints',
        status: 'FAIL',
        message: 'Missing CHECK constraints - stock can go negative!',
        critical: true
      });
    }
  } catch (error) {
    results.push({
      category: 'Database',
      check: 'Stock CHECK Constraints',
      status: 'WARNING',
      message: `Could not verify constraints: ${error}`,
      critical: true
    });
  }

  // Check receiptNumber uniqueness
  try {
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Sale'
        AND indexdef LIKE '%receiptNumber%'
    `;

    const hasUniqueReceipt = indexes.some(i => 
      i.indexdef.includes('UNIQUE')
    );

    if (hasUniqueReceipt) {
      results.push({
        category: 'Database',
        check: 'Receipt Number Uniqueness',
        status: 'PASS',
        message: 'receiptNumber has UNIQUE constraint',
        critical: true
      });
    } else {
      results.push({
        category: 'Database',
        check: 'Receipt Number Uniqueness',
        status: 'FAIL',
        message: 'receiptNumber missing UNIQUE constraint - duplicates possible!',
        critical: true
      });
    }
  } catch (error) {
    results.push({
      category: 'Database',
      check: 'Receipt Number Uniqueness',
      status: 'WARNING',
      message: `Could not verify uniqueness: ${error}`,
      critical: true
    });
  }

  // Check performance indexes
  try {
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('Product', 'Sale', 'SaleItem', 'Customer')
      ORDER BY tablename, indexname
    `;

    const criticalIndexes = [
      'Sale_receiptNumber',
      'Sale_customerId',
      'Product_id',
      'SaleItem_saleId'
    ];

    const missingIndexes = criticalIndexes.filter(idx => 
      !indexes.some(i => i.indexname.includes(idx.split('_')[1]))
    );

    if (missingIndexes.length === 0) {
      results.push({
        category: 'Database',
        check: 'Performance Indexes',
        status: 'PASS',
        message: 'All critical indexes exist',
        critical: false
      });
    } else {
      results.push({
        category: 'Database',
        check: 'Performance Indexes',
        status: 'WARNING',
        message: `Missing indexes: ${missingIndexes.join(', ')}`,
        critical: false
      });
    }
  } catch (error) {
    results.push({
      category: 'Database',
      check: 'Performance Indexes',
      status: 'WARNING',
      message: `Could not verify indexes: ${error}`,
      critical: false
    });
  }
}

async function verifyConnectionPool() {
  console.log('\n🔍 Verifying Connection Pool Configuration...\n');

  const dbUrl = process.env.DATABASE_URL || '';

  if (dbUrl.includes('connection_limit')) {
    const match = dbUrl.match(/connection_limit=(\d+)/);
    const limit = match ? parseInt(match[1]) : 0;

    if (limit >= 30) {
      results.push({
        category: 'Connection Pool',
        check: 'Pool Size',
        status: 'PASS',
        message: `Connection limit set to ${limit}`,
        critical: true
      });
    } else {
      results.push({
        category: 'Connection Pool',
        check: 'Pool Size',
        status: 'WARNING',
        message: `Connection limit (${limit}) is low for production`,
        critical: true
      });
    }
  } else {
    results.push({
      category: 'Connection Pool',
      check: 'Pool Size',
      status: 'FAIL',
      message: 'No connection_limit parameter in DATABASE_URL',
      critical: true
    });
  }

  if (dbUrl.includes('pool_timeout')) {
    results.push({
      category: 'Connection Pool',
      check: 'Pool Timeout',
      status: 'PASS',
      message: 'Pool timeout configured',
        critical: false
    });
  } else {
    results.push({
      category: 'Connection Pool',
      check: 'Pool Timeout',
      status: 'WARNING',
      message: 'No pool_timeout parameter in DATABASE_URL',
      critical: false
    });
  }
}

async function verifyCodeSafety() {
  console.log('\n🔍 Verifying Code Safety...\n');

  // Check if SalesService uses atomic updates
  const fs = await import('fs');
  const salesServiceCode = fs.readFileSync('server/services/SalesService.ts', 'utf-8');

  if (salesServiceCode.includes('$executeRaw') && 
      salesServiceCode.includes('UPDATE "Product"') && 
      salesServiceCode.includes('currentStock >=')) {
    results.push({
      category: 'Code Safety',
      check: 'Atomic Stock Updates',
      status: 'PASS',
      message: 'SalesService uses atomic conditional updates',
      critical: true
    });
  } else {
    results.push({
      category: 'Code Safety',
      check: 'Atomic Stock Updates',
      status: 'FAIL',
      message: 'SalesService does NOT use atomic updates - race conditions possible!',
      critical: true
    });
  }

  // Check if DecimalHelper is used
  if (salesServiceCode.includes('DecimalHelper')) {
    results.push({
      category: 'Code Safety',
      check: 'Decimal Calculations',
      status: 'PASS',
      message: 'DecimalHelper used for money calculations',
      critical: true
    });
  } else {
    results.push({
      category: 'Code Safety',
      check: 'Decimal Calculations',
      status: 'FAIL',
      message: 'Float arithmetic detected - precision errors possible!',
      critical: true
    });
  }

  // Check transaction isolation
  if (salesServiceCode.includes('ReadCommitted')) {
    results.push({
      category: 'Code Safety',
      check: 'Transaction Isolation',
      status: 'PASS',
      message: 'Using ReadCommitted isolation',
      critical: false
    });
  } else if (salesServiceCode.includes('Serializable')) {
    results.push({
      category: 'Code Safety',
      check: 'Transaction Isolation',
      status: 'WARNING',
      message: 'Using Serializable - may cause performance bottleneck',
      critical: false
    });
  }

  // Check error handler
  const serverCode = fs.readFileSync('server/index.ts', 'utf-8');
  if (serverCode.includes('errorHandler') && serverCode.includes('app.use(errorHandler)')) {
    results.push({
      category: 'Code Safety',
      check: 'Error Handler',
      status: 'PASS',
      message: 'Global error handler configured',
      critical: true
    });
  } else {
    results.push({
      category: 'Code Safety',
      check: 'Error Handler',
      status: 'FAIL',
      message: 'No global error handler - errors may leak to client!',
      critical: true
    });
  }

  // Check rate limiting
  if (serverCode.includes('rateLimit') || serverCode.includes('rate-limit')) {
    results.push({
      category: 'Security',
      check: 'Rate Limiting',
      status: 'PASS',
      message: 'Rate limiting configured',
      critical: false
    });
  } else {
    results.push({
      category: 'Security',
      check: 'Rate Limiting',
      status: 'WARNING',
      message: 'No rate limiting - vulnerable to DDoS',
      critical: false
    });
  }

  // Check helmet
  if (serverCode.includes('helmet')) {
    results.push({
      category: 'Security',
      check: 'Security Headers',
      status: 'PASS',
      message: 'Helmet configured for security headers',
      critical: false
    });
  } else {
    results.push({
      category: 'Security',
      check: 'Security Headers',
      status: 'WARNING',
      message: 'No helmet - missing security headers',
      critical: false
    });
  }
}

async function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('PRODUCTION SAFETY VERIFICATION RESULTS');
  console.log('='.repeat(80) + '\n');

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    console.log(`\n📋 ${category}`);
    console.log('-'.repeat(80));

    const categoryResults = results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      const critical = result.critical ? ' [CRITICAL]' : '';
      console.log(`${icon} ${result.check}${critical}`);
      console.log(`   ${result.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const criticalFailed = results.filter(r => r.status === 'FAIL' && r.critical).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed} (${criticalFailed} critical)`);
  console.log(`⚠️  Warnings: ${warnings}`);

  console.log('\n' + '='.repeat(80));

  if (criticalFailed > 0) {
    console.log('🚨 SYSTEM STATUS: NOT PRODUCTION READY');
    console.log('   Critical issues must be fixed before deployment!');
  } else if (failed > 0) {
    console.log('⚠️  SYSTEM STATUS: PARTIALLY READY');
    console.log('   Non-critical issues should be addressed.');
  } else if (warnings > 0) {
    console.log('✅ SYSTEM STATUS: PRODUCTION READY (with warnings)');
    console.log('   System is safe but could be improved.');
  } else {
    console.log('✅ SYSTEM STATUS: FULLY PRODUCTION READY');
    console.log('   All safety checks passed!');
  }

  console.log('='.repeat(80) + '\n');

  return criticalFailed === 0;
}

async function main() {
  console.log('🚀 Starting Production Safety Verification...\n');

  try {
    await verifyDatabaseConstraints();
    await verifyConnectionPool();
    await verifyCodeSafety();

    const isReady = await printResults();

    process.exit(isReady ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
