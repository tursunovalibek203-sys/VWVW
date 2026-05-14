import fs from 'node:fs';

const BASE_URL = 'http://localhost:5003';
const TOKEN = process.env.AUDIT_TOKEN;

if (!TOKEN) {
  console.error('AUDIT_TOKEN env var is required (JWT).');
  process.exit(1);
}

const inv = JSON.parse(fs.readFileSync(new URL('./api-inventory.json', import.meta.url), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers(auth) {
  const h = { 'Accept': 'application/json' };
  if (auth) h['Authorization'] = `Bearer ${TOKEN}`;
  return h;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: res.ok, status: res.status, text, json, headers: Object.fromEntries(res.headers.entries()) };
  } catch (e) {
    return { ok: false, status: 0, error: e?.message || String(e) };
  } finally {
    clearTimeout(id);
  }
}

function classifyValueIssues(obj, path = '$', issues = []) {
  if (obj === undefined) issues.push({ path, type: 'undefined' });
  if (obj === null) issues.push({ path, type: 'null' });
  if (typeof obj === 'number' && Number.isNaN(obj)) issues.push({ path, type: 'NaN' });
  if (typeof obj === 'string' && obj === '') issues.push({ path, type: 'empty_string' });
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => classifyValueIssues(v, `${path}[${i}]`, issues));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      classifyValueIssues(v, `${path}.${k}`, issues);
    }
  }
  return issues;
}

function detectResponseShape(json) {
  if (!json || typeof json !== 'object') return 'non_json';
  const hasSuccess = Object.prototype.hasOwnProperty.call(json, 'success');
  const hasData = Object.prototype.hasOwnProperty.call(json, 'data');
  const hasError = Object.prototype.hasOwnProperty.call(json, 'error');
  if (hasSuccess && (hasData || hasError)) return 'standard';
  return 'non_standard';
}

async function testEndpoint(ep) {
  const url = BASE_URL + ep.path;
  const common = { method: ep.method };

  const results = { endpoint: ep, tests: {} };

  // Auth + no-auth basic
  const authRes = await fetchWithTimeout(url, { ...common, headers: headers(true) }, 15000);
  const noAuthRes = await fetchWithTimeout(url, { ...common, headers: headers(false) }, 15000);

  results.tests.auth = summarize(authRes);
  results.tests.noAuth = summarize(noAuthRes);

  // For mutation endpoints: empty payload + invalid payload
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ep.method)) {
    const emptyRes = await fetchWithTimeout(url, {
      method: ep.method,
      headers: { ...headers(true), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, 15000);

    const invalidRes = await fetchWithTimeout(url, {
      method: ep.method,
      headers: { ...headers(true), 'Content-Type': 'application/json' },
      body: JSON.stringify({ unexpected: 123, items: 'not-an-array' }),
    }, 15000);

    results.tests.emptyPayload = summarize(emptyRes);
    results.tests.invalidPayload = summarize(invalidRes);
  }

  return results;
}

function summarize(res) {
  const shape = detectResponseShape(res.json);
  const issues = res.json ? classifyValueIssues(res.json) : [];
  return {
    status: res.status,
    ok: res.ok,
    error: res.error,
    shape,
    valueIssues: issues.slice(0, 50),
    valueIssueCount: issues.length,
    // Keep small snippet only
    bodySnippet: (res.text || '').slice(0, 500),
  };
}

async function concurrentTest() {
  const url = BASE_URL + '/api/health';
  const N = 25;
  const started = Date.now();
  const reqs = Array.from({ length: N }, () => fetchWithTimeout(url, { method: 'GET', headers: headers(false) }, 5000));
  const res = await Promise.all(reqs);
  const ms = Date.now() - started;
  const statuses = res.map((r) => r.status);
  return { N, ms, statuses, failed: statuses.filter((s) => s === 0).length };
}

async function largePayloadTest() {
  // 11MB string to trigger 413 (limit is 10mb)
  const url = BASE_URL + '/api/products';
  const payload = { big: 'a'.repeat(11 * 1024 * 1024) };
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { ...headers(true), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 15000);
  return summarize(res);
}

async function timeoutTest() {
  const url = BASE_URL + '/api/products';
  const res = await fetchWithTimeout(url, { method: 'GET', headers: headers(true) }, 1);
  return summarize(res);
}

async function main() {
  const endpoints = inv.endpoints;

  // Keep runtime reasonable: test all GET first, then mutations subset
  const ordered = [...endpoints].sort((a, b) => {
    const aRank = a.method === 'GET' ? 0 : 1;
    const bRank = b.method === 'GET' ? 0 : 1;
    return aRank - bRank || a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    endpointCount: endpoints.length,
    summary: {},
    endpoints: [],
    globalTests: {},
  };

  for (let i = 0; i < ordered.length; i++) {
    const ep = ordered[i];
    // Skip endpoints with path params for now (need fixtures)
    if (ep.path.includes('/:')) continue;
    // Skip SSE
    if (ep.path.includes('/realtime/events')) continue;

    const r = await testEndpoint(ep);
    report.endpoints.push(r);

    // gentle pacing
    if (i % 20 === 0) await sleep(100);
  }

  report.globalTests.concurrentHealth = await concurrentTest();
  report.globalTests.largePayload = await largePayloadTest();
  report.globalTests.timeout = await timeoutTest();

  // Summaries
  const nonStandard = report.endpoints.filter((e) => e.tests.auth?.shape === 'non_standard').length;
  const any500 = report.endpoints.filter((e) => [e.tests.auth, e.tests.noAuth, e.tests.emptyPayload, e.tests.invalidPayload].some((t) => t && t.status >= 500)).length;
  const valueIssues = report.endpoints.reduce((acc, e) => acc + (e.tests.auth?.valueIssueCount || 0), 0);

  report.summary = {
    testedEndpoints: report.endpoints.length,
    nonStandardAuthResponses: nonStandard,
    endpointsWithAny5xx: any500,
    totalValueIssuesInAuthResponses: valueIssues,
  };

  const outPath = new URL('./api-runtime-report.json', import.meta.url);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Wrote runtime report to ${outPath.pathname}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
