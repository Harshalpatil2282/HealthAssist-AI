"""
HealthAssist Tests — Emergency Detection
Critical recall target: > 0.95 for all languages
"""

import pytest
from app.core.nlp.emergency_detector import detect_emergency, build_emergency_alert


class TestEmergencyDetection:

    # ── English ───────────────────────────────────────────────────────────────
    def test_emergency_detection_chest_pain(self):
        """CRITICAL: Must detect 'chest pain' as emergency."""
        is_emg, matched = detect_emergency("I have severe chest pain since last hour")
        assert is_emg is True, "chest pain must trigger emergency"
        assert any("chest pain" in kw for kw in matched)

    def test_emergency_detection_heart_attack(self):
        is_emg, matched = detect_emergency("my father is having a heart attack right now")
        assert is_emg is True
        assert len(matched) >= 1

    def test_emergency_detection_stroke(self):
        is_emg, matched = detect_emergency("sudden stroke, face drooping, can't speak")
        assert is_emg is True

    def test_emergency_detection_difficulty_breathing(self):
        is_emg, matched = detect_emergency("difficulty breathing can't breathe at all")
        assert is_emg is True

    def test_emergency_detection_seizure(self):
        is_emg, matched = detect_emergency("patient is having seizure, shaking violently")
        assert is_emg is True

    def test_emergency_detection_suicide(self):
        is_emg, matched = detect_emergency("I want to kill myself, feeling suicidal")
        assert is_emg is True

    def test_emergency_detection_unconscious(self):
        is_emg, matched = detect_emergency("person is unconscious and not responding")
        assert is_emg is True

    def test_emergency_detection_heavy_bleeding(self):
        is_emg, matched = detect_emergency("bleeding heavily after accident")
        assert is_emg is True

    # ── Hindi ─────────────────────────────────────────────────────────────────
    def test_emergency_detection_hindi_query(self):
        """CRITICAL: Must detect Hindi emergency keywords."""
        is_emg, matched = detect_emergency("मुझे सीने में दर्द हो रहा है")
        assert is_emg is True, "Hindi chest pain keyword must trigger emergency"

    def test_emergency_detection_hindi_heart_attack(self):
        is_emg, matched = detect_emergency("दिल का दौरा पड़ रहा है")
        assert is_emg is True, "Hindi heart attack must trigger emergency"

    # ── Marathi ───────────────────────────────────────────────────────────────
    def test_emergency_detection_marathi_query(self):
        is_emg, matched = detect_emergency("छाती दुखणे खूप जास्त आहे")
        assert is_emg is True, "Marathi chest pain keyword must trigger emergency"

    # ── Non-emergency should NOT trigger ─────────────────────────────────────
    def test_no_false_positive_routine_query(self):
        is_emg, matched = detect_emergency("knee replacement in Pune, diabetic patient, 62 years")
        assert is_emg is False, "Routine knee replacement query must NOT be flagged as emergency"

    def test_no_false_positive_drug_query(self):
        is_emg, matched = detect_emergency("what is the generic alternative for atorvastatin")
        assert is_emg is False

    def test_no_false_positive_hospital_query(self):
        is_emg, matched = detect_emergency("best cardiology hospital in Mumbai under budget 3 lakhs")
        assert is_emg is False

    # ── Emergency alert structure ─────────────────────────────────────────────
    def test_emergency_alert_contains_helpline(self):
        _, matched = detect_emergency("chest pain")
        alert = build_emergency_alert(matched)
        assert alert.helpline_national == "112"
        assert "emergency" in alert.action.lower()
        assert len(alert.detected_keywords) >= 1

    def test_emergency_alert_contains_aiims_helpline(self):
        _, matched = detect_emergency("heart attack")
        alert = build_emergency_alert(matched)
        assert alert.helpline_aiims is not None
        assert len(alert.helpline_aiims) > 0
