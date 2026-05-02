"""HealthAssist — Drug ORM Model"""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, JSON
from app.models.base import Base


class Drug(Base):
    __tablename__ = "drugs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_name = Column(String(255), nullable=False, index=True)
    molecule = Column(String(255), nullable=False, index=True)   # Active ingredient
    strength = Column(String(50), nullable=True)
    unit = Column(String(20), nullable=True)   # tablet | ml | vial
    manufacturer = Column(String(255), nullable=True)
    price_per_unit = Column(Float, nullable=True)   # INR
    is_generic = Column(Boolean, default=False)
    available_jan_aushadhi = Column(Boolean, default=False)
    notes = Column(String(500), nullable=True)
    therapeutic_class = Column(String(100), nullable=True)

    # Related brands/generics (list of drug IDs)
    alternatives = Column(JSON, default=list)
