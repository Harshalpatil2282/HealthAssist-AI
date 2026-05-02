"""HealthAssist — Cost Benchmark ORM Model (CGHS / PMJAY rates)"""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class CostBenchmark(Base):
    __tablename__ = "cost_benchmarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_code = Column(String(20), nullable=False, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)

    # CGHS rates (INR)
    cghs_rate_min = Column(Integer, nullable=True)
    cghs_rate_max = Column(Integer, nullable=True)

    # PMJAY package rate
    pmjay_package_rate = Column(Integer, nullable=True)

    # Synthetic benchmark rates by city tier
    synthetic_tier2_min = Column(Integer, nullable=True)
    synthetic_tier2_max = Column(Integer, nullable=True)
    synthetic_metro_min = Column(Integer, nullable=True)
    synthetic_metro_max = Column(Integer, nullable=True)

    # Room rates (INR / day)
    room_general_rate = Column(Integer, default=2000)
    room_semi_private_rate = Column(Integer, default=4000)
    room_private_rate = Column(Integer, default=8000)
    room_icu_rate = Column(Integer, default=20000)

    is_synthetic = Column(Boolean, default=False)
    data_source = Column(String(100), nullable=True)  # "CGHS_2022" | "PMJAY" | "synthetic"

    # Relationship
    hospital = relationship("Hospital", back_populates="cost_benchmarks")
