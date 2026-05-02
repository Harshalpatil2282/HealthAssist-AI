"""HealthAssist API v1 — GET /drugs/compare
Expanded drug database covering 30+ common Indian medications.
"""

from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.drug import DrugComparison, DrugVariant

router = APIRouter()


def _v(name, mfr, price, generic=False, ja=False, online=False, notes=None):
    """Helper to build DrugVariant concisely."""
    return DrugVariant(
        name=name, manufacturer=mfr, price_per_unit=price, unit="tablet",
        is_generic=generic, available_jan_aushadhi=ja,
        notes=notes,
    )


def _drug(molecule, strength, brand_variants, generic_variants, brand_name=None):
    return {
        "brand_name": brand_name or brand_variants[0].name,
        "molecule": molecule,
        "strength": strength,
        "unit": "tablet",
        "brand_variants": brand_variants,
        "generic_variants": generic_variants,
    }


DRUG_DATABASE = {
    # ── Cardiovascular ──────────────────────────────────────────────────────────
    "atorvastatin": _drug(
        "Atorvastatin Calcium", "10 mg",
        [_v("Lipitor", "Pfizer", 25.0), _v("Atorlip-10", "Cipla", 12.0), _v("Tonact-10", "Lupin", 11.5)],
        [_v("Atorvastatin", "Jan Aushadhi", 2.5, True, True, False, "Available at Jan Aushadhi stores"),
         _v("Atorvastatin", "Generic", 4.0, True, False, True)],
        "Atorvastatin"
    ),
    "amlodipine": _drug(
        "Amlodipine Besylate", "5 mg",
        [_v("Norvasc", "Pfizer", 15.0), _v("Amlogard", "Pfizer India", 10.0), _v("Stamlo", "Dr. Reddy's", 5.5)],
        [_v("Amlodipine", "Jan Aushadhi", 1.2, True, True, False),
         _v("Amlodipine", "Generic", 2.5, True, False, True)],
        "Amlodipine"
    ),
    "ramipril": _drug(
        "Ramipril", "5 mg",
        [_v("Cardace", "Sanofi", 12.0), _v("Ramistar", "Lupin", 8.0), _v("Hopace", "Torrent", 7.5)],
        [_v("Ramipril", "Jan Aushadhi", 1.8, True, True, False),
         _v("Ramipril", "Generic", 3.0, True, False, True)],
    ),
    "metoprolol": _drug(
        "Metoprolol Succinate", "50 mg",
        [_v("Betaloc", "AstraZeneca", 10.0), _v("Metolar", "Cipla", 7.0), _v("Revelol", "Emcure", 6.5)],
        [_v("Metoprolol", "Jan Aushadhi", 1.5, True, True, False),
         _v("Metoprolol", "Generic", 2.8, True, False, True)],
    ),
    "clopidogrel": _drug(
        "Clopidogrel Bisulfate", "75 mg",
        [_v("Plavix", "Sanofi", 35.0), _v("Clopilet", "Sun Pharma", 12.0), _v("Deplatt", "Torrent", 10.0)],
        [_v("Clopidogrel", "Jan Aushadhi", 3.0, True, True, False),
         _v("Clopidogrel", "Generic", 5.0, True, False, True)],
    ),
    "telmisartan": _drug(
        "Telmisartan", "40 mg",
        [_v("Micardis", "Boehringer", 22.0), _v("Telma", "Glenmark", 9.0), _v("Tazloc", "Torrent", 8.5)],
        [_v("Telmisartan", "Jan Aushadhi", 2.0, True, True, False),
         _v("Telmisartan", "Generic", 3.5, True, False, True)],
    ),
    # ── Diabetes ────────────────────────────────────────────────────────────────
    "metformin": _drug(
        "Metformin Hydrochloride", "500 mg",
        [_v("Glucophage", "Merck", 8.0), _v("Glycomet", "USV", 3.5), _v("Obimet", "Franco-Indian", 3.0)],
        [_v("Metformin", "Jan Aushadhi", 0.8, True, True, False, "Widely available at Jan Aushadhi"),
         _v("Metformin", "Generic", 1.5, True, False, True)],
        "Metformin"
    ),
    "glimepiride": _drug(
        "Glimepiride", "2 mg",
        [_v("Amaryl", "Sanofi", 18.0), _v("Glimpid", "Cipla", 8.0), _v("Glimy", "FDC", 7.0)],
        [_v("Glimepiride", "Jan Aushadhi", 2.0, True, True, False),
         _v("Glimepiride", "Generic", 3.5, True, False, True)],
    ),
    "glibenclamide": _drug(
        "Glibenclamide", "5 mg",
        [_v("Daonil", "Sanofi", 5.0), _v("Euglucon", "Roche", 4.5)],
        [_v("Glibenclamide", "Jan Aushadhi", 0.8, True, True, False),
         _v("Glibenclamide", "Generic", 1.5, True, False, True)],
    ),
    # ── Pain / Fever ────────────────────────────────────────────────────────────
    "paracetamol": _drug(
        "Paracetamol (Acetaminophen)", "500 mg",
        [_v("Crocin", "GSK", 2.5), _v("Dolo 650", "Micro Labs", 3.0), _v("Calpol", "GSK", 2.0)],
        [_v("Paracetamol", "Jan Aushadhi", 0.5, True, True, False),
         _v("Paracetamol", "Generic", 0.8, True, False, True)],
        "Paracetamol"
    ),
    "ibuprofen": _drug(
        "Ibuprofen", "400 mg",
        [_v("Brufen", "Abbott", 5.0), _v("Combiflam", "Sanofi", 6.5), _v("Advil", "Pfizer", 8.0)],
        [_v("Ibuprofen", "Jan Aushadhi", 1.0, True, True, False),
         _v("Ibuprofen", "Generic", 1.8, True, False, True)],
        "Ibuprofen"
    ),
    "diclofenac": _drug(
        "Diclofenac Sodium", "50 mg",
        [_v("Voveran", "Novartis", 7.0), _v("Voltaren", "Novartis", 8.0), _v("Reactine", "FDC", 5.0)],
        [_v("Diclofenac", "Jan Aushadhi", 1.2, True, True, False),
         _v("Diclofenac", "Generic", 2.0, True, False, True)],
    ),
    "aspirin": _drug(
        "Aspirin (Acetylsalicylic Acid)", "75 mg",
        [_v("Ecosprin", "USV", 1.5), _v("Disprin", "Reckitt", 3.0), _v("Aspocid", "Sun Pharma", 2.0)],
        [_v("Aspirin", "Jan Aushadhi", 0.5, True, True, False),
         _v("Aspirin", "Generic", 0.8, True, False, True)],
        "Aspirin"
    ),
    # ── Antibiotics ─────────────────────────────────────────────────────────────
    "amoxicillin": _drug(
        "Amoxicillin Trihydrate", "500 mg",
        [_v("Mox", "Ranbaxy", 12.0), _v("Novamox", "Cipla", 10.0), _v("Amoxil", "GSK", 15.0)],
        [_v("Amoxicillin", "Jan Aushadhi", 2.5, True, True, False),
         _v("Amoxicillin", "Generic", 4.0, True, False, True)],
    ),
    "azithromycin": _drug(
        "Azithromycin Dihydrate", "500 mg",
        [_v("Zithromax", "Pfizer", 45.0), _v("Azee", "Cipla", 22.0), _v("Azifast", "Glenmark", 20.0)],
        [_v("Azithromycin", "Jan Aushadhi", 5.0, True, True, False),
         _v("Azithromycin", "Generic", 9.0, True, False, True)],
    ),
    "ciprofloxacin": _drug(
        "Ciprofloxacin Hydrochloride", "500 mg",
        [_v("Ciplox", "Cipla", 15.0), _v("Cifran", "Ranbaxy", 14.0), _v("Quintor", "Sun Pharma", 12.0)],
        [_v("Ciprofloxacin", "Jan Aushadhi", 3.0, True, True, False),
         _v("Ciprofloxacin", "Generic", 5.0, True, False, True)],
    ),
    # ── GI / Acid ───────────────────────────────────────────────────────────────
    "pantoprazole": _drug(
        "Pantoprazole Sodium", "40 mg",
        [_v("Pantocid", "Sun Pharma", 9.0), _v("Pantop", "Aristo", 7.5), _v("Protonix", "Pfizer", 12.0)],
        [_v("Pantoprazole", "Jan Aushadhi", 1.5, True, True, False),
         _v("Pantoprazole", "Generic", 2.5, True, False, True)],
        "Pantoprazole"
    ),
    "omeprazole": _drug(
        "Omeprazole", "20 mg",
        [_v("Prilosec", "AstraZeneca", 10.0), _v("Omez", "Dr. Reddy's", 5.0), _v("Ocid", "Cipla", 4.5)],
        [_v("Omeprazole", "Jan Aushadhi", 1.0, True, True, False),
         _v("Omeprazole", "Generic", 2.0, True, False, True)],
    ),
    "domperidone": _drug(
        "Domperidone", "10 mg",
        [_v("Motilium", "J&J", 8.0), _v("Domstal", "Torrent", 5.0), _v("Vomistop", "Cipla", 4.5)],
        [_v("Domperidone", "Jan Aushadhi", 1.0, True, True, False),
         _v("Domperidone", "Generic", 1.8, True, False, True)],
    ),
    # ── Respiratory ─────────────────────────────────────────────────────────────
    "salbutamol": _drug(
        "Salbutamol Sulphate", "2 mg",
        [_v("Asthalin", "Cipla", 1.5), _v("Ventolin", "GSK", 2.0), _v("Derihaler", "Lupin", 1.8)],
        [_v("Salbutamol", "Jan Aushadhi", 0.5, True, True, False),
         _v("Salbutamol", "Generic", 0.8, True, False, True)],
    ),
    "montelukast": _drug(
        "Montelukast Sodium", "10 mg",
        [_v("Singulair", "MSD", 28.0), _v("Montair", "Cipla", 12.0), _v("Montek", "Sun Pharma", 11.0)],
        [_v("Montelukast", "Jan Aushadhi", 3.0, True, True, False),
         _v("Montelukast", "Generic", 5.0, True, False, True)],
    ),
    # ── Thyroid ─────────────────────────────────────────────────────────────────
    "levothyroxine": _drug(
        "Levothyroxine Sodium", "50 mcg",
        [_v("Eltroxin", "GSK", 3.0), _v("Thyronorm", "Abbott", 3.5), _v("Thyrox", "Macleods", 2.5)],
        [_v("Levothyroxine", "Jan Aushadhi", 0.8, True, True, False),
         _v("Levothyroxine", "Generic", 1.5, True, False, True)],
    ),
    # ── Vitamins / Supplements ──────────────────────────────────────────────────
    "vitamin_d3": _drug(
        "Cholecalciferol (Vitamin D3)", "60,000 IU",
        [_v("D-Rise", "USV", 35.0), _v("Calcirol", "Cadila", 30.0), _v("Uprise D3", "Alkem", 32.0)],
        [_v("Vitamin D3", "Jan Aushadhi", 8.0, True, True, False),
         _v("Vitamin D3", "Generic", 12.0, True, False, True)],
        "Vitamin D3"
    ),
    "calcium": _drug(
        "Calcium Carbonate + Vitamin D3", "500 mg + 250 IU",
        [_v("Shelcal", "Elder", 12.0), _v("Calcimax", "Meyer", 10.0), _v("Gemcal", "Cadila", 11.0)],
        [_v("Calcium+D3", "Jan Aushadhi", 3.0, True, True, False),
         _v("Calcium+D3", "Generic", 5.0, True, False, True)],
        "Calcium+D3"
    ),
    # ── Neurological ────────────────────────────────────────────────────────────
    "gabapentin": _drug(
        "Gabapentin", "300 mg",
        [_v("Neurontin", "Pfizer", 25.0), _v("Gabapin", "Intas", 12.0), _v("Gabantin", "Sun Pharma", 11.0)],
        [_v("Gabapentin", "Jan Aushadhi", 3.5, True, True, False),
         _v("Gabapentin", "Generic", 6.0, True, False, True)],
    ),
    "pregabalin": _drug(
        "Pregabalin", "75 mg",
        [_v("Lyrica", "Pfizer", 45.0), _v("Pregabalin", "Sun Pharma", 20.0), _v("Pregalin", "Torrent", 18.0)],
        [_v("Pregabalin", "Jan Aushadhi", 5.0, True, True, False),
         _v("Pregabalin", "Generic", 8.0, True, False, True)],
    ),
    # ── Psychiatric ─────────────────────────────────────────────────────────────
    "sertraline": _drug(
        "Sertraline Hydrochloride", "50 mg",
        [_v("Zoloft", "Pfizer", 30.0), _v("Sertima", "Intas", 12.0), _v("Daxid", "Pfizer India", 14.0)],
        [_v("Sertraline", "Jan Aushadhi", 3.0, True, True, False),
         _v("Sertraline", "Generic", 5.5, True, False, True)],
    ),
    # ── Allergy ─────────────────────────────────────────────────────────────────
    "cetirizine": _drug(
        "Cetirizine Hydrochloride", "10 mg",
        [_v("Zyrtec", "UCB", 8.0), _v("Cetrizet", "Sun Pharma", 3.0), _v("Okacet", "Cipla", 3.5)],
        [_v("Cetirizine", "Jan Aushadhi", 0.8, True, True, False),
         _v("Cetirizine", "Generic", 1.2, True, False, True)],
    ),
    # ── Anticoagulants ──────────────────────────────────────────────────────────
    "warfarin": _drug(
        "Warfarin Sodium", "5 mg",
        [_v("Coumadin", "BMS", 15.0), _v("Warf", "Cipla", 8.0)],
        [_v("Warfarin", "Jan Aushadhi", 2.0, True, True, False),
         _v("Warfarin", "Generic", 3.5, True, False, True)],
    ),
}

