# /// script
# dependencies = []
# ///

import os
import re
import json
from pathlib import Path

SERVER_ROUTES_DIR = Path("C:/Users/tilav/Desktop/zavod tizimi/server/routes")
SRC_DIR = Path("C:/Users/tilav/Desktop/zavod tizimi/src")

def get_route_files():
    return sorted(SERVER_ROUTES_DIR.glob("*.ts"))

def analyze_route_file(filepath: Path):
    content = filepath.read_text(encoding="utf-8")
    lines = content.splitlines()
    filename = filepath.name

    # Find router definition
    router_match = re.search(r"(?:const|let|var)\s+(\w+)\s*=\s*Router\(\)", content)
    router_var = router_match.group(1) if router_match else "router"

    # Find all endpoint definitions
    endpoint_pattern = re.compile(
        rf"({router_var})\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]*)['\"]\s*,?\s*(.*?)(?:\n|async\s*\()",
        re.IGNORECASE | re.DOTALL
    )

    # Better pattern: match full route declarations
    route_pattern = re.compile(
        rf"{router_var}\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]*)['\"]\s*,?\s*(.*?(?:async\s*\(|\(.*?\)\s*=>|function\s*\())",
        re.IGNORECASE | re.DOTALL
    )

    endpoints = []
    for match in route_pattern.finditer(content):
        method = match.group(1).upper()
        path = match.group(2)
        handler_text = match.group(3).strip()

        # Find line number
        line_num = content[:match.start()].count("\n") + 1

        # Check for authenticate
        has_auth = "authenticate" in handler_text or "authenticate" in content[max(0,match.start()-500):match.start()]

        # Check for authorize
        has_authorize = "authorize" in handler_text

        # Check for try/catch in the surrounding area
        start_idx = match.end()
        end_idx = start_idx + 3000
        surrounding = content[start_idx:end_idx]
        has_try = "try {" in surrounding or "try{" in surrounding
        has_catch = "catch" in surrounding

        # Check for validation
        has_validation = "validate" in surrounding or "z.object" in surrounding or "zod" in surrounding

        # Check response format
        uses_standard_response = "successResponse" in surrounding or "errorResponse" in surrounding
        uses_res_json = "res.json(" in surrounding

        endpoints.append({
            "method": method,
            "path": path,
            "line": line_num,
            "has_auth": has_auth,
            "has_authorize": has_authorize,
            "has_try_catch": has_try and has_catch,
            "has_validation": has_validation,
            "uses_standard_response": uses_standard_response,
            "uses_res_json": uses_res_json,
            "handler_preview": handler_text[:100]
        })

    return {
        "filename": filename,
        "endpoint_count": len(endpoints),
        "endpoints": endpoints
    }

def analyze_frontend_api_calls():
    results = []
    for ext in ("*.ts", "*.tsx"):
        for filepath in SRC_DIR.rglob(ext):
            content = filepath.read_text(encoding="utf-8")
            if "/api/" not in content and "api.get" not in content and "api.post" not in content:
                continue

            # Find fetch/api calls
            api_calls = re.findall(r'["\']\s*(/api/[^"\']+)\s*["\']', content)
            api_method_calls = re.findall(r'api\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', content)

            if api_calls or api_method_calls:
                results.append({
                    "file": str(filepath.relative_to(SRC_DIR.parent)),
                    "fetch_calls": list(set(api_calls)),
                    "api_method_calls": list(set([f"{m[0].upper()} {m[1]}" for m in api_method_calls]))
                })

    return results

