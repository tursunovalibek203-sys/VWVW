# /// script
# dependencies = []
# ///

import json
from pathlib import Path

ROOT = Path(r"C:/Users/tilav/Desktop/zavod tizimi")
REPORT = ROOT / "scripts" / "api-runtime-report.json"

def main():
    data = json.loads(REPORT.read_text(encoding='utf-8'))
    eps = data['endpoints']

    def any_5xx(tests):
        for k,v in tests.items():
            if not v: 
                continue
            if v.get('status',0) >= 500:
                return True
        return False

    failing = [e for e in eps if any_5xx(e['tests'])]

    print(f"Tested endpoints: {len(eps)}")
    print(f"Endpoints with any 5xx: {len(failing)}")

    top = []
    for e in failing:
        for name, t in e['tests'].items():
            if t and t.get('status',0) >= 500:
                top.append((t['status'], e['endpoint']['method'], e['endpoint']['path'], e['endpoint']['file'], name, t.get('bodySnippet','')[:120]))

    top.sort(reverse=True)
    for row in top[:40]:
        status, method, path, file, test, snip = row
        print(f"{status} {method} {path} ({file}) [{test}] -> {snip}")

    nonstandard = [e for e in eps if e['tests'].get('auth',{}).get('shape')=='non_standard']
    print(f"Non-standard auth responses: {len(nonstandard)}")

    # auth bypass quick signal: noAuth ok true
    bypass = []
    for e in eps:
        noAuth = e['tests'].get('noAuth')
        auth = e['tests'].get('auth')
        if noAuth and auth and noAuth.get('ok') and auth.get('ok'):
            bypass.append(e['endpoint'])
    print(f"Endpoints accessible without auth (based on ok=true): {len(bypass)}")
    for b in bypass[:30]:
        print(f"  {b['method']} {b['path']} ({b['file']}:{b['line']})")

if __name__=='__main__':
    main()
