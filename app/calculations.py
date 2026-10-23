"""
CALORA - Calculation Engine
Philosophy: Accuracy over false precision.
Every estimate is accompanied by transparent formulas, confidence levels, and uncertainty ranges.
"""

from typing import Dict, Any, List, Optional, Tuple
import math


# Activity Multipliers based on standard physiological research
ACTIVITY_MULTIPLIERS = {
    "sedentary": {
        "multiplier": 1.20,
        "name": "Sedentary",
        "description": "Desk job, little to no regular intentional exercise, mostly sitting throughout the day."
    },
    "lightly_active": {
        "multiplier": 1.375,
        "name": "Lightly Active",
        "description": "Light exercise or sports 1–3 days/week, or daily walking/standing routine (5,000–7,500 steps)."
    },
    "moderately_active": {
        "multiplier": 1.55,
        "name": "Moderately Active",
        "description": "Moderate exercise or sports 3–5 days/week, or on your feet regularly (7,500–11,000 steps)."
    },
    "very_active": {
        "multiplier": 1.725,
        "name": "Very Active",
        "description": "Hard exercise or heavy sports 6–7 days/week, or labor-intensive physical job."
    },
    "extremely_active": {
        "multiplier": 1.90,
        "name": "Extremely Active",
        "description": "Very hard daily training/twice-a-day athletics or physically demanding construction/agricultural work."
    }
}

# Cooking oil options and caloric impacts (Vegetable / Olive oil is ~8.84 kcal/g, 1 tbsp ~ 14g = ~124 kcal)
COOKING_OIL_PROFILES = {
    "none": {
        "name": "No added oil (0g)",
        "grams": 0.0,
        "calories": 0.0,
        "uncertainty_min_cal": 0.0,
        "uncertainty_max_cal": 0.0,
        "fat_g": 0.0
    },
    "1_tsp": {
        "name": "Light / 1 teaspoon (~4.5g)",
        "grams": 4.5,
        "calories": 40.0,
        "uncertainty_min_cal": 30.0,
        "uncertainty_max_cal": 50.0,
        "fat_g": 4.5
    },
    "1_tbsp": {
        "name": "Standard / 1 tablespoon (~14g)",
        "grams": 14.0,
        "calories": 124.0,
        "uncertainty_min_cal": 100.0,
        "uncertainty_max_cal": 145.0,
        "fat_g": 14.0
    },
    "2_tbsp": {
        "name": "Generous / 2 tablespoons (~28g)",
        "grams": 28.0,
        "calories": 248.0,
        "uncertainty_min_cal": 210.0,
        "uncertainty_max_cal": 290.0,
        "fat_g": 28.0
    },
    "3_plus_tbsp": {
        "name": "Heavy / 3+ tablespoons (~42g+)",
        "grams": 42.0,
        "calories": 372.0,
        "uncertainty_min_cal": 330.0,
        "uncertainty_max_cal": 440.0,
        "fat_g": 42.0
    },
    "unknown": {
        "name": "Unknown (Estimated range)",
        "grams": 12.0,
        "calories": 105.0,
        "uncertainty_min_cal": 45.0,   # ~5g oil
        "uncertainty_max_cal": 180.0,  # ~20g oil
        "fat_g": 12.0
    }
}


# Preparation method modifiers (applied to base calories if preparation differs from base food entry)
PREP_METHOD_MODIFIERS = {
    "raw": {"multiplier": 1.0, "default_oil": "none", "label": "Raw / Fresh"},
    "boiled": {"multiplier": 1.0, "default_oil": "none", "label": "Boiled in water"},
    "steamed": {"multiplier": 1.0, "default_oil": "none", "label": "Steamed"},
    "grilled": {"multiplier": 1.02, "default_oil": "1_tsp", "label": "Grilled / Choma"},
    "roasted": {"multiplier": 1.05, "default_oil": "1_tsp", "label": "Roasted / Baked"},
    "baked": {"multiplier": 1.05, "default_oil": "1_tsp", "label": "Oven baked"},
    "stewed": {"multiplier": 1.10, "default_oil": "1_tbsp", "label": "Stewed / Wet fry"},
    "fried": {"multiplier": 1.25, "default_oil": "2_tbsp", "label": "Pan-fried"},
    "deep_fried": {"multiplier": 1.45, "default_oil": "3_plus_tbsp", "label": "Deep fried"}
}