def main():
    print("=" * 80)
    print("LUXPETPLAST ERP - PROFESSIONAL API AUDIT")
    print("=" * 80)
    print()

    # Analyze backend routes
    route_files = get_route_files()
    all_issues = []

    total_endpoints = 0
    auth_missing = []
    try_catch_missing = []
    validation_missing = []
    nonstandard_response = []

    for rf in route_files:
        analysis = analyze_route_file(rf)
        total_endpoints += analysis["endpoint_count"]

        for ep in analysis["endpoints"]:
            # Public endpoints that don't need auth
            public_paths = ["/login", "/register", "/cashier-login", "/health", "/ready", "/metrics", "/refresh"]
            is_public = any(ep["path"] == pp or ep["path"].endswith(pp) for pp in public_paths)

            if not ep["has_auth"] and not is_public and ep["path"] != "":
                auth_missing.append({"file": analysis["filename"], **ep})

            if not ep["has_try_catch"]:
                try_catch_missing.append({"file": analysis["filename"], **ep})

            if not ep["has_validation"] and ep["method"] in ("POST", "PUT", "PATCH") and not is_public:
                validation_missing.append({"file": analysis["filename"], **ep})

            if not ep["uses_standard_response"] and ep["uses_res_json"]:
                nonstandard_response.append({"file": analysis["filename"], **ep})

    print(f"[BACKEND AUDIT]")
    print(f"  Total route files: {len(route_files)}")
    print(f"  Total endpoints: {total_endpoints}")
    print(f"  Auth missing: {len(auth_missing)}")
    print(f"  Try/catch missing: {len(try_catch_missing)}")
    print(f"  Validation missing (POST/PUT/PATCH): {len(validation_missing)}")
    print(f"  Non-standard response format: {len(nonstandard_response)}")
    print()

    if auth_missing:
        print("[CRITICAL] AUTH MISSING ON NON-PUBLIC ENDPOINTS:")
        for item in auth_missing[:15]:
            print(f"  {item['file']}:{item['line']} {item['method']} {item['path']}")
        if len(auth_missing) > 15:
            print(f"  ... and {len(auth_missing) - 15} more")
        print()

    if try_catch_missing:
        print("[WARNING] TRY/CATCH MISSING:")
        for item in try_catch_missing[:15]:
            print(f"  {item['file']}:{item['line']} {item['method']} {item['path']}")
        if len(try_catch_missing) > 15:
            print(f"  ... and {len(try_catch_missing) - 15} more")
        print()

    if validation_missing:
        print("[WARNING] VALIDATION MISSING ON MUTATION ENDPOINTS:")
        for item in validation_missing[:15]:
            print(f"  {item['file']}:{item['line']} {item['method']} {item['path']}")
        if len(validation_missing) > 15:
            print(f"  ... and {len(validation_missing) - 15} more")
        print()

    if nonstandard_response:
        print("[INFO] NON-STANDARD RESPONSE (using res.json directly):")
        for item in nonstandard_response[:15]:
            print(f"  {item['file']}:{item['line']} {item['method']} {item['path']}")
        if len(nonstandard_response) > 15:
            print(f"  ... and {len(nonstandard_response) - 15} more")
        print()

    # Frontend analysis
    print("[FRONTEND AUDIT]")
    frontend_calls = analyze_frontend_api_calls()
    print(f"  Files with API calls: {len(frontend_calls)}")
    total_fetch = sum(len(f["fetch_calls"]) for f in frontend_calls)
    total_api_methods = sum(len(f["api_method_calls"]) for f in frontend_calls)
    print(f"  Fetch calls: {total_fetch}")
    print(f"  api.method calls: {total_api_methods}")
    print()

    # Check for axios instance issues in api.ts
    api_ts = Path("C:/Users/tilav/Desktop/zavod tizimi/src/lib/api.ts")
    if api_ts.exists():
        content = api_ts.read_text(encoding="utf-8")
        issues = []
        if "timeout" not in content:
            issues.append("No timeout configured")
        if "retry" not in content:
            issues.append("No retry logic")
        if "X-Request-ID" not in content:
            issues.append("No request ID tracking")
        print(f"  src/lib/api.ts issues: {issues if issues else 'None (basic config)'}")

    prof_api = Path("C:/Users/tilav/Desktop/zavod tizimi/src/lib/professionalApi.ts")
    if prof_api.exists():
        content = prof_api.read_text(encoding="utf-8")
        issues = []
        if "timeout" in content:
            issues.append("Timeout configured OK")
        if "retry" in content:
            issues.append("Retry logic present OK")
        if "X-Request-ID" in content:
            issues.append("Request ID present OK")
        print(f"  src/lib/professionalApi.ts features: {issues}")

    print()
    print("=" * 80)
    print("AUDIT COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
