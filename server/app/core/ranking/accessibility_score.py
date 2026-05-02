"""HealthAssist — Accessibility Score Calculator"""

from __future__ import annotations

import math


def calculate_accessibility_score(
    distance_km: float,
    city_classification: str = "urban",   # "urban" | "semi_urban" | "rural"
    emergency_services: bool = False,
) -> float:
    """
    Score 0–100 based on accessibility signals.
    
    Components:
    - Distance (inverse scoring):  0–70 pts
    - Transport / urban bonus:     0–20 pts
    - Emergency services:         +10 pts
    """
    score = 0.0

    # ── Distance scoring (0–70 pts, inverse) ─────────────────────────────────
    # 0 km → 70 pts, 50+ km → ~0 pts
    if distance_km <= 0:
        distance_score = 70.0
    elif distance_km <= 5:
        distance_score = 70.0
    else:
        # Exponential decay: score = 70 * e^(-0.04 * km)
        distance_score = 70.0 * math.exp(-0.04 * distance_km)

    score += max(0.0, distance_score)

    # ── Transport / urban bonus (0–20 pts) ────────────────────────────────────
    urban_bonus = {"urban": 20.0, "semi_urban": 10.0, "rural": 0.0}
    score += urban_bonus.get(city_classification.lower(), 10.0)

    # ── Emergency services bonus ──────────────────────────────────────────────
    if emergency_services:
        score += 10.0

    return min(100.0, round(score, 1))
