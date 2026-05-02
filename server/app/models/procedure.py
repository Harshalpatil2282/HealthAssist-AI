"""HealthAssist — Procedure ORM Model (ICD-10 / SNOMED mapping)"""

from __future__ import annotations

from sqlalchemy import Column, Float, Integer, String, JSON, Text
from app.models.base import Base


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_code = Column(String(20), unique=True, nullable=False, index=True)
    procedure_name = Column(String(255), nullable=False, index=True)
    procedure_name_hi = Column(String(255), nullable=True)   # Hindi
    procedure_name_mr = Column(String(255), nullable=True)   # Marathi
    icd10_code = Column(String(20), nullable=True, index=True)
    snomed_code = Column(String(20), nullable=True)
    body_system = Column(String(100), nullable=True)
    procedure_category = Column(String(100), nullable=True)

    # Expected stay (days)
    expected_stay_general_min = Column(Integer, default=1)
    expected_stay_general_max = Column(Integer, default=3)
    expected_icu_days = Column(Integer, default=0)

    # Synonyms for fuzzy matching
    synonyms = Column(JSON, default=list)

    # Standard diagnostics pre-op (list of items)
    pre_op_diagnostics = Column(JSON, default=list)

    # Standard medications post-op
    post_op_medications = Column(JSON, default=list)