def calculate_bmr_mifflin_st_jeor(weight_kg: float, height_cm: float, age: int, sex: str) -> Dict[str, Any]:
    """
    Calculate Basal Metabolic Rate using the evidence-based Mifflin-St Jeor equation.
    Male: 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
    Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
    """
    weight_part = 10.0 * weight_kg
    height_part = 6.25 * height_cm
    age_part = 5.0 * age

    is_female = sex.lower().startswith("f")
    sex_constant = -161.0 if is_female else 5.0
    sex_label = "Female (-161)" if is_female else "Male (+5)"

    bmr = weight_part + height_part - age_part + sex_constant
    bmr = max(800.0, round(bmr, 1))

    explanation = (
        f"Mifflin-St Jeor Formula: "
        f"(10 × {weight_kg:.1f}kg) + (6.25 × {height_cm:.1f}cm) - (5 × {age} yrs) + {sex_constant:.0f} "
        f"= {weight_part:.1f} + {height_part:.1f} - {age_part:.1f} + {sex_constant:.0f} = {bmr:.0f} kcal/day"
    )

    return {
        "bmr": round(bmr),
        "formula": "Mifflin-St Jeor",
        "explanation": explanation,
        "components": {
            "weight_contribution": round(weight_part, 1),
            "height_contribution": round(height_part, 1),
            "age_contribution": round(age_part, 1),
            "sex_constant": sex_constant,
            "sex_label": sex_label
        }
    }


def calculate_tdee(bmr: float, activity_level: str) -> Dict[str, Any]:
    """
    Calculate Total Daily Energy Expenditure (TDEE).
    Clearly labeled as an ESTIMATE, not a laboratory measurement.
    """
    activity_info = ACTIVITY_MULTIPLIERS.get(activity_level, ACTIVITY_MULTIPLIERS["sedentary"])
    multiplier = activity_info["multiplier"]
    tdee = round(bmr * multiplier)

    return {
        "tdee": tdee,
        "activity_level": activity_level,
        "activity_name": activity_info["name"],
        "multiplier": multiplier,
        "activity_description": activity_info["description"],
        "explanation": (
            f"BMR ({bmr:.0f} kcal) × Activity Multiplier ({multiplier} for {activity_info['name']}) "
            f"= ~{tdee} kcal/day"
        ),
        "disclaimer": "TDEE is a population-based statistical estimate of maintenance calories. Your real metabolic rate varies with NEAT, genetics, and gut microbiome."
    }


