"""
CALORA - Natural Language Food Logging & Photo Recognition Engine
Under product philosophy:
1. Parse food items, quantities, and preparation clues
2. If portions or cooking oil are ambiguous, DO NOT invent false precision — ASK the user
3. Produce transparent range, confidence, and uncertainty notes
"""

import re
from typing import Dict, Any, List, Optional
from app.database import get_db_connection
from app.calculations import compute_item_uncertainty_and_range, compute_meal_aggregate

WORD_TO_NUM = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "half": 0.5, "quarter": 0.25, "pair": 2, "single": 1, "double": 2
}

UNIT_PATTERNS = [
    (r"cups?", "Cup"),
    (r"plates?", "plate"),
    (r"bowls?", "bowl"),
    (r"slices?", "Slice"),
    (r"pieces?|pcs?", "Piece"),
    (r"scoops?", "scoop"),
    (r"cobs?", "Cob"),
    (r"biscuits?", "Biscuits"),
    (r"glasses?", "Glass"),
    (r"mugs?", "Cup / Mug"),
    (r"tablespoons?|tbsp", "Tablespoon"),
    (r"teaspoons?|tsp", "Teaspoon"),
    (r"grams?|g\b", "grams"),
    (r"ml\b", "ml"),
    (r"kg\b", "kg")
]

# Aliases to database food items
FOOD_ALIASES = [
    ("ugali", "food_ugali_white"),
    ("sima", "food_ugali_white"),
    ("posho", "food_ugali_white"),
    ("brown ugali", "food_ugali_brown"),
    ("wimbi", "food_ugali_brown"),
    ("sukuma wiki", "food_sukuma_wiki"),
    ("sukuma", "food_sukuma_wiki"),
    ("collard", "food_sukuma_wiki"),
    ("kale", "food_sukuma_wiki"),
    ("beef stew", "food_beef_stew_ke"),
    ("beef", "food_beef_stew_ke"),
    ("nyama", "food_beef_stew_ke"),
    ("mchuzi", "food_beef_stew_ke"),
    ("nyama choma", "food_nyama_choma"),
    ("choma", "food_nyama_choma"),
    ("mbuzi", "food_nyama_choma"),
    ("chapatis", "food_chapati_ke"),
    ("chapati", "food_chapati_ke"),
    ("chapo", "food_chapati_ke"),
    ("mandazi", "food_mandazi"),
    ("mahamri", "food_mandazi"),
    ("githeri", "food_githeri"),
    ("muthokoi", "food_githeri"),
    ("pilau", "food_pilau_beef"),
    ("mukimo", "food_mukimo"),
    ("irio", "food_mukimo"),
    ("matoke", "food_matoke"),
    ("ndengu", "food_ndengu"),
    ("dengu", "food_ndengu"),
    ("green grams", "food_ndengu"),
    ("beans", "food_beans_stew"),
    ("maharagwe", "food_beans_stew"),
    ("chicken", "food_kuku_kienyeji"),
    ("kuku", "food_kuku_kienyeji"),
    ("tilapia", "food_tilapia_wet_fry"),
    ("fish", "food_tilapia_wet_fry"),
    ("samaki", "food_tilapia_wet_fry"),
    ("rice", "food_rice_white"),
    ("wali", "food_rice_white"),
    ("nduma", "food_nduma"),
    ("arrowroot", "food_nduma"),
    ("ngwaci", "food_ngwaci"),
    ("sweet potato", "food_ngwaci"),
    ("avocado", "food_avocado_ke"),
    ("parachichi", "food_avocado_ke"),
    ("maize", "food_mahindi_choma"),
    ("corn", "food_mahindi_choma"),
    ("chai", "food_chai_maziwa"),
    ("tea", "food_chai_maziwa"),
    ("maziwa lala", "food_maziwa_lala"),
    ("lala", "food_maziwa_lala"),
    ("mala", "food_maziwa_lala"),
    ("managu", "food_managu"),
    ("cabbage", "food_cabbage_steamed"),
    ("samosa", "food_samosa_beef"),
    ("smokie", "food_smokie_ke"),
    ("sausage", "food_smokie_ke"),
    ("milk", "food_brookside_milk"),
    ("weetabix", "food_weetabix_ea"),
    ("cooking oil", "food_cooking_oil"),
    ("oil", "food_cooking_oil"),
    ("egg", "food_egg_boiled"),
    ("eggs", "food_egg_boiled"),
    ("mayai", "food_egg_boiled"),
    ("chicken breast", "food_chicken_breast"),
    ("oats", "food_oats_rolled"),
    ("peanut butter", "food_peanut_butter"),
    ("bread", "food_brown_bread")
]


