import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Edge function started ✨")

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  try {
    const { user_id, forceRefresh = false } = await req.json()
    console.log("🔙 Received user_id:", user_id, " | forceRefresh:", forceRefresh)

    // ✅ Check if a meal plan already exists for the user
    const { data: existingPlan, error: existingError } = await supabaseClient
      .from('user_meal_plans')
      .select('plan_data')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existingError) throw existingError

    // ✅ Return cached plan if exists and not force-refreshing
    if (existingPlan?.plan_data && !forceRefresh) {
      console.log("✅ Existing meal plan found, returning cached plan.")
      return new Response(JSON.stringify({ plan: existingPlan.plan_data }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    // 🧠 Fetch onboarding info
    const { data: onboarding, error: onboardingError } = await supabaseClient
      .from('onboarding_info')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (onboardingError) throw onboardingError
    console.log("✅ Onboarding data:", onboarding)

    // 🧼 Parse allergies safely
    let parsedAllergies: string[] = []
    try {
      const rawAllergies = onboarding.allergies
      if (rawAllergies && rawAllergies.trim().startsWith('[')) {
        parsedAllergies = JSON.parse(rawAllergies)
      } else {
        parsedAllergies = []
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse allergies, defaulting to empty list.", err)
      parsedAllergies = []
    }

    const userData = {
      age: onboarding.age,
      gender: onboarding.gender?.toLowerCase() === 'male' ? 'male' : 'female',
      height: onboarding.height,
      weight: onboarding.weight,
      activity_level: normalizeActivityLevel(onboarding.activity_level ?? ''),
      goal: normalizeGoal(onboarding.goal ?? ''),
      diet_type: onboarding.diet_type?.toLowerCase(),
      cuisines: JSON.parse(onboarding.cuisines || '[]'),
      allergies: parsedAllergies,
      cooking_time: onboarding.cooking_time?.toLowerCase(),
      spice_level: onboarding.spice_level?.toLowerCase(),
    }

    const calories = calculateDailyCalories(userData)
    const protein = calculateProteinGoal({ weight: onboarding.weight, goal: userData.goal })

    console.log(`🎯 Calories: ${calories}, 💪 Protein: ${protein}`)

    const fetchMeals = async (mealtype: string): Promise<any[]> => {
      let query = supabaseClient.from('meals').select('*')
        .eq('mealtype', mealtype)
        .ilike('dietgoals', `%${userData.goal}%`)
        .ilike('diettypes', `%${userData.diet_type}%`)
        .eq('cookingtime', userData.cooking_time)
        .eq('spicelevel', userData.spice_level)

      if (userData.cuisines.length > 0) {
        const cuisineConditions = userData.cuisines.map(c => `cuisines.ilike.%${c}%`).join(',')
        query = query.or(cuisineConditions)
      }

      if (userData.allergies.length > 0) {
        for (const allergy of userData.allergies) {
          query = query.ilike('allergiesexcluded', `%${allergy}%`)
        }
      } else {
        console.log("✅ No allergy filters applied")
      }

      let { data, error } = await query
      if (error) throw error

      if (!data || data.length === 0) {
        console.warn(`⚠️ No meals found for '${mealtype}' with strict filters. Applying relaxed filters.`)
        let relaxedQuery = supabaseClient.from('meals').select('*')
          .eq('mealtype', mealtype)
          .ilike('dietgoals', `%${userData.goal}%`)
          .ilike('diettypes', `%${userData.diet_type}%`)
        let { data: relaxedData, error: relaxedError } = await relaxedQuery
        if (relaxedError) throw relaxedError
        return relaxedData ?? []
      }

      return data
    }

    const [breakfastMeals, lunchMeals, dinnerMeals, snackMeals] = await Promise.all([
      fetchMeals('breakfast'),
      fetchMeals('lunch'),
      fetchMeals('dinner'),
      fetchMeals('snack'),
    ])

    console.log(`✅ Meal counts — Breakfast: ${breakfastMeals.length}, Lunch: ${lunchMeals.length}, Dinner: ${dinnerMeals.length}, Snack: ${snackMeals.length}`)

    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5)
    const shuffledBreakfast = shuffle(breakfastMeals)
    const shuffledLunch = shuffle(lunchMeals)
    const shuffledDinner = shuffle(dinnerMeals)
    const shuffledSnack = shuffle(snackMeals)

    const mealPlan: Record<string, any> = {}
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dayKey = date.toISOString().split('T')[0]

      const breakfast = shuffledBreakfast[i % shuffledBreakfast.length]
      const lunch = shuffledLunch[i % shuffledLunch.length]
      const dinner = shuffledDinner[i % shuffledDinner.length]
      const snack = shuffledSnack[i % shuffledSnack.length]

      const formatMeal = (meal: any, type: string) => ({ ...meal, type, completed: false })

      mealPlan[dayKey] = {
        breakfast: breakfast ? [formatMeal(breakfast, 'breakfast')] : [],
        lunch: lunch ? [formatMeal(lunch, 'lunch')] : [],
        snack: snack ? [formatMeal(snack, 'snack')] : [],
        dinner: dinner ? [formatMeal(dinner, 'dinner')] : [],
        totalCalories: calories,
        totalProtein: protein,
      }
    }

    const { error: saveError } = await supabaseClient
      .from('user_meal_plans')
      .upsert([{
        user_id,
        plan_data: mealPlan,
        last_updated: new Date().toISOString(),
      }], { onConflict: ['user_id'] })

    if (saveError) throw saveError

    console.log("📂 Meal plan saved successfully.")
    return new Response(JSON.stringify({ plan: mealPlan }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("❌ Error in function:", error)
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})

// 🧠 Helper functions below

function normalizeActivityLevel(level: string): 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' {
  const lower = level.toLowerCase()
  if (lower.includes('sedentary')) return 'sedentary'
  if (lower.includes('moderate')) return 'moderate'
  if (lower.includes('very')) return 'very_active'
  if (lower.includes('light')) return 'light'
  if (lower.includes('active')) return 'active'
  return 'moderate'
}

function normalizeGoal(goal: string): 'weight_loss' | 'maintain' | 'muscle_gain' {
  const lower = goal.toLowerCase()
  if (lower.includes('weight')) return 'weight_loss'
  if (lower.includes('muscle')) return 'muscle_gain'
  return 'maintain'
}

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const goalAdjustments = {
  weight_loss: 0.85,
  maintain: 1,
  muscle_gain: 1.15,
}

const proteinFactors = {
  weight_loss: 2.2,
  maintain: 1.6,
  muscle_gain: 2.2,
}

function calculateDailyCalories(userData: {
  age: number
  gender: 'male' | 'female'
  height: number
  weight: number
  activity_level: keyof typeof activityMultipliers
  goal: keyof typeof goalAdjustments
}): number {
  const { age, gender, height, weight, activity_level, goal } = userData
  const bmr = gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
  const tdee = bmr * activityMultipliers[activity_level]
  return Math.round(tdee * goalAdjustments[goal])
}

function calculateProteinGoal(userData: { weight: number, goal: keyof typeof proteinFactors }): number {
  return Math.round(userData.weight * proteinFactors[userData.goal])
}
