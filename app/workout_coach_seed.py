"""
CALORA - Seed Data for Workouts, Exercises, Gyms, and Coaches
Covers 12 muscle groups, Kenyan equipment adaptations, free starter plans,
and sample gyms/coaches.
"""

from typing import List, Dict, Any

SEED_EXERCISES: List[Dict[str, Any]] = [
    # 1. Chest
    {
        "id": "ex_pushup",
        "name": "Standard Pushup",
        "muscle_group": "Chest",
        "secondary_muscles": "Triceps, Anterior Deltoids, Core",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Push",
        "form_cues": "Hands slightly wider than shoulder-width, fingers spread, core tight in a straight plank line. Lower chest until 2 inches above the ground, then push up explosively.",
        "safety_tips": "Avoid flaring elbows 90 degrees outward; maintain a 45-degree arrow shape to protect shoulder joints.",
        "kenyan_context": "Can be performed anywhere at home, living room floor, or outdoors in Uhuru Park / Karura Forest."
    },
    {
        "id": "ex_incline_pushup",
        "name": "Incline Pushup (Bench / Couch)",
        "muscle_group": "Chest",
        "secondary_muscles": "Triceps, Shoulders",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Push",
        "form_cues": "Place hands on an elevated surface (sofa edge, sturdy chair, or bed frame). Keep body in a rigid plank and lower sternum to edge.",
        "safety_tips": "Ensure the chair or support cannot slide forward during reps.",
        "kenyan_context": "Perfect scale-down for beginners before transitioning to flat floor pushups."
    },
    {
        "id": "ex_dumbbell_bench_press",
        "name": "Dumbbell Floor / Bench Press",
        "muscle_group": "Chest",
        "secondary_muscles": "Triceps, Front Shoulders",
        "equipment": "Dumbbells",
        "difficulty": "Intermediate",
        "movement_pattern": "Push",
        "form_cues": "Retract scapulae against bench or floor. Press weights upward in an arc without clanking dumbbells at the top.",
        "safety_tips": "When on the floor, upper arms touch the carpet gently to prevent shoulder overextension.",
        "kenyan_context": "Available in any local Nairobi gym; at home, two filled 5L water bottles or resistance bands work great."
    },

    # 2. Back
    {
        "id": "ex_inverted_row",
        "name": "Inverted Row / Table Row",
        "muscle_group": "Back",
        "secondary_muscles": "Biceps, Rear Deltoids, Core",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Pull",
        "form_cues": "Lie under a sturdy dining table or grip bedsheet anchored in a closed door. Pull upper chest to the underside of the table with straight body.",
        "safety_tips": "Always test table stability before hanging bodyweight.",
        "kenyan_context": "Excellent bodyweight horizontal pull without requiring gym cables."
    },
    {
        "id": "ex_jerrycan_bent_row",
        "name": "Single-Arm Jerrycan / Dumbbell Row",
        "muscle_group": "Back",
        "secondary_muscles": "Lats, Rhomboids, Biceps",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Pull",
        "form_cues": "Hinge at hips, flat spine parallel to floor, knee resting on chair. Drive elbow back toward hip pocket, squeezing lat at the peak.",
        "safety_tips": "Do not round the lower back; brace core throughout the pull.",
        "kenyan_context": "Standard 5L or 10L cooking oil/water jerrycan with comfortable molded handle serves as the ideal adjustable dumbbell."
    },
    {
        "id": "ex_lat_pulldown",
        "name": "Lat Pulldown (Gym Cable)",
        "muscle_group": "Back",
        "secondary_muscles": "Biceps, Posterior Deltoid",
        "equipment": "Machine",
        "difficulty": "Intermediate",
        "movement_pattern": "Pull",
        "form_cues": "Grip wide bar, sit upright with thighs locked under pads. Lean back 10-15 degrees and pull bar to upper clavicle, depressing shoulder blades.",
        "safety_tips": "Never pull behind the neck; always bring bar down in front of chest.",
        "kenyan_context": "Found in virtually every commercial and neighborhood gym across Kenya."
    },

    # 3. Quads
    {
        "id": "ex_bodyweight_squat",
        "name": "Air Squat / Bodyweight Squat",
        "muscle_group": "Quads",
        "secondary_muscles": "Glutes, Adductors, Core",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Squat",
        "form_cues": "Feet shoulder-width, toes angled 15-30 degrees out. Send hips back and down, knees tracking in line with toes, chest proud.",
        "safety_tips": "Do not allow heels to elevate or knees to cave inward (valgus collapse).",
        "kenyan_context": "Foundation movement for all Kenyan fitness routines, easily practiced at home."
    },
    {
        "id": "ex_goblet_squat",
        "name": "Goblet Squat (Jerrycan / Dumbbell)",
        "muscle_group": "Quads",
        "secondary_muscles": "Glutes, Core, Upper Back",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Squat",
        "form_cues": "Hold weight vertically against sternum like a goblet. Squat deep until elbows brush inside of knees while keeping torso upright.",
        "safety_tips": "Keep weight close to body center of mass to relieve lumbar pressure.",
        "kenyan_context": "Hold a 5kg/10kg water container against chest."
    },
    {
        "id": "ex_walking_lunges",
        "name": "Walking Lunges",
        "muscle_group": "Quads",
        "secondary_muscles": "Hamstrings, Glutes, Calves",
        "equipment": "Bodyweight",
        "difficulty": "Intermediate",
        "movement_pattern": "Lunge",
        "form_cues": "Take a generous step forward, lower back knee gently toward ground at 90 degrees. Drive through front heel to step directly into next lunge.",
        "safety_tips": "Avoid slamming trailing knee into hard tile or concrete.",
        "kenyan_context": "Great hallway, compound, or field exercise commonly used by Kenyan athletic clubs."
    },

    # 4. Hamstrings
    {
        "id": "ex_romanian_deadlift",
        "name": "Romanian Deadlift (RDL)",
        "muscle_group": "Hamstrings",
        "secondary_muscles": "Glutes, Erector Spinae",
        "equipment": "Dumbbells",
        "difficulty": "Intermediate",
        "movement_pattern": "Hinge",
        "form_cues": "Soft knee bend, push hips directly backward toward wall as torso lowers. Feel deep stretch in hamstrings, then thrust hips forward to lock out.",
        "safety_tips": "Maintain neutral spine; avoid bending lower back or turning into a squat.",
        "kenyan_context": "Can be performed with dumbbells, barbell, or 2 balanced water containers."
    },
    {
        "id": "ex_glute_ham_bridge",
        "name": "Glute-Ham Floor Bridge",
        "muscle_group": "Hamstrings",
        "secondary_muscles": "Gluteus Maximus, Lower Back",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Hinge",
        "form_cues": "Lie on back, feet flat on floor 12 inches from hips. Drive through heels, lifting pelvis until thighs and torso align. Squeeze glutes and hamstrings for 2 seconds.",
        "safety_tips": "Avoid hyper-extending lumbar spine at the top of the movement.",
        "kenyan_context": "Zero equipment needed; great for desk workers who sit long hours in Nairobi traffic."
    },

    # 5. Glutes
    {
        "id": "ex_hip_thrust",
        "name": "Hip Thrust (Bench or Bed Edge)",
        "muscle_group": "Glutes",
        "secondary_muscles": "Hamstrings, Core",
        "equipment": "Household",
        "difficulty": "Intermediate",
        "movement_pattern": "Hinge",
        "form_cues": "Upper back rested against edge of sofa/bench. Lower hips down, drive through heels, and finish with shins strictly vertical and glutes clenched.",
        "safety_tips": "Keep chin tucked and ribs down to avoid arching lower back.",
        "kenyan_context": "Highly recommended for running power and knee stability."
    },
    {
        "id": "ex_donkey_kicks",
        "name": "Quadruped Donkey Kicks",
        "muscle_group": "Glutes",
        "secondary_muscles": "Core, Lower Back",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Isolation",
        "form_cues": "On hands and knees, maintain 90 degree knee flex. Kick sole of foot directly toward ceiling without rotating pelvis.",
        "safety_tips": "Brace core so lower back does not dip as leg extends.",
        "kenyan_context": "Easy home routine component."
    },

    # 6. Calves
    {
        "id": "ex_standing_calf_raise",
        "name": "Standing Single-Leg Calf Raise (Stair Step)",
        "muscle_group": "Calves",
        "secondary_muscles": "Tibialis Posterior, Ankle Stabilizers",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Isolation",
        "form_cues": "Ball of foot on stair edge, heel hanging off. Drop heel deep for a full 2-second stretch, then rise onto big toe ball for 1-second squeeze.",
        "safety_tips": "Lightly touch wall or railing for balance.",
        "kenyan_context": "Use any doorstep, staircase, or sidewalk curb."
    },

    # 7. Shoulders
    {
        "id": "ex_overhead_press",
        "name": "Overhead Shoulder Press",
        "muscle_group": "Shoulders",
        "secondary_muscles": "Triceps, Upper Chest, Core",
        "equipment": "Dumbbells",
        "difficulty": "Beginner",
        "movement_pattern": "Push",
        "form_cues": "Stand tall, weights at collarbone level. Press straight overhead until bicep is beside ear. Keep ribs pulled down.",
        "safety_tips": "Do not lean back or arch lower back excessively to heave weight.",
        "kenyan_context": "Works with dumbbells or balanced household weights."
    },
    {
        "id": "ex_lateral_raise",
        "name": "Dumbbell / Bottle Lateral Raise",
        "muscle_group": "Shoulders",
        "secondary_muscles": "Trapezius",
        "equipment": "Dumbbells",
        "difficulty": "Beginner",
        "movement_pattern": "Isolation",
        "form_cues": "Slight forward torso lean, raise arms out to sides like pouring a pitcher of water until elbows reach shoulder height.",
        "safety_tips": "Keep weights light and controlled; do not use swinging momentum.",
        "kenyan_context": "Filled 1L water bottles provide exactly 1kg per side, ideal for side delts."
    },

    # 8. Biceps
    {
        "id": "ex_bicep_curl",
        "name": "Bicep Curl (Dumbbell / Container)",
        "muscle_group": "Biceps",
        "secondary_muscles": "Forearms, Brachialis",
        "equipment": "Dumbbells",
        "difficulty": "Beginner",
        "movement_pattern": "Isolation",
        "form_cues": "Elbows pinned to ribs. Curl weights up with supination (turn pinkies up at top), lower under a 3-second negative.",
        "safety_tips": "Avoid swinging torso back and forth.",
        "kenyan_context": "Jerrycan or dumbbell curl."
    },
    {
        "id": "ex_hammer_curl",
        "name": "Neutral-Grip Hammer Curl",
        "muscle_group": "Biceps",
        "secondary_muscles": "Brachioradialis, Forearms",
        "equipment": "Dumbbells",
        "difficulty": "Beginner",
        "movement_pattern": "Isolation",
        "form_cues": "Palms face each other throughout the curl. Builds arm thickness and forearm grip power.",
        "safety_tips": "Keep wrists rigid, avoiding wrist flexion.",
        "kenyan_context": "Perfect for household items with top vertical handles."
    },

    # 9. Triceps
    {
        "id": "ex_bench_dips",
        "name": "Bench / Chair Dips",
        "muscle_group": "Triceps",
        "secondary_muscles": "Anterior Deltoids, Pectorals",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Push",
        "form_cues": "Hands gripping edge of sturdy chair, legs extended forward. Lower hips straight down by bending elbows to 90 degrees, push back up.",
        "safety_tips": "Keep back close to the chair edge to prevent shoulder anterior impingement.",
        "kenyan_context": "Household classic requiring only a chair or bed corner."
    },
    {
        "id": "ex_diamond_pushup",
        "name": "Diamond Pushup",
        "muscle_group": "Triceps",
        "secondary_muscles": "Inner Chest, Core",
        "equipment": "Bodyweight",
        "difficulty": "Intermediate",
        "movement_pattern": "Push",
        "form_cues": "Index fingers and thumbs touching directly below sternum. Lower chest to touch hands and press up firmly.",
        "safety_tips": "If wrists ache, widen hands slightly to a 4-inch gap.",
        "kenyan_context": "Advanced bodyweight arm builder."
    },

    # 10. Core
    {
        "id": "ex_plank",
        "name": "Forearm Plank",
        "muscle_group": "Core",
        "secondary_muscles": "Transverse Abdominis, Shoulders, Glutes",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Carry",
        "form_cues": "Elbows under shoulders, forearms parallel. Pull belly button toward spine, squeeze glutes, keep neck neutral.",
        "safety_tips": "Do not let lower back sag or hips hike into a tent shape.",
        "kenyan_context": "Essential daily core builder."
    },
    {
        "id": "ex_deadbug",
        "name": "Deadbug",
        "muscle_group": "Core",
        "secondary_muscles": "Hip Flexors, Spine Stabilizers",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Isolation",
        "form_cues": "Lie on back, arms pointing up, knees at 90 degrees. Lower opposite arm and leg while pinning lower back firmly into the floor.",
        "safety_tips": "If lower back lifts from floor, reduce range of limb extension.",
        "kenyan_context": "Gold-standard therapeutic core activation."
    },

    # 11. Forearms
    {
        "id": "ex_farmers_walk",
        "name": "Jerrycan Farmer's Walk",
        "muscle_group": "Forearms",
        "secondary_muscles": "Traps, Core, Grip, Calves",
        "equipment": "Household",
        "difficulty": "Beginner",
        "movement_pattern": "Carry",
        "form_cues": "Pick up two heavy containers (5L to 10L each) at sides. Walk with tall upright posture, shoulders back and down, small controlled steps.",
        "safety_tips": "Engage obliques to prevent side-to-side torso swaying.",
        "kenyan_context": "Classic Kenyan everyday strength exercise — carrying water containers with pristine posture."
    },

    # 12. Full Body / Conditioning
    {
        "id": "ex_burpees",
        "name": "Bodyweight Burpees",
        "muscle_group": "Full Body",
        "secondary_muscles": "Quads, Chest, Shoulders, Calves, Cardiovascular",
        "equipment": "Bodyweight",
        "difficulty": "Intermediate",
        "movement_pattern": "Push",
        "form_cues": "Drop hands to floor, kick feet back to plank, drop chest to floor, push up, jump feet forward, jump up with hands overhead.",
        "safety_tips": "Land softly with bent knees to protect joints.",
        "kenyan_context": "High-intensity calorie burning conditioning."
    },
    {
        "id": "ex_mountain_climbers",
        "name": "Mountain Climbers",
        "muscle_group": "Full Body",
        "secondary_muscles": "Core, Hip Flexors, Deltoids",
        "equipment": "Bodyweight",
        "difficulty": "Beginner",
        "movement_pattern": "Cardio",
        "form_cues": "Start in top pushup position. Drive one knee toward chest, quickly switch legs in a running motion while maintaining a flat back.",
        "safety_tips": "Keep hips low and do not bounce up and down excessively.",
        "kenyan_context": "Cardio finisher for fat-loss workouts."
    }
]