def parse_natural_language_log(text: str) -> Dict[str, Any]:
    """
    Parses natural language meal log.
    Identifies foods and portions, flags uncertainties, asks clarifying questions when ambiguous.
    """
    clean_text = text.lower().strip()
    conn = get_db_connection()
    cursor = conn.cursor()

    detected_items = []
    clarification_questions = []

    # Check for known food aliases in text
    matched_foods = []
    # Sort aliases by length descending so multi-word matches first (e.g. "beef stew" before "beef")
    sorted_aliases = sorted(FOOD_ALIASES, key=lambda x: len(x[0]), reverse=True)
    used_spans = []

    for alias, food_id in sorted_aliases:
        pattern = r"\b" + re.escape(alias) + r"\b"
        match = re.search(pattern, clean_text)
        if match:
            span = match.span()
            # Verify span does not heavily overlap previous match
            overlap = any(s[0] <= span[0] < s[1] or s[0] < span[1] <= s[1] for s in used_spans)
            if not overlap:
                used_spans.append(span)
                matched_foods.append((alias, food_id, span))

    # For each matched food, look at surrounding context for quantities/units
    for alias, food_id, span in matched_foods:
        # Preceding context (up to 30 chars before)
        preceding = clean_text[max(0, span[0] - 30):span[0]].strip()
        following = clean_text[span[1]:min(len(clean_text), span[1] + 30)].strip()

        cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
        food_row = cursor.fetchone()
        if not food_row:
            continue
        food = dict(food_row)

        cursor.execute("SELECT * FROM food_portions WHERE food_id = ? ORDER BY is_default DESC", (food_id,))
        portions = [dict(p) for p in cursor.fetchall()]

        # Try to find quantity in preceding words
        quantity = None
        portion_selected = None
        gram_override = None

        # Check for explicit grams like "250g" or "100 grams"
        gram_match = re.search(r"(\d+)\s*(?:g\b|grams\b)", preceding + " " + following)
        if gram_match:
            gram_override = float(gram_match.group(1))

        # Check numeric words or numbers
        words_around = (preceding + " " + following).split()
        for w in words_around:
            if w in WORD_TO_NUM:
                quantity = WORD_TO_NUM[w]
                break
            elif re.match(r"^\d+(\.\d+)?$", w):
                quantity = float(w)
                break

        # Check for unit patterns
        found_unit = None
        for pattern, unit_name in UNIT_PATTERNS:
            if re.search(r"\b" + pattern + r"\b", preceding + " " + following):
                found_unit = unit_name
                break

        # Determine portion
        if gram_override:
            portion_name = f"Custom ({int(gram_override)}g)"
            gram_weight = gram_override
            confidence = "HIGH"
        elif quantity and found_unit:
            # Matches like "two chapatis" or "a cup of beans"
            matched_portion = None
            for p in portions:
                if found_unit.lower() in p["name"].lower():
                    matched_portion = p
                    break
            if matched_portion:
                portion_name = f"{int(quantity) if quantity == int(quantity) else quantity} × {matched_portion['name']}"
                gram_weight = matched_portion["gram_weight"] * quantity
                confidence = "MEDIUM"
            else:
                default_p = portions[0] if portions else {"name": "Standard serving", "gram_weight": 100.0}
                portion_name = f"{quantity} × {default_p['name']}"
                gram_weight = default_p["gram_weight"] * quantity
                confidence = "MEDIUM"
        elif quantity and not found_unit:
            # Matches like "2 eggs" or "two chapatis"
            default_p = portions[0] if portions else {"name": "Standard piece", "gram_weight": 85.0}
            portion_name = f"{int(quantity) if quantity == int(quantity) else quantity} × {default_p['name']}"
            gram_weight = default_p["gram_weight"] * quantity
            confidence = "MEDIUM"
        else:
            # Portion size was not specified in prompt!
            # Example: "I had ugali, beef and sukuma"
            default_p = portions[0] if portions else {"name": "Medium portion", "gram_weight": 150.0}
            portion_name = default_p["name"] + " (Assumed standard)"
            gram_weight = default_p["gram_weight"]
            confidence = "LOW"

            # Add targeted clarifying question
            available_portion_names = [p["name"] for p in portions[:3]]
            clarification_questions.append({
                "food_id": food_id,
                "food_name": food["name"],
                "question": f"What portion size was the {food['name']}?",
                "options": available_portion_names + ["Custom weight (g)"],
                "default": default_p["name"]
            })

        # Check cooking oil hint
        oil_type = "none"
        if food["category"] in ["Vegetables", "Kenyan meals", "Meat & Poultry", "Legumes"]:
            if "dry fry" in clean_text or "deep fried" in clean_text:
                oil_type = "3_plus_tbsp"
            elif "fried" in clean_text:
                oil_type = "2_tbsp"
            elif "light oil" in clean_text or "1 tsp" in clean_text:
                oil_type = "1_tsp"
            elif "no oil" in clean_text or "steamed" in clean_text or "boiled" in clean_text:
                oil_type = "none"
            else:
                # Oil is unknown for stews / sukuma
                oil_type = "unknown"
                clarification_questions.append({
                    "food_id": food_id,
                    "food_name": food["name"],
                    "question": f"How much cooking oil was used for the {food['name']}?",
                    "options": ["None", "Light / 1 tsp", "Standard / 1 tbsp", "Generous / 2 tbsp", "Unknown (Estimated range)"],
                    "default": "Unknown (Estimated range)"
                })

        # Calculate transparent uncertainty and range
        calc = compute_item_uncertainty_and_range(
            base_calories_per_100g=food["calories_per_100g"],
            gram_weight=gram_weight,
            confidence_level=confidence,
            cooking_oil_type=oil_type,
            prep_method=food["default_prep_method"],
            data_origin="ai_estimated" if confidence == "LOW" else "verified"
        )

        item_entry = {
            "food_id": food_id,
            "food_name": food["name"],
            "portion_name": portion_name,
            "gram_weight": round(gram_weight, 1),
            "cooking_oil_type": oil_type,
            "prep_method": food["default_prep_method"],
            "calories": calc["logged_calories"],
            "range_low": calc["range_low"],
            "range_high": calc["range_high"],
            "range_display": calc["range_display"],
            "confidence": calc["confidence"],
            "main_uncertainties": calc["main_uncertainties"],
            "protein_g": round((food["protein_per_100g"] * gram_weight) / 100.0, 1),
            "carbs_g": round((food["carbs_per_100g"] * gram_weight) / 100.0, 1),
            "fat_g": round(((food["fat_per_100g"] * gram_weight) / 100.0) + (14.0 if oil_type == "1_tbsp" else (4.5 if oil_type == "1_tsp" else (12.0 if oil_type == "unknown" else 0.0))), 1),
            "fibre_g": round((food["fibre_per_100g"] * gram_weight) / 100.0, 1),
            "source_citation": food["source"],
            "breakdown": calc["breakdown"]
        }
        detected_items.append(item_entry)

    conn.close()

    if not detected_items:
        return {
            "status": "unrecognized",
            "message": "CALORA could not identify specific foods from that description. Try entering dishes like 'Ugali, beef stew and sukuma wiki' or '2 chapatis and beans'.",
            "items": [],
            "clarifications": []
        }

    meal_summary = compute_meal_aggregate(detected_items)

    return {
        "status": "success",
        "input_text": text,
        "items": detected_items,
        "summary": meal_summary,
        "clarification_needed": len(clarification_questions) > 0,
        "clarifications": clarification_questions,
        "transparency_statement": (
            f"Estimated: {meal_summary['range_display']} (midpoint ~{meal_summary['calories']} kcal). "
            f"Confidence: {meal_summary['confidence']}. "
            f"Main uncertainties: {', '.join(meal_summary['main_uncertainties'])}."
        )
    }


