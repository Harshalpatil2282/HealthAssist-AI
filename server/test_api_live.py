import urllib.request, json, sys

BASE = "http://localhost:8000"

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
                                  headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as r:
        return json.load(r)

errors = []

print("=" * 60)
print("TEST 1: Search with city in query text")
try:
    d = post("/api/v1/search", {"query": "knee replacement Kochi", "language": "en"})
    cities = [h["city"] for h in d["hospitals"]]
    ok = all(c == "Kochi" for c in cities)
    print(f"  Hospitals: {len(d['hospitals'])} | All Kochi={ok} | Cities={set(cities)}")
    if not ok: errors.append("TEST1: Wrong cities returned")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST1: {e}")

print()
print("TEST 2: Search with pincode (numeric) in location field")
try:
    d = post("/api/v1/search", {
        "query": "heart surgery",
        "language": "en",
        "location": {"pincode": "411001"}
    })
    cities = set(h["city"] for h in d["hospitals"])
    print(f"  Hospitals: {len(d['hospitals'])} | Cities={cities}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST2: {e}")

print()
print("TEST 3: Search with city name in pincode field (was crashing before)")
try:
    d = post("/api/v1/search", {
        "query": "diabetes treatment",
        "language": "en",
        "location": {"pincode": "Mumbai"}
    })
    cities = set(h["city"] for h in d["hospitals"])
    print(f"  Hospitals: {len(d['hospitals'])} | Cities={cities}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST3: {e}")

print()
print("TEST 4: Search without any location (should show diverse cities)")
try:
    d = post("/api/v1/search", {"query": "cataract surgery", "language": "en"})
    cities = set(h["city"] for h in d["hospitals"])
    print(f"  Hospitals: {len(d['hospitals'])} | Cities={cities}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST4: {e}")

print()
print("TEST 5: Drugs - atorvastatin")
try:
    d = get("/api/v1/drugs/compare?name=atorvastatin")
    print(f"  Brands: {len(d['brand_variants'])} | Generics: {len(d['generic_variants'])} | Savings: {d['potential_savings_pct']}%")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST5: {e}")

print()
print("TEST 6: Drugs - paracetamol (new)")
try:
    d = get("/api/v1/drugs/compare?name=paracetamol")
    print(f"  Brands: {len(d['brand_variants'])} | Generics: {len(d['generic_variants'])} | Savings: {d['potential_savings_pct']}%")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST6: {e}")

print()
print("TEST 7: Drugs - aspirin (new)")
try:
    d = get("/api/v1/drugs/compare?name=aspirin")
    print(f"  Molecule: {d['molecule']} | Brands: {[v['name'] for v in d['brand_variants']]}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST7: {e}")

print()
print("TEST 8: Drugs - brand name lookup (crocin -> paracetamol)")
try:
    d = get("/api/v1/drugs/compare?name=crocin")
    print(f"  Found: {d['brand_drug']} | Molecule: {d['molecule']}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST8: {e}")

print()
print("TEST 9: Hospitals list with city filter")
try:
    d = get("/api/v1/hospitals?city=Kochi&per_page=5")
    print(f"  Total Kochi hospitals: {d['total']} | Page: {len(d['hospitals'])}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST9: {e}")

print()
print("TEST 10: Hospitals list with state filter")
try:
    d = get("/api/v1/hospitals?state=Kerala&per_page=5")
    print(f"  Total Kerala hospitals: {d['total']} | Page: {len(d['hospitals'])}")
except Exception as e:
    print(f"  ERROR: {e}"); errors.append(f"TEST10: {e}")

print()
print("=" * 60)
if errors:
    print(f"FAILED: {len(errors)} errors:")
    for e in errors: print(f"  - {e}")
    sys.exit(1)
else:
    print("ALL TESTS PASSED")
