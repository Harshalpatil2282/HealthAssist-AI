import csv, pandas as pd
from collections import Counter, defaultdict

# 1. Hospital cities
hosp = pd.read_excel('app/data/seeds/hospital_dataset_1500_rows.xlsx')
print('Hospital cities:', sorted(hosp['city'].unique()))

# 2. Build pincode → district mapping from AllIndiaPinCode.xls
pincode_map = defaultdict(list)  # pincode → list of districts
with open('app/data/seeds/AllIndiaPinCode.xls', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f)
    for row in reader:
        pin = str(row.get('pincode', '')).strip().zfill(6)
        district = row.get('district', '').strip().strip('"').title()
        if pin and district:
            pincode_map[pin].append(district)

# Most common district per pincode
pincode_city = {}
for pin, districts in pincode_map.items():
    c = Counter(districts)
    pincode_city[pin] = c.most_common(1)[0][0]

print(f'\nTotal unique pincodes: {len(pincode_city)}')

# 3. Test mapping for key hospital cities
test_pins = ['411001', '411002', '560001', '400001', '682001', '700001', '500001', '110001', '226001', '440001']
for p in test_pins:
    print(f'  {p} -> {pincode_city.get(p, "NOT FOUND")}')

# 4. Save compressed mapping - only what backend needs
import json
# Get all pincodes for 15 hospital cities
hospital_cities = list(hosp['city'].unique())
city_normalized = {c.lower(): c for c in hospital_cities}
print('\nHospital city normalized:', city_normalized)

# Find pins that map to hospital cities
city_to_pins = defaultdict(list)
for pin, district in pincode_city.items():
    dist_l = district.lower()
    for city_l, city_canon in city_normalized.items():
        if city_l in dist_l or dist_l in city_l:
            city_to_pins[city_canon].append(pin)
            break

for city, pins in sorted(city_to_pins.items()):
    print(f'  {city}: {len(pins)} pincodes')