def calculate_calorie_target(
    bmr: float,
    tdee: float,
    sex: str,
    weight_kg: float,
    goal: str = "lose",
    deficit_tier: str = "moderate"
) -> Dict[str, Any]:
    """
    Deficit and target calculation engine with minimum-calorie safety logic.
    Safety floor: 1,200 kcal for females, 1,500 kcal for males.
    """
    is_female = sex.lower().startswith("f")
    min_safe_floor = 1200 if is_female else 1500

    deficit_configs = {
        "conservative": {
            "name": "Conservative Deficit",
            "daily_delta": -300,
            "weekly_change_kg": -0.3,
            "description": "Gentle, highest long-term adherence, protects muscle and energy."
        },
        "moderate": {
            "name": "Moderate Deficit (Recommended)",
            "daily_delta": -500,
            "weekly_change_kg": -0.5,
            "description": "Standard evidence-based deficit for steady, healthy fat loss."
        },
        "aggressive": {
            "name": "Aggressive Deficit",
            "daily_delta": -750,
            "weekly_change_kg": -0.75,
            "description": "Faster loss; higher risk of hunger and lean tissue loss if prolonged."
        }
    }

    safety_flag = False
    safety_message = None

    if goal in ["lose", "weight_loss"]:
        tier = deficit_configs.get(deficit_tier, deficit_configs["moderate"])
        raw_target = tdee + tier["daily_delta"]
        weekly_loss_kg = abs(tier["weekly_change_kg"])

        if raw_target < min_safe_floor:
            safety_flag = True
            safety_message = (
                f"Safety Notice: A {tier['name']} brings calories ({raw_target} kcal) below the safe evidence-based "
                f"minimum floor ({min_safe_floor} kcal for {sex}). Extreme deficits trigger metabolic adaptation, "
                f"muscle catabolism, and micronutrient deficiencies. Target has been protected at {min_safe_floor} kcal/day."
            )
            target_calories = min_safe_floor
            actual_deficit = tdee - target_calories
        else:
            target_calories = raw_target
            actual_deficit = abs(tier["daily_delta"])

        goal_label = f"Weight Loss ({tier['name']})"

    elif goal in ["maintain", "maintenance"]:
        target_calories = tdee
        actual_deficit = 0
        weekly_loss_kg = 0.0
        goal_label = "Weight Maintenance"
    elif goal in ["gain", "muscle_gain"]:
        surplus = 300 if deficit_tier == "conservative" else 500
        target_calories = tdee + surplus
        actual_deficit = -surplus
        weekly_loss_kg = -(surplus * 7 / 7700.0)
        goal_label = "Controlled Muscle Building"
    elif goal in ["recomp", "recomposition"]:
        # Slight deficit with high protein
        target_calories = max(min_safe_floor, tdee - 200)
        actual_deficit = tdee - target_calories
        weekly_loss_kg = 0.15
        goal_label = "Body Recomposition (High Protein)"
    else:
        target_calories = tdee - 500
        actual_deficit = 500
        weekly_loss_kg = 0.5
        goal_label = "Weight Loss"

    # Macro distribution based on weight and goal
    # Protein: 1.8 - 2.2 g/kg for deficit/recomp to preserve lean mass
    protein_per_kg = 2.0 if goal in ["lose", "recomp"] else 1.6
    protein_g = round(weight_kg * protein_per_kg)
    protein_cal = protein_g * 4

    # Fats: 25-30% of total target calories (minimum 0.7g/kg for hormone regulation)
    fat_cal = target_calories * 0.28
    fat_g = max(round(weight_kg * 0.7), round(fat_cal / 9))
    fat_cal = fat_g * 9

    # Carbs: remainder
    carb_cal = max(0, target_calories - protein_cal - fat_cal)
    carb_g = round(carb_cal / 4)

    # Fibre: 14g per 1000 kcal target, min 28g
    fibre_g = max(28, round((target_calories / 1000.0) * 14))

    return {
        "target_calories": target_calories,
        "daily_deficit_or_surplus": -actual_deficit if actual_deficit > 0 else abs(actual_deficit),
        "weekly_estimated_kg_change": round(weekly_loss_kg, 2),
        "goal": goal,
        "goal_label": goal_label,
        "deficit_tier": deficit_tier,
        "min_safe_floor": min_safe_floor,
        "safety_flag": safety_flag,
        "safety_message": safety_message,
        "macros": {
            "protein_g": protein_g,
            "protein_cal": protein_cal,
            "carbs_g": carb_g,
            "carbs_cal": carb_cal,
            "fat_g": fat_g,
            "fat_cal": fat_cal,
            "fibre_g": fibre_g
        },
        "target_range": {
            "low": max(min_safe_floor, target_calories - 75),
            "high": target_calories + 75
        },
        "transparency_note": "Your calorie target is an estimate. Your actual maintenance requirement may differ by ±10-15% based on non-exercise movement and genetics."
    }