def simulate_photo_food_recognition(image_data: Optional[str] = None, prompt_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Simulated Photo Recognition Engine for Kenyan and mixed dishes.
    Identifies visual components, estimates portions with uncertainty ranges,
    and returns interactive clarifying questions to prevent fabricated precision.
    """
    # Sample realistic detection scenarios based on common Kenyan meal plates
    # If hint contains keywords, match accordingly, otherwise default to classic Ugali + Beef + Sukuma combo
    hint_lower = (prompt_hint or "").lower()

    if "chapati" in hint_lower or "beans" in hint_lower:
        parsed = parse_natural_language_log("2 chapatis and 1 cup of beans")
        scene = "Kenyan Chapati & Beans Plate"
    elif "fish" in hint_lower or "tilapia" in hint_lower or "ngege" in hint_lower:
        parsed = parse_natural_language_log("Ugali medium portion and wet fry tilapia fish")
        scene = "Lake Victoria Tilapia & Ugali"
    elif "githeri" in hint_lower:
        parsed = parse_natural_language_log("1 cup githeri and half avocado")
        scene = "Githeri with Avocado"
    else:
        # Default scenario matching Section 49 test walkthrough
        parsed = parse_natural_language_log("Ugali medium portion, beef stew and sukuma wiki")
        scene = "Kenyan Classic: Ugali, Beef Stew & Sukuma Wiki"

    # Photo recognition carries inherent visual estimation variance -> Confidence LOW to MEDIUM
    for item in parsed["items"]:
        item["confidence"] = "MEDIUM" if "Ugali" in item["food_name"] else "LOW"
        if "Visual camera estimation" not in item["main_uncertainties"]:
            item["main_uncertainties"].insert(0, "Visual camera portion estimation")

    # Recompute aggregate with photo uncertainties
    summary = compute_meal_aggregate(parsed["items"])

    follow_ups = [
        {
            "question": "Was the beef stewed (wet fry with soup) or pan-fried (dry fry)?",
            "options": ["Stewed / Wet Fry", "Dry Fry / Fried", "Boiled lean"],
            "default": "Stewed / Wet Fry"
        },
        {
            "question": "How much cooking oil was used in the sukuma and stew?",
            "options": ["None / minimal", "Standard (1 tbsp per portion)", "Generous / restaurant style", "Unknown (Use estimated range)"],
            "default": "Standard (1 tbsp per portion)"
        },
        {
            "question": "Does the detected portion look accurate?",
            "options": ["Accurate (looks right)", "Smaller than shown", "Larger than shown"],
            "default": "Accurate (looks right)"
        }
    ]

    return {
        "status": "detected",
        "scene_detected": scene,
        "items": parsed["items"],
        "summary": summary,
        "clarification_questions": follow_ups,
        "disclaimer": "AI photo detection provides an approximate visual starting point. Camera angles cannot measure oil absorption or meat fat depth."
    }
