import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateDailyCalories, calculateProteinGoal } from '../lib/nutritionCalculations';

type Meal = {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  preparation: string[];
  healthbenefits: string[];
  completed: boolean;
  number: number;
  cuisines: string;
  mealtype: string;
  dietgoals: string[];
  diettypes: string[];
  created_at: string;
  spicelevel: string;
  cookingtime: string;
  description: string;
  suitablefor: string[];
  allergiesexcluded: string[];
};

type MealPlanDay = {
  breakfast: Meal[];
  lunch: Meal[];
  dinner: Meal[];
  snack?: Meal[];
  totalCalories: number;
};

type MealPlan = {
  [date: string]: MealPlanDay;
};

type MealsContextType = {
  todaysPlan: MealPlanDay | null;
  monthlyPlan: MealPlan | null;
  loading: boolean;
  error: string | null;
  refreshMealPlan: () => Promise<void>;
  calorieGoal: number;
  proteinGoal: number;
  markMealAsCompleted: (mealId: string, completed: boolean) => Promise<void>;
  mealPlanName: string;
};

const MealsContext = createContext<MealsContextType>({
  todaysPlan: null,
  monthlyPlan: null,
  loading: false,
  error: null,
  refreshMealPlan: async () => {},
  calorieGoal: 2000,
  proteinGoal: 120,
  markMealAsCompleted: async () => {},
  mealPlanName: '',
});

const safeConvertToArray = (input: any): string[] => {
  if (input == null) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return String(input)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item !== '');
};

export const MealsProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<MealPlanDay | null>(null);
  const [monthlyPlan, setMonthlyPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(120);
  const [mealPlanName, setMealPlanName] = useState('');

  useEffect(() => {
    const fetchAuthUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("Error fetching auth user:", error);
        return;
      }
      setUserId(user.id);
    };
    fetchAuthUser();
  }, []);

  const fetchUserOnboardingData = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('onboarding_info')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, [userId]);

  const calculateNutritionGoals = useCallback(async () => {
    const userData = await fetchUserOnboardingData();
    if (!userData) throw new Error('No onboarding data found');
    
    // Set meal plan name based on user's goal
    if (userData.goal === 'weight_loss') {
      setMealPlanName('Weight Loss Plan');
    } else if (userData.goal === 'muscle_gain') {
      setMealPlanName('Muscle Gain Plan');
    } else {
      setMealPlanName('Balanced Plan');
    }
    
    const calories = calculateDailyCalories(userData);
    const protein = calculateProteinGoal(userData);
    setCalorieGoal(calories);
    setProteinGoal(protein);
    return { calories, protein };
  }, [fetchUserOnboardingData]);

  const refreshMealPlan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await calculateNutritionGoals();

      const { data: generatedData, error: funcError } = await supabase.functions.invoke('generate_meal_plan', {
        body: { user_id: userId },
      });

      if (funcError) throw funcError;
      if (!generatedData || !generatedData.plan) throw new Error('No plan data returned from function');

      const planData = generatedData.plan as MealPlan;

      // Convert all arrays properly
      const convertedPlan = Object.entries(planData).reduce((acc, [date, day]) => {
        acc[date] = {
          breakfast: (day.breakfast || []).map((meal) => ({ 
            ...meal, 
            completed: false, // Ensure completed is initialized
            ingredients: safeConvertToArray(meal.ingredients), 
            preparation: safeConvertToArray(meal.preparation), 
            healthbenefits: safeConvertToArray(meal.healthbenefits) 
          })),
          lunch: (day.lunch || []).map((meal) => ({ 
            ...meal, 
            completed: false,
            ingredients: safeConvertToArray(meal.ingredients), 
            preparation: safeConvertToArray(meal.preparation), 
            healthbenefits: safeConvertToArray(meal.healthbenefits) 
          })),
          dinner: (day.dinner || []).map((meal) => ({ 
            ...meal, 
            completed: false,
            ingredients: safeConvertToArray(meal.ingredients), 
            preparation: safeConvertToArray(meal.preparation), 
            healthbenefits: safeConvertToArray(meal.healthbenefits) 
          })),
          snack: (day.snack || []).map((meal) => ({ 
            ...meal, 
            completed: false,
            ingredients: safeConvertToArray(meal.ingredients), 
            preparation: safeConvertToArray(meal.preparation), 
            healthbenefits: safeConvertToArray(meal.healthbenefits) 
          })),
          totalCalories: day.totalCalories,
        };
        return acc;
      }, {} as MealPlan);

      setMonthlyPlan(convertedPlan);
      const today = new Date().toISOString().split('T')[0];
      setTodaysPlan(convertedPlan[today] || null);

      await supabase
        .from('user_meal_plans')
        .upsert({
          user_id: userId,
          plan_data: convertedPlan,
          last_updated: new Date().toISOString(),
        });

    } catch (err) {
      console.error("Meal plan error:", err);
      setError(err instanceof Error ? err.message : 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  }, [userId, calculateNutritionGoals]);

  const markMealAsCompleted = useCallback(async (mealId: string, completed: boolean) => {
    if (!monthlyPlan || !userId) return;

    try {
      const updatedPlan = { ...monthlyPlan };
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = updatedPlan[today];

      if (!todayMeals) return;

      const mealTypes: Array<keyof MealPlanDay> = ['breakfast', 'lunch', 'dinner', 'snack'];
      let found = false;

      mealTypes.forEach((type) => {
        const meals = todayMeals[type];
        if (Array.isArray(meals)) {
          meals.forEach((meal: Meal) => {
            if (meal.id === mealId) {
              meal.completed = completed;
              found = true;
            }
          });
        }
      });

      if (!found) return;

      setMonthlyPlan(updatedPlan);
      setTodaysPlan(todayMeals);

      await supabase
        .from('user_meal_plans')
        .upsert({
          user_id: userId,
          plan_data: updatedPlan,
          last_updated: new Date().toISOString(),
        });

    } catch (error) {
      console.error('Error updating meal completion:', error);
    }
  }, [monthlyPlan, userId]);

  useEffect(() => {
    if (userId) {
      refreshMealPlan();
    }
  }, [userId, refreshMealPlan]);

  return (
    <MealsContext.Provider
      value={{
        todaysPlan,
        monthlyPlan,
        loading,
        error,
        refreshMealPlan,
        calorieGoal,
        proteinGoal,
        markMealAsCompleted,
        mealPlanName,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
};

export const useMeals = () => {
  const context = useContext(MealsContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealsProvider');
  }
  return context;
};