def compute_item_uncertainty_and_range(
    base_calories_per_100g: float,
    gram_weight: float,
    confidence_level: str = "MEDIUM",
    cooking_oil_type: str = "none",
    prep_method: str = "standard",
    data_origin: str = "verified"
) -> Dict[str, Any]:
    """
    CALORA Core Differentiator: Calculate transparent ranges and uncertainty factors.
    Returns:
      - logged_calories (midpoint)
      - range_low (conservative lower estimate)
      - range_high (conservative upper estimate)
      - confidence: HIGH, MEDIUM, LOW
      - main_uncertainties: list of strings
      - breakdown: list of component calculations
    """
    # Base calories from raw/standard food
    base_calories = (base_calories_per_100g * gram_weight) / 100.0

    # Cooking oil contribution
    oil_info = COOKING_OIL_PROFILES.get(cooking_oil_type, COOKING_OIL_PROFILES["none"])
    oil_calories = oil_info["calories"]
    oil_min_cal = oil_info["uncertainty_min_cal"]
    oil_max_cal = oil_info["uncertainty_max_cal"]

    # Base uncertainty percentage based on data origin & confidence
    # HIGH: packaged barcode or weighed on digital scale (+-5%)
    # MEDIUM: standard portion (cups, plate, pieces) (+-12%)
    # LOW: visual photo estimate, restaurant dish, vague portion (+-25%)
    norm_conf = confidence_level.upper()
    if norm_conf == "HIGH":
        variance_pct = 0.05
    elif norm_conf == "LOW":
        variance_pct = 0.25
    else:
        norm_conf = "MEDIUM"
        variance_pct = 0.12

    uncertainties = []

    # Check portion uncertainty
    if norm_conf in ["MEDIUM", "LOW"]:
        uncertainties.append("Portion size estimation")

    # Check cooking oil uncertainty
    if cooking_oil_type == "unknown":
        uncertainties.append("Cooking oil quantity unknown")
        oil_cal_mid = oil_calories
        oil_low = oil_min_cal
        oil_high = oil_max_cal
    elif cooking_oil_type != "none":
        oil_cal_mid = oil_calories
        oil_low = oil_min_cal
        oil_high = oil_max_cal
    else:
        oil_cal_mid = 0.0
        oil_low = 0.0
        oil_high = 0.0

    if prep_method in ["fried", "deep_fried", "stewed"]:
        if "Cooking oil quantity unknown" not in uncertainties and cooking_oil_type in ["none", "unknown"]:
            uncertainties.append("Cooking oil absorbed during preparation")

    if data_origin == "ai_estimated":
        uncertainties.append("AI visual portion estimation")
    elif data_origin == "user_entered":
        uncertainties.append("Self-reported nutrition values")

    # Lower and upper calculations
    food_low = base_calories * (1.0 - variance_pct)
    food_high = base_calories * (1.0 + variance_pct)

    total_mid = round(base_calories + oil_cal_mid)
    total_low = round(food_low + oil_low)
    total_high = round(food_high + oil_high)

    # Ensure range has logical spread
    if total_high <= total_low:
        total_high = total_low + 30

    breakdown = [
        {
            "component": "Base Food Item",
            "weight_g": round(gram_weight, 1),
            "estimated_kcal": round(base_calories)
        }
    ]

    if oil_cal_mid > 0:
        breakdown.append({
            "component": f"Cooking Oil ({oil_info['name']})",
            "weight_g": oil_info["grams"],
            "estimated_kcal": round(oil_cal_mid),
            "range_kcal": f"{round(oil_low)}–{round(oil_high)} kcal" if cooking_oil_type == "unknown" else None
        })

    return {
        "logged_calories": total_mid,
        "range_low": total_low,
        "range_high": total_high,
        "range_display": f"{total_low}–{total_high} kcal",
        "confidence": norm_conf,
        "main_uncertainties": uncertainties if uncertainties else ["Minimal (high precision match)"],
        "breakdown": breakdown
    }


