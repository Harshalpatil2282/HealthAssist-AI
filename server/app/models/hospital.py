"""HealthAssist — Hospital ORM Model"""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.models.base import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    pincode = Column(String(6), nullable=False, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    # Classification
    hospital_type = Column(String(20), nullable=False)   # govt | private | trust
    tier = Column(String(20), nullable=False)             # budget | mid | premium

    # Capabilities
    specializations = Column(JSON, default=list)          # ["Cardiology", "Orthopedics"]
    accreditation = Column(JSON, default=list)            # ["NABH", "JCI"]
    procedures_offered = Column(JSON, default=list)

    # Bed capacity
    total_beds = Column(Integer, nullable=True)
    icu_beds = Column(Integer, nullable=True)
    general_beds = Column(Integer, nullable=True)

    # Ratings
    google_rating = Column(Float, nullable=True)
    review_count = Column(Integer, default=0)
    sentiment_score = Column(Float, nullable=True)

    # Financial
    accepts_pmjay = Column(Boolean, default=False)
    empanelled_cghs = Column(Boolean, default=False)

    # Contact
    phone = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)

    # Services
    emergency_services = Column(Boolean, default=False)
    established_year = Column(Integer, nullable=True)

    # Relationships
    cost_benchmarks = relationship("CostBenchmark", back_populates="hospital")