# Aliases: brand names and alternate spellings → DB key
_ALIASES = {
    "lipitor": "atorvastatin", "atorlip": "atorvastatin", "tonact": "atorvastatin",
    "glucophage": "metformin", "glycomet": "metformin", "obimet": "metformin",
    "norvasc": "amlodipine", "stamlo": "amlodipine", "amlogard": "amlodipine",
    "pantocid": "pantoprazole", "pantop": "pantoprazole",
    "omez": "omeprazole", "ocid": "omeprazole",
    "crocin": "paracetamol", "dolo": "paracetamol", "calpol": "paracetamol",
    "brufen": "ibuprofen", "combiflam": "ibuprofen",
    "voveran": "diclofenac", "voltaren": "diclofenac",
    "ecosprin": "aspirin", "disprin": "aspirin",
    "mox": "amoxicillin", "novamox": "amoxicillin",
    "azee": "azithromycin", "azifast": "azithromycin",
    "ciplox": "ciprofloxacin", "cifran": "ciprofloxacin",
    "cardace": "ramipril", "hopace": "ramipril",
    "betaloc": "metoprolol", "metolar": "metoprolol",
    "plavix": "clopidogrel", "clopilet": "clopidogrel", "deplatt": "clopidogrel",
    "micardis": "telmisartan", "telma": "telmisartan",
    "amaryl": "glimepiride", "glimpid": "glimepiride",
    "daonil": "glibenclamide",
    "asthalin": "salbutamol", "ventolin": "salbutamol",
    "singulair": "montelukast", "montair": "montelukast",
    "eltroxin": "levothyroxine", "thyronorm": "levothyroxine",
    "d-rise": "vitamin_d3", "calcirol": "vitamin_d3", "vitamin d3": "vitamin_d3",
    "shelcal": "calcium", "calcimax": "calcium",
    "neurontin": "gabapentin", "gabapin": "gabapentin",
    "lyrica": "pregabalin",
    "zoloft": "sertraline",
    "zyrtec": "cetirizine", "okacet": "cetirizine",
    "motilium": "domperidone", "domstal": "domperidone",
}