SEED_WORKOUT_PLANS: List[Dict[str, Any]] = [
    {
        "id": "plan_kenyan_home_starter",
        "title": "Kenyan Home Starter (Bodyweight & Minimal Equipment)",
        "description": "Zero gym fees required. Designed for sustainable weight loss, tone, and functional strength using bodyweight and common household items (water jerrycans, sturdy chairs).",
        "goal": "fat_loss",
        "level": "beginner",
        "days_per_week": 3,
        "estimated_duration_min": 35,
        "equipment_needed": "Bodyweight, Chair, 5L Water Jerrycan",
        "schedule": [
            {
                "day_number": 1,
                "title": "Day 1: Full Body Strength & Core",
                "exercises": [
                    {"exercise_id": "ex_bodyweight_squat", "name": "Air Squats", "sets": 3, "reps": "12-15", "rest_sec": 60},
                    {"exercise_id": "ex_incline_pushup", "name": "Incline Pushups (Couch/Chair)", "sets": 3, "reps": "8-12", "rest_sec": 60},
                    {"exercise_id": "ex_jerrycan_bent_row", "name": "Jerrycan Single-Arm Rows", "sets": 3, "reps": "10-12 / arm", "rest_sec": 60},
                    {"exercise_id": "ex_glute_ham_bridge", "name": "Glute-Ham Floor Bridges", "sets": 3, "reps": "15", "rest_sec": 45},
                    {"exercise_id": "ex_plank", "name": "Forearm Plank", "sets": 3, "reps": "30-45 sec", "rest_sec": 45}
                ]
            },
            {
                "day_number": 2,
                "title": "Day 2: Active Recovery or 30-Min Brisk Walk",
                "exercises": [
                    {"exercise_id": "ex_deadbug", "name": "Deadbug Core Activation", "sets": 3, "reps": "10 / side", "rest_sec": 30},
                    {"exercise_id": "ex_standing_calf_raise", "name": "Stair Calf Raises", "sets": 3, "reps": "15 / leg", "rest_sec": 45}
                ]
            },
            {
                "day_number": 3,
                "title": "Day 3: Lower Body & Cardio Burn",
                "exercises": [
                    {"exercise_id": "ex_goblet_squat", "name": "Goblet Squats (Jerrycan)", "sets": 3, "reps": "12", "rest_sec": 60},
                    {"exercise_id": "ex_walking_lunges", "name": "Walking Lunges", "sets": 3, "reps": "10 / leg", "rest_sec": 60},
                    {"exercise_id": "ex_bench_dips", "name": "Chair Dips", "sets": 3, "reps": "10-12", "rest_sec": 60},
                    {"exercise_id": "ex_farmers_walk", "name": "Jerrycan Farmer's Walk", "sets": 3, "reps": "45 sec carry", "rest_sec": 60},
                    {"exercise_id": "ex_mountain_climbers", "name": "Mountain Climbers", "sets": 3, "reps": "30 sec", "rest_sec": 45}
                ]
            }
        ]
    },
    {
        "id": "plan_gym_hypertrophy",
        "title": "Nairobi Gym Hypertrophy 4-Day Split",
        "description": "Progressive overload routine for muscle building, lean definition, and metabolic rate boost using standard gym equipment.",
        "goal": "muscle_gain",
        "level": "intermediate",
        "days_per_week": 4,
        "estimated_duration_min": 50,
        "equipment_needed": "Dumbbells, Barbells, Cable Machines, Bench",
        "schedule": [
            {
                "day_number": 1,
                "title": "Upper Body A (Chest, Back, Shoulders)",
                "exercises": [
                    {"exercise_id": "ex_dumbbell_bench_press", "name": "Dumbbell Bench Press", "sets": 4, "reps": "8-10", "rest_sec": 90},
                    {"exercise_id": "ex_lat_pulldown", "name": "Lat Pulldown", "sets": 4, "reps": "10-12", "rest_sec": 75},
                    {"exercise_id": "ex_overhead_press", "name": "Overhead Shoulder Press", "sets": 3, "reps": "10", "rest_sec": 75},
                    {"exercise_id": "ex_lateral_raise", "name": "Lateral Raises", "sets": 3, "reps": "12-15", "rest_sec": 60},
                    {"exercise_id": "ex_bicep_curl", "name": "Bicep Curls", "sets": 3, "reps": "12", "rest_sec": 60}
                ]
            },
            {
                "day_number": 2,
                "title": "Lower Body A (Quads, Hamstrings, Calves)",
                "exercises": [
                    {"exercise_id": "ex_goblet_squat", "name": "Heavy Goblet / Barbell Squats", "sets": 4, "reps": "8-10", "rest_sec": 90},
                    {"exercise_id": "ex_romanian_deadlift", "name": "Dumbbell Romanian Deadlifts", "sets": 4, "reps": "10-12", "rest_sec": 90},
                    {"exercise_id": "ex_walking_lunges", "name": "Walking Lunges with Dumbbells", "sets": 3, "reps": "12 / leg", "rest_sec": 60},
                    {"exercise_id": "ex_standing_calf_raise", "name": "Standing Calf Raises", "sets": 4, "reps": "15", "rest_sec": 45}
                ]
            },
            {
                "day_number": 3,
                "title": "Upper Body B (Back, Chest & Arms)",
                "exercises": [
                    {"exercise_id": "ex_jerrycan_bent_row", "name": "Dumbbell Bent-over Rows", "sets": 4, "reps": "10", "rest_sec": 75},
                    {"exercise_id": "ex_pushup", "name": "Pushups (Bodyweight / Weighted)", "sets": 3, "reps": "Failure", "rest_sec": 60},
                    {"exercise_id": "ex_diamond_pushup", "name": "Diamond Pushups / Cable Tricep Pushdown", "sets": 3, "reps": "10-12", "rest_sec": 60},
                    {"exercise_id": "ex_hammer_curl", "name": "Hammer Curls", "sets": 3, "reps": "12", "rest_sec": 60}
                ]
            },
            {
                "day_number": 4,
                "title": "Lower Body & Core B (Posterior Chain & Abs)",
                "exercises": [
                    {"exercise_id": "ex_hip_thrust", "name": "Barbell / Bench Hip Thrusts", "sets": 4, "reps": "10-12", "rest_sec": 90},
                    {"exercise_id": "ex_romanian_deadlift", "name": "Single-Leg RDLs", "sets": 3, "reps": "10 / leg", "rest_sec": 60},
                    {"exercise_id": "ex_plank", "name": "Weighted / Extended Plank", "sets": 3, "reps": "60 sec", "rest_sec": 60},
                    {"exercise_id": "ex_deadbug", "name": "Deadbug Slow Burn", "sets": 3, "reps": "12 / side", "rest_sec": 45}
                ]
            }
        ]
    },
    {
        "id": "plan_full_body_burn",
        "title": "Full Body Functional Conditioning & Fat Burn",
        "description": "High caloric expenditure, cardiovascular endurance, and dynamic movement. Ideal for weight loss and stamina.",
        "goal": "fat_loss",
        "level": "beginner",
        "days_per_week": 3,
        "estimated_duration_min": 30,
        "equipment_needed": "Bodyweight & 1 Dumbbell/Weight",
        "schedule": [
            {
                "day_number": 1,
                "title": "Full Body Conditioning Circuit",
                "exercises": [
                    {"exercise_id": "ex_burpees", "name": "Burpees", "sets": 4, "reps": "10", "rest_sec": 45},
                    {"exercise_id": "ex_goblet_squat", "name": "Goblet Squats", "sets": 4, "reps": "15", "rest_sec": 45},
                    {"exercise_id": "ex_pushup", "name": "Pushups", "sets": 4, "reps": "10-12", "rest_sec": 45},
                    {"exercise_id": "ex_mountain_climbers", "name": "Mountain Climbers", "sets": 4, "reps": "30 sec", "rest_sec": 45}
                ]
            }
        ]
    }
]

