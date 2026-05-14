# /// script
# dependencies = []
# ///

from __future__ import annotations

import re
import json
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(r"C:/Users/tilav/Desktop/zavod tizimi")
SERVER_INDEX = ROOT / "server" / "index.ts"
ROUTES_DIR = ROOT / "server" / "routes"

@dataclass
class Endpoint:
    method: str
    path: str
    file: str
    line: int


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def parse_mounts(index_ts: str):
    # app.use('/api/products', productRoutes);
    mounts = []
    for m in re.finditer(r"app\.use\(\s*['\"]([^'\"]+)['\"]\s*,\s*(\w+)\s*\)\s*;", index_ts):
        mounts.append((m.group(1), m.group(2)))
    return mounts


def parse_imports(index_ts: str):
    # import productRoutes from './routes/products.js';
    imports = {}
    for m in re.finditer(r"import\s+(\w+)\s+from\s+['\"]\./routes/([^'\"]+)\.js['\"];", index_ts):
        var = m.group(1)
        file = m.group(2) + ".ts"
        imports[var] = file
    return imports


def parse_endpoints_in_route(route_ts: str, file_name: str):
    endpoints: list[Endpoint] = []
    # router.get('/path', ...)
    for m in re.finditer(r"\brouter\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]*)['\"]", route_ts, flags=re.IGNORECASE):
        method = m.group(1).upper()
        subpath = m.group(2)
        line = route_ts[: m.start()].count("\n") + 1
        endpoints.append(Endpoint(method=method, path=subpath, file=file_name, line=line))
    return endpoints


def join_paths(prefix: str, sub: str) -> str:
    if sub == "/":
        sub = ""
    if not prefix.endswith("/"):
        prefix = prefix
    if sub.startswith("/"):
        return prefix + sub
    if sub == "":
        return prefix
    return prefix + "/" + sub


def main():
    idx = read_text(SERVER_INDEX)
    mounts = parse_mounts(idx)
    imports = parse_imports(idx)

    inv = []
    for mount_path, var in mounts:
        route_file = imports.get(var)
        if not route_file:
            continue
        route_path = ROUTES_DIR / route_file
        if not route_path.exists():
            continue
        rt = read_text(route_path)
        eps = parse_endpoints_in_route(rt, route_file)
        for ep in eps:
            full = join_paths(mount_path, ep.path)
            inv.append({
                "method": ep.method,
                "path": full,
                "file": ep.file,
                "line": ep.line,
            })

    # sort
    inv.sort(key=lambda x: (x["path"], x["method"]))

    out = {
        "endpointCount": len(inv),
        "endpoints": inv,
    }

    out_path = ROOT / "scripts" / "api-inventory.json"
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {len(inv)} endpoints to {out_path}")


if __name__ == "__main__":
    main()
