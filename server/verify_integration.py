from app.data.loader import REAL_HOSPITALS, DOCTOR_INDEX, DISEASE_PROCEDURE_MAP, HOSPITAL_SENTIMENT
from app.data.synthetic.cost_benchmarks import get_all_hospitals

all_h = get_all_hospitals()
print(f"REAL_HOSPITALS loaded: {len(REAL_HOSPITALS)}")
print(f"get_all_hospitals() total: {len(all_h)}")
print(f"Doctor entries: {sum(len(v) for v in DOCTOR_INDEX.values())}")
print(f"Disease->procedure mappings: {len(DISEASE_PROCEDURE_MAP)}")
print(f"Hospitals with sentiment: {len(HOSPITAL_SENTIMENT)}")

cities = sorted(set(h["city"] for h in REAL_HOSPITALS))
print(f"\nCities in real data ({len(cities)}): {cities}")

disease_sample = list(DISEASE_PROCEDURE_MAP.items())[:5]
print(f"\nSample diseases: {disease_sample}")

kochi = len([h for h in all_h if h["city"] == "Kochi"])
pmjay = len([h for h in all_h if h.get("accepts_pmjay")])
nabh  = len([h for h in all_h if "NABH" in h.get("accreditation", [])])
print(f"\nKochi hospitals: {kochi}")
print(f"PMJAY hospitals: {pmjay}")
print(f"NABH hospitals:  {nabh}")

# Test doctor index
sample_hid = list(DOCTOR_INDEX.keys())[0]
docs = DOCTOR_INDEX[sample_hid]
print(f"\nSample doctors for hospital_id={sample_hid}: {docs[:2]}")