SEED_GYMS: List[Dict[str, Any]] = [
    {
        "id": "gym_nairobi_hub",
        "name": "Nairobi Fitness Hub (Westlands)",
        "location": "Parklands Rd, Westlands, Nairobi",
        "code": "NFH-001",
        "contact_phone": "+254 711 234 567",
        "contact_email": "westlands@nairobihub.co.ke",
        "tier": "premium",
        "status": "active"
    },
    {
        "id": "gym_kilimani_power",
        "name": "Kilimani Powerhouse Gym",
        "location": "Argwings Kodhek Rd, Kilimani, Nairobi",
        "code": "KPG-002",
        "contact_phone": "+254 722 345 678",
        "contact_email": "info@kilimanigym.ke",
        "tier": "standard",
        "status": "active"
    },
    {
        "id": "gym_mombasa_coastal",
        "name": "Mombasa Coastal Fitness",
        "location": "Links Road, Nyali, Mombasa",
        "code": "MCF-003",
        "contact_phone": "+254 733 456 789",
        "contact_email": "coastal@calora.app",
        "tier": "standard",
        "status": "active"
    }
]

SEED_COACHES: List[Dict[str, Any]] = [
    {
        "id": "coach_brian_001",
        "email": "coach.brian@calora.app",
        "name": "Coach Brian Mwangi",
        "specialization": "Weight Loss & Functional Hypertrophy",
        "bio": "Certified personal trainer and coach with 7+ years helping clients navigate sustainable calorie deficits and strength training across Nairobi gyms and home setups.",
        "certifications": "ACE-CPT, Kenya Fitness & Bodybuilding Federation Coach",
        "phone": "+254 700 123 456",
        "max_clients": 25,
        "gym_id": "gym_nairobi_hub"
    },
    {
        "id": "coach_faith_002",
        "email": "coach.faith@calora.app",
        "name": "Coach Faith Chebet",
        "specialization": "Endurance, Kenyan Running & Precision Nutrition",
        "bio": "High-altitude marathon specialist and precision nutritionist focusing on metabolic health, running form, and balanced Kenyan diets.",
        "certifications": "ISSA Sports Nutritionist, World Athletics Level 1 Coach",
        "phone": "+254 700 654 321",
        "max_clients": 20,
        "gym_id": "gym_kilimani_power"
    }
]