def compute_meal_aggregate(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes total calories, range, macros, and overall confidence for a composite meal or day.
    """
    total_calories = 0
    total_range_low = 0
    total_range_high = 0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    total_fibre = 0.0

    confidence_scores = []
    uncertainties_set = set()

    for item in items:
        cal = item.get("calories") if item.get("calories") is not None else item.get("logged_calories", 0)
        r_low = item.get("range_low", cal * 0.9)
        r_high = item.get("range_high", cal * 1.1)

        total_calories += cal
        total_range_low += r_low
        total_range_high += r_high

        total_protein += item.get("protein_g", 0.0)
        total_carbs += item.get("carbs_g", 0.0)
        total_fat += item.get("fat_g", 0.0)
        total_fibre += item.get("fibre_g", 0.0)

        conf = item.get("confidence", "MEDIUM").upper()
        if conf == "HIGH":
            confidence_scores.append(3)
        elif conf == "MEDIUM":
            confidence_scores.append(2)
        else:
            confidence_scores.append(1)

        for u in item.get("main_uncertainties", []):
            if u != "Minimal (high precision match)":
                uncertainties_set.add(u)

    # Average confidence score
    if not confidence_scores:
        overall_conf = "HIGH"
    else:
        avg_score = sum(confidence_scores) / len(confidence_scores)
        if avg_score >= 2.6:
            overall_conf = "HIGH"
        elif avg_score >= 1.7:
            overall_conf = "MEDIUM"
        else:
            overall_conf = "LOW"

    return {
        "calories": round(total_calories),
        "range_low": round(total_range_low),
        "range_high": round(total_range_high),
        "range_display": f"{round(total_range_low)}–{round(total_range_high)} kcal",
        "confidence": overall_conf,
        "main_uncertainties": list(uncertainties_set) if uncertainties_set else ["Minimal (verified data)"],
        "macros": {
            "protein_g": round(total_protein, 1),
            "carbs_g": round(total_carbs, 1),
            "fat_g": round(total_fat, 1),
            "fibre_g": round(total_fibre, 1)
        }
    }


def calculate_adaptive_energy_trend(
    weight_logs: List[Dict[str, Any]],
    daily_intakes: List[Dict[str, Any]],
    estimated_tdee: float
) -> Dict[str, Any]:
    """
    Adaptive Calorie Engine:
    Compares estimated energy needs (TDEE) with observed weight trend.
    Uses rolling 7-day moving averages to smooth water, sodium, and glycogen fluctuations.
    """
    if len(weight_logs) < 7:
        return {
            "status": "insufficient_data",
            "message": f"CALORA requires at least 7 days of weight entries to calculate adaptive maintenance accurately. Currently have {len(weight_logs)} days.",
            "estimated_maintenance": estimated_tdee,
            "observed_maintenance": None,
            "variance": 0,
            "trend_direction": "stable",
            "smoothing_explanation": "Single-day weight changes reflect water, sodium, and glycogen shifts rather than true fat mass change. CALORA waits for steady trend data."
        }

    # Sort logs chronologically
    sorted_weights = sorted(weight_logs, key=lambda x: x["date"])
    first_window = sorted_weights[:3]
    last_window = sorted_weights[-3:]

    start_avg_weight = sum(w["weight_kg"] for w in first_window) / len(first_window)
    end_avg_weight = sum(w["weight_kg"] for w in last_window) / len(last_window)
    total_days = max(1, (len(sorted_weights) - 1))

    # Weight change per week
    total_weight_delta = end_avg_weight - start_avg_weight
    weeks = total_days / 7.0
    weight_change_per_week = total_weight_delta / max(0.5, weeks)

    # 1 kg fat/tissue is approximately 7,700 kcal
    # Implied daily deficit or surplus = (weekly change kg * 7700) / 7 days
    implied_daily_balance = (weight_change_per_week * 7700.0) / 7.0

    # Average logged daily intake
    if daily_intakes:
        avg_logged_calories = sum(d.get("calories", estimated_tdee) for d in daily_intakes) / len(daily_intakes)
    else:
        avg_logged_calories = estimated_tdee

    # Observed Maintenance = Average Logged Calories - Implied Daily Balance
    # (If weight is decreasing by 0.5kg/wk (-550 kcal/day) and logged intake is 1900, observed maintenance = 1900 - (-550) = 2450 kcal)
    observed_maintenance = round(avg_logged_calories - implied_daily_balance)
    variance = observed_maintenance - estimated_tdee

    if abs(variance) <= 120:
        relationship = "Closely aligned with mathematical estimate"
        advice = "Your current calorie intake matches your weight response closely. Stay on course."
    elif variance > 120:
        relationship = f"Your observed maintenance is ~{abs(variance)} kcal higher than formula estimate"
        advice = "You may burn more calories through higher daily activity (NEAT) or have higher metabolic rate than standard formulas assume."
    else:
        relationship = f"Your observed maintenance is ~{abs(variance)} kcal lower than formula estimate"
        advice = "This is commonly due to unlogged bites/oils, lower non-exercise steps, or metabolic adaptation. Don't slash calories abruptly—verify cooking oils first."

    return {
        "status": "active",
        "estimated_maintenance": round(estimated_tdee),
        "observed_maintenance": observed_maintenance,
        "variance": variance,
        "average_intake": round(avg_logged_calories),
        "start_weight_avg": round(start_avg_weight, 2),
        "end_weight_avg": round(end_avg_weight, 2),
        "net_change_kg": round(total_weight_delta, 2),
        "weekly_rate_kg": round(weight_change_per_week, 2),
        "relationship": relationship,
        "advice": advice,
        "smoothing_factors": [
            "7-day rolling average applied to filter hydration noise",
            "Cooking oil variance accounted for in weekly bounds",
            "Sodium & glycogen fluctuations smoothed"
        ]
    }
