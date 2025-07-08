type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'weight_loss' | 'maintain' | 'muscle_gain';

type UserData = {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  activity_level: ActivityLevel;
  goal: Goal;
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

export const calculateDailyCalories = (userData: UserData): number => {
  const { age, gender, height, weight, activity_level, goal } = userData;
  
  // Calculate BMR (Basal Metabolic Rate)
  let bmr: number;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  // Adjust for activity level
  const tdee = bmr * activityMultipliers[activity_level];
  
  // Adjust for goal
  return Math.round(tdee * goalAdjustments[goal]);
};

export const calculateProteinGoal = (userData: Pick<UserData, 'weight' | 'goal'>): number => {
  const { weight, goal } = userData;
  return Math.round(weight * proteinFactors[goal]);
};