def _find_drug(name_lower: str):
    # Direct key match
    if name_lower in DRUG_DATABASE:
        return DRUG_DATABASE[name_lower]
    # Alias match
    if name_lower in _ALIASES:
        return DRUG_DATABASE[_ALIASES[name_lower]]
    # Substring match against keys, aliases, and molecule names
    for key, data in DRUG_DATABASE.items():
        if key in name_lower or name_lower in key:
            return data
        if name_lower in data["molecule"].lower():
            return data
    for alias, key in _ALIASES.items():
        if alias in name_lower or name_lower in alias:
            return DRUG_DATABASE[key]
    return None


@router.get(
    "/drugs/compare",
    response_model=DrugComparison,
    summary="Compare brand drug vs generic alternatives",
    description="Returns brand drug pricing vs generic alternatives including Jan Aushadhi options. Supports 30+ common medications.",
)
async def compare_drugs(
    name: str = Query(..., min_length=2, max_length=100, description="Drug name (brand or generic)")
) -> DrugComparison:
    drug_data = _find_drug(name.strip().lower())

    if not drug_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Drug '{name}' not found. "
                "Supported: atorvastatin, metformin, amlodipine, paracetamol, ibuprofen, "
                "aspirin, amoxicillin, azithromycin, pantoprazole, omeprazole, cetirizine, "
                "ramipril, metoprolol, clopidogrel, telmisartan, gabapentin, pregabalin, "
                "sertraline, levothyroxine, salbutamol, montelukast, and more."
            ),
        )

    brand_variants = drug_data["brand_variants"]
    generic_variants = drug_data["generic_variants"]
    avg_brand = sum(v.price_per_unit for v in brand_variants) / len(brand_variants)
    avg_generic = sum(v.price_per_unit for v in generic_variants) / len(generic_variants)
    savings_pct = round(((avg_brand - avg_generic) / avg_brand) * 100, 1) if avg_brand > 0 else 0

    return DrugComparison(
        brand_drug=drug_data["brand_name"],
        molecule=drug_data["molecule"],
        strength=drug_data["strength"],
        brand_variants=brand_variants,
        generic_variants=generic_variants,
        potential_savings_pct=savings_pct,
    )
