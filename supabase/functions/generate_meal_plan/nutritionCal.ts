type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'weight_loss' | 'maintain' | 'muscle_gain';

type UserData = {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  activity_level: ActivityLevel;
  goal: string; // use string first, then normalize
};

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const goalAdjustments: Record<Goal, number> = {
  weight_loss: 0.85,
  maintain: 1,
  muscle_gain: 1.15
};

const proteinFactors: Record<Goal, number> = {
  weight_loss: 2.2,
  maintain: 1.6,
  muscle_gain: 2.2
};

const normalizeGoal = (goal: string): Goal => {
  const formatted = goal.toLowerCase().replace(/\s/g, '_');
  if (formatted === 'weight_loss' || formatted === 'maintain' || formatted === 'muscle_gain') {
    return formatted as Goal;
  }
  // fallback to maintain if unknown
  return 'maintain';
};

export const calculateDailyCalories = (userData: UserData): number => {
  const { age, gender, height, weight, activity_level } = userData;
  const goal = normalizeGoal(userData.goal);

  console.log("✅ Normalized goal:", goal);

  // Calculate BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  console.log("🔥 BMR:", bmr);

  const tdee = bmr * activityMultipliers[activity_level];
  console.log("⚡️ TDEE (before goal adjustment):", tdee);

  const finalCalories = Math.round(tdee * goalAdjustments[goal]);
  console.log("🎯 Final daily calories:", finalCalories);

  return finalCalories;
};

export const calculateProteinGoal = (userData: Pick<UserData, 'weight' | 'goal'>): number => {
  const goal = normalizeGoal(userData.goal);

  console.log("✅ Normalized goal for protein:", goal);

  const protein = Math.round(userData.weight * proteinFactors[goal]);
  console.log("💪 Protein goal (grams):", protein);

  return protein;
};
