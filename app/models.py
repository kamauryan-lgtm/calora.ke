"""
CALORA - Pydantic Request & Response Data Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    age: int = Field(20, ge=14, le=100)
    sex: str = Field("male")
    height_cm: float = Field(175.0, ge=100, le=250)
    current_weight_kg: float = Field(80.0, ge=30, le=300)
    goal_weight_kg: float = Field(72.0, ge=30, le=300)
    activity_level: str = Field("moderately_active")
    primary_goal: str = Field("lose")
    deficit_tier: str = Field("moderate")
    measurement_system: str = Field("metric")


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: int
    sex: str
    height_cm: float
    current_weight_kg: float
    goal_weight_kg: float
    activity_level: str
    primary_goal: str
    deficit_tier: str = "moderate"
    measurement_system: str = "metric"
    dietary_preferences: Optional[str] = None
    allergies: Optional[str] = None


class CalculationPreviewRequest(BaseModel):
    age: int
    sex: str
    height_cm: float
    weight_kg: float
    activity_level: str
    goal: str = "lose"
    deficit_tier: str = "moderate"


class LogItemRequest(BaseModel):
    date: str
    meal_type: str  # breakfast, lunch, dinner, snack
    food_id: Optional[str] = None
    food_name: str
    portion_name: str
    gram_weight: float
    cooking_oil_type: str = "none"
    prep_method: str = "boiled"
    calories: Optional[int] = None
    confidence_level: Optional[str] = None
    data_origin: Optional[str] = "verified"
    notes: Optional[str] = None


class QuickAddRequest(BaseModel):
    date: str
    meal_type: str
    calories: int = Field(..., ge=1)
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0
    name: Optional[str] = "Quick Calorie Entry"
    notes: Optional[str] = None


class WeightLogRequest(BaseModel):
    date: str
    weight_kg: float = Field(..., ge=30, le=300)
    notes: Optional[str] = None


class NaturalLanguageRequest(BaseModel):
    text: str = Field(..., min_length=2)


class PhotoDetectRequest(BaseModel):
    image_data: Optional[str] = None
    hint: Optional[str] = None


class AssistantChatRequest(BaseModel):
    query: str
    date: Optional[str] = None
    date_str: Optional[str] = None
    image_data: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str



class FoodReportRequest(BaseModel):
    food_id: str
    food_name: str
    issue_type: str  # wrong_portion, wrong_food, wrong_prep, wrong_nutrition, duplicate, other
    user_notes: str


class AdminReportResolutionRequest(BaseModel):
    status: str  # investigated, resolved, rejected
    admin_response: str


class CreateCustomFoodRequest(BaseModel):
    name: str
    common_names: Optional[str] = None
    category: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fibre_per_100g: float = 0.0
    sugar_per_100g: float = 0.0
    sodium_mg_per_100g: float = 0.0
    default_prep_method: str = "boiled"
    portions: List[Dict[str, Any]]
    notes: Optional[str] = None


class CreateRecipeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    servings: int = Field(..., ge=1, le=50)
    ingredients: List[Dict[str, Any]]


# --- Food Logging Extensions ---
class UpdateMealItemRequest(BaseModel):
    food_name: Optional[str] = None
    portion_name: Optional[str] = None
    gram_weight: Optional[float] = None
    cooking_oil_type: Optional[str] = "none"
    prep_method: Optional[str] = "boiled"
    logged_calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fibre_g: Optional[float] = None
    notes: Optional[str] = None


class DuplicateMealItemRequest(BaseModel):
    target_date: Optional[str] = None
    target_meal_type: Optional[str] = None


class CopyMealRequest(BaseModel):
    source_date: str
    source_meal_type: str
    target_date: str
    target_meal_type: Optional[str] = None


# --- Steps, Sleep & Workouts ---
class LogStepRequest(BaseModel):
    date: str
    steps_count: int = Field(..., ge=0, le=100000)
    distance_km: Optional[float] = None
    active_minutes: Optional[int] = 30
    goal_steps: Optional[int] = 10000
    calories_burned: Optional[int] = None
    notes: Optional[str] = None


class LogSleepRequest(BaseModel):
    date: str
    bedtime: str
    wake_time: str
    quality_rating: int = Field(..., ge=1, le=5)
    goal_minutes: Optional[int] = 480
    notes: Optional[str] = None


class LogWorkoutRequest(BaseModel):
    date: str
    routine_name: str
    plan_id: Optional[str] = None
    duration_minutes: int = 45
    exercises: List[Dict[str, Any]]
    notes: Optional[str] = None


class GenerateWorkoutRequest(BaseModel):
    goal: str = "fat_loss"
    level: str = "beginner"
    days_per_week: int = 3
    available_equipment: List[str] = ["Bodyweight"]


# --- Gym Partner, Billing & Packages ---
class GymRegisterRequest(BaseModel):
    name: str
    location: str
    code: str
    slug: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    tier: Optional[str] = "standard"
    owner_name: str
    owner_email: str
    owner_password: str = Field(..., min_length=6)


class GymBrandingUpdateRequest(BaseModel):
    primary_color: Optional[str] = "#10b981"
    secondary_color: Optional[str] = "#0f172a"
    tagline: Optional[str] = None
    welcome_message: Optional[str] = None
    logo_url: Optional[str] = None


class GymPackageCreateRequest(BaseModel):
    name: str
    description: str
    price_kes: int = Field(..., ge=100)
    duration_days: int = Field(30, ge=1, le=365)
    eligibility: Optional[str] = "all_members"
    terms: Optional[str] = None


class GymPackageOrderRequest(BaseModel):
    package_id: str
    phone_number: str
    idempotency_key: Optional[str] = None


class GymSubscribeRequest(BaseModel):
    plan_id: str
    phone_number: str
    idempotency_key: Optional[str] = None


class AdminUpdatePlanRequest(BaseModel):
    price_kes: int
    max_members: int
    features_json: Optional[str] = None
    is_active: Optional[int] = 1


class GymInviteRequest(BaseModel):
    email: str
    role: str = "member"


class MemberConsentUpdateRequest(BaseModel):
    share_nutrition_summary: bool = True
    share_weight_trend: bool = True
    share_detailed_food_logs: bool = False
    share_workouts: bool = True
    receive_weekly_email: bool = True


# --- Payment Initiation & Callback ---
class InitiatePaymentRequest(BaseModel):
    phone_number: str
    amount_kes: int
    transaction_type: str
    entity_id: str
    idempotency_key: Optional[str] = None


class PaymentCallbackRequest(BaseModel):
    reference: str
    success: bool = True
    receipt_number: Optional[str] = None
    failure_reason: Optional[str] = None


class SendTestEmailRequest(BaseModel):
    recipient_email: Optional[str] = None


class AdminUpdateUserRoleRequest(BaseModel):
    role: str  # client, coach, gym_owner, admin


class AdminCreateFoodRequest(BaseModel):
    name: str
    category: str
    source: Optional[str] = "Kenya Food Composition Tables (KFCT), 2018"
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fibre_per_100g: float
    prep_method: Optional[str] = "boiled"
    uncertainty_factor: Optional[float] = 0.05
    is_verified: Optional[int] = 1
    portions: Optional[List[Dict[str, Any]]] = None


class AdminUpdateFoodRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    fibre_per_100g: Optional[float] = None
    is_verified: Optional[int] = None


class CopyMealToTodayRequest(BaseModel):
    source_date: str
    meal_type: Optional[str] = None  # None for all meals, or specific meal_type


class AdminCreateExerciseRequest(BaseModel):
    name: str = Field(..., min_length=2)
    muscle_group: str
    secondary_muscles: Optional[str] = None
    equipment: str = "Bodyweight"
    difficulty: str = "Beginner"
    movement_pattern: str = "Compound"
    form_cues: str = "Maintain neutral spine and controlled tempo."
    safety_tips: str = "Breathe steadily and do not lock joints under load."
    kenyan_context: Optional[str] = None



