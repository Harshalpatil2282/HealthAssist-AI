"""HealthAssist — Reputation Score Calculator"""

from __future__ import annotations

from typing import List


def calculate_reputation_score(
    google_rating: float,           # 1.0 – 5.0
    review_count: int,
    accreditation: List[str],
    sentiment_score: float = 0.0,  # -1.0 to 1.0 (NLP polarity)
) -> float:
    """
    Score 0–100 based on reputation signals.
    
    Components:
    - Google rating (normalized):   0–40 pts
    - Review volume confidence:     0–15 pts
    - NLP sentiment bonus:          0–10 pts
    - NABH accreditation:          +20 pts
    - JCI accreditation:           +15 pts
    """
    score = 0.0

    # ── Rating (0–40 pts) ─────────────────────────────────────────────────────
    if google_rating and google_rating > 0:
        # 1.0 → 0 pts, 5.0 → 40 pts
        score += ((google_rating - 1.0) / 4.0) * 40.0

    # ── Review volume confidence (0–15 pts) ───────────────────────────────────
    if review_count >= 500:
        score += 15.0
    elif review_count >= 200:
        score += 10.0
    elif review_count >= 50:
        score += 5.0
    elif review_count >= 10:
        score += 2.0

    # ── Sentiment bonus (0–10 pts) ────────────────────────────────────────────
    # sentiment_score: -1 (very negative) to +1 (very positive)
    if sentiment_score > 0:
        score += sentiment_score * 10.0

    # ── Accreditation bonuses ─────────────────────────────────────────────────
    accred_upper = [a.upper() for a in accreditation]
    if "NABH" in accred_upper:
        score += 20.0
    if "JCI" in accred_upper:
        score += 15.0
    if "NABL" in accred_upper:
        score += 5.0

    return min(100.0, round(score, 1))
