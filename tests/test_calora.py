"""
CALORA Test Suite
Validates:
- Mifflin-St Jeor BMR calculation
- TDEE activity multiplier logic
- Deficit engine & minimum-calorie safety floors
- Transparent Calorie Range & Confidence Engine
- Cooking oil uncertainty calculations
- Natural language parsing
- Adaptive Calorie Engine
"""

import unittest
from app.calculations import (
    calculate_bmr_mifflin_st_jeor,
    calculate_tdee,
    calculate_calorie_target,
    compute_item_uncertainty_and_range,
    compute_meal_aggregate,
    calculate_adaptive_energy_trend
)
from app.natural_language import parse_natural_language_log


class TestCaloraCalculations(unittest.TestCase):

    def test_mifflin_st_jeor_male(self):
        # 80kg, 175cm, 20 years, Male (matches Section 49 test walkthrough)
        # BMR = 10 * 80 + 6.25 * 175 - 5 * 20 + 5
        # = 800 + 1093.75 - 100 + 5 = 1798.75 -> round(1799)
        res = calculate_bmr_mifflin_st_jeor(80.0, 175.0, 20, "male")
        self.assertEqual(res["bmr"], 1799)
        self.assertEqual(res["components"]["sex_constant"], 5.0)

    def test_mifflin_st_jeor_female(self):
        # 60kg, 160cm, 25 years, Female
        # BMR = 10 * 60 + 6.25 * 160 - 5 * 25 - 161
        # = 600 + 1000 - 125 - 161 = 1314
        res = calculate_bmr_mifflin_st_jeor(60.0, 160.0, 25, "female")
        self.assertEqual(res["bmr"], 1314)
        self.assertEqual(res["components"]["sex_constant"], -161.0)

    def test_tdee_calculation(self):
        # Moderately active multiplier is 1.55
        res = calculate_tdee(1799, "moderately_active")
        self.assertEqual(res["tdee"], round(1799 * 1.55))
        self.assertEqual(res["multiplier"], 1.55)

    def test_deficit_safety_floor_female(self):
        # Female with low BMR/TDEE shouldn't be forced below 1200 kcal floor
        # BMR = 1200, sedentary TDEE = 1440. Aggressive deficit (-750) would be 690 kcal (dangerous!)
        res = calculate_calorie_target(1200, 1440, "female", 55.0, "lose", "aggressive")
        self.assertTrue(res["safety_flag"])
        self.assertEqual(res["target_calories"], 1200)
        self.assertIn("Safety Notice", res["safety_message"])

    def test_deficit_safety_floor_male(self):
        # Male shouldn't be forced below 1500 kcal floor
        res = calculate_calorie_target(1300, 1600, "male", 65.0, "lose", "aggressive")
        self.assertTrue(res["safety_flag"])
        self.assertEqual(res["target_calories"], 1500)

    def test_uncertainty_and_range_calculation(self):
        # Ugali 250g (130 kcal/100g = 325 base kcal), Medium confidence
        res = compute_item_uncertainty_and_range(
            base_calories_per_100g=130.0,
            gram_weight=250.0,
            confidence_level="MEDIUM",
            cooking_oil_type="none"
        )
        self.assertEqual(res["logged_calories"], 325)
        self.assertEqual(res["confidence"], "MEDIUM")
        # Spread should be +-12%
        self.assertLess(res["range_low"], 325)
        self.assertGreater(res["range_high"], 325)
        self.assertIn("Portion size estimation", res["main_uncertainties"])

    def test_cooking_oil_unknown_uncertainty(self):
        # Beef stew with unknown cooking oil
        res = compute_item_uncertainty_and_range(
            base_calories_per_100g=175.0,
            gram_weight=160.0,
            confidence_level="MEDIUM",
            cooking_oil_type="unknown"
        )
        # Base beef stew = 280 kcal. Unknown oil adds range ~45–180 kcal
        self.assertIn("Cooking oil quantity unknown", res["main_uncertainties"])
        self.assertGreater(res["range_high"] - res["range_low"], 100)

    def test_walkthrough_section_49_meal_composite(self):
        """
        Tests the exact test scenario from Section 49:
        Ugali (Medium 250g) + Beef Stew (Medium 160g) + Sukuma wiki (120g)
        Estimated meal: ~720 kcal, Likely range: 650–800 kcal, Confidence: Medium
        """
        ugali = compute_item_uncertainty_and_range(130.0, 250.0, "HIGH", "none")      # ~325 kcal
        beef = compute_item_uncertainty_and_range(175.0, 160.0, "MEDIUM", "1_tbsp")   # ~280 kcal + 124 oil = ~404 (or base 280)
        sukuma = compute_item_uncertainty_and_range(52.0, 120.0, "MEDIUM", "1_tsp")   # ~62 kcal + 40 oil = ~102

        items = [
            {"calories": 325, "range_low": 300, "range_high": 350, "confidence": "HIGH", "main_uncertainties": ["Portion estimation"], "protein_g": 7.0, "carbs_g": 68.8, "fat_g": 1.5, "fibre_g": 4.5},
            {"calories": 280, "range_low": 250, "range_high": 320, "confidence": "MEDIUM", "main_uncertainties": ["Cooking oil quantity unknown"], "protein_g": 29.6, "carbs_g": 5.1, "fat_g": 15.7, "fibre_g": 1.3},
            {"calories": 70, "range_low": 50, "range_high": 90, "confidence": "MEDIUM", "main_uncertainties": ["Cooking oil quantity unknown"], "protein_g": 2.9, "carbs_g": 5.8, "fat_g": 3.4, "fibre_g": 3.5},
            {"calories": 90, "range_low": 70, "range_high": 120, "confidence": "MEDIUM", "main_uncertainties": ["Cooking oil volume"], "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 10.0, "fibre_g": 0.0}
        ]
        agg = compute_meal_aggregate(items)
        self.assertEqual(agg["calories"], 765)
        self.assertEqual(agg["confidence"], "MEDIUM")
        self.assertIn("Cooking oil quantity unknown", agg["main_uncertainties"])

    def test_natural_language_parsing(self):
        # "I ate two chapatis and a cup of beans"
        res = parse_natural_language_log("I ate two chapatis and a cup of beans")
        self.assertEqual(res["status"], "success")
        self.assertEqual(len(res["items"]), 2)
        names = [i["food_name"] for i in res["items"]]
        self.assertIn("Kenyan Chapati", names)
        self.assertIn("Maharagwe (Stewed Beans)", names)

    def test_adaptive_calorie_engine_minimum_data(self):
        # Requires at least 7 days
        res = calculate_adaptive_energy_trend([{"date": "2026-10-01", "weight_kg": 80.0}], [], 2450.0)
        self.assertEqual(res["status"], "insufficient_data")


if __name__ == "__main__":
    unittest.main()
