import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '../context/MealContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type GroceryCategory = 'Produce' | 'Dairy' | 'Meat' | 'Pantry' | 'Frozen' | 'Other';

interface ExtendedGroceryItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  category?: GroceryCategory;
}

interface MealPlan {
  date: string;
  meals: {
    name: string;
    ingredients: {
      name: string;
      quantity: number;
      unit?: string;
      category?: GroceryCategory;
    }[];
  }[];
}

const GroceryScreen = () => {
  const { groceryList = [], toggleGroceryItem, setGroceryList } = useMeals();
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Function to get the current week range (Sunday to Saturday)
  const getCurrentWeekRange = () => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay()); // Set to previous Sunday
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    return {
      start: sunday.toISOString().split('T')[0],
      end: saturday.toISOString().split('T')[0],
      weekString: `Week of ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    };
  };

  // Fetch meal plans for current week and generate grocery list
  const fetchWeeklyMealsAndGenerateList = async () => {
    setLoading(true);
    const { start, end, weekString } = getCurrentWeekRange();
    setCurrentWeek(weekString);

    try {
      // Fetch the user's current meal plan
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: mealPlan, error } = await supabase
        .from('user_meal_plans')
        .select('plan_data, expires_at')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!mealPlan) throw new Error('No meal plan found');

      // Check if the plan is still valid (not expired)
      const now = new Date();
      const expiresAt = new Date(mealPlan.expires_at);
      if (expiresAt < now) {
        console.log('Meal plan has expired');
        setGroceryList([]);
        return;
      }

      // Parse the plan_data JSON
      const planData: MealPlan[] = mealPlan.plan_data;
      
      // Filter meals for the current week
      const weeklyMeals = planData.filter(day => {
        const mealDate = new Date(day.date);
        return mealDate >= new Date(start) && mealDate <= new Date(end);
      });

      // Aggregate all ingredients from all meals
      const allIngredients: Record<string, ExtendedGroceryItem> = {};

      weeklyMeals.forEach(day => {
        day.meals?.forEach(meal => {
          meal.ingredients?.forEach(ingredient => {
            const key = `${ingredient.name}_${ingredient.unit || ''}`.toLowerCase();
            
            if (allIngredients[key]) {
              // If ingredient exists, sum quantities
              const existing = allIngredients[key];
              allIngredients[key] = {
                ...existing,
                quantity: (existing.quantity || 0) + (ingredient.quantity || 0)
              };
            } else {
              // Add new ingredient
              allIngredients[key] = {
                id: `${ingredient.name}_${Date.now()}`,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                checked: false,
                category: ingredient.category || 'Other'
              };
            }
          });
        });
      });

      // Convert to array and update context
      const newGroceryList = Object.values(allIngredients);
      setGroceryList(newGroceryList);

    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if it's a new week and regenerate list if needed
  useEffect(() => {
    const checkWeekChange = async () => {
      const today = new Date();
      const lastGenerated = await AsyncStorage.getItem('lastGroceryGenerated');
      
      if (!lastGenerated || isNewWeek(today, new Date(lastGenerated))) {
        await fetchWeeklyMealsAndGenerateList();
        await AsyncStorage.setItem('lastGroceryGenerated', today.toISOString());
      } else {
        setLoading(false);
      }
    };

    checkWeekChange();
  }, []);

  // Helper function to check if it's a new week
  const isNewWeek = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    // Get the start of the week (Sunday)
    const startOfWeek1 = new Date(d1);
    startOfWeek1.setDate(d1.getDate() - d1.getDay());
    
    const startOfWeek2 = new Date(d2);
    startOfWeek2.setDate(d2.getDate() - d2.getDay());
    
    return startOfWeek1.getTime() !== startOfWeek2.getTime();
  };

  const renderItem = ({ item }: { item: ExtendedGroceryItem }) => (
    <TouchableOpacity 
      style={[styles.itemContainer, item.checked && styles.checkedItem]}
      onPress={() => toggleGroceryItem(item.id)}
    >
      <Ionicons 
        name={item.checked ? "checkbox" : "square-outline"} 
        size={24} 
        color={item.checked ? "#4ECDC4" : "#6C63FF"} 
      />
      <View style={styles.textContainer}>
        <Text style={[styles.itemText, item.checked && styles.checkedText]}>
          {item.name}
        </Text>
        {item.quantity && (
          <Text style={styles.quantity}>
            {item.quantity} {item.unit || ''}
          </Text>
        )}
      </View>
      {item.category && (
        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getCategoryColor = (category: GroceryCategory) => {
    const colors: Record<GroceryCategory, string> = {
      'Produce': '#4ECDC4',
      'Dairy': '#6C63FF',
      'Meat': '#FF6B6B',
      'Pantry': '#FFD166',
      'Frozen': '#A5D8FF',
      'Other': '#C8C8C8'
    };
    return colors[category] || '#C8C8C8';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Grocery List</Text>
          <Text style={styles.subtitle}>
            {currentWeek} • {groceryList.length} item{groceryList.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchWeeklyMealsAndGenerateList}
          >
            <Ionicons name="refresh" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {groceryList.length > 0 ? (
          <FlatList
            data={groceryList}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={48} color="#C8C8C8" />
            <Text style={styles.emptyText}>No grocery items yet</Text>
            <Text style={styles.emptySubtext}>Plan some meals to generate your list</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  refreshButton: {
    position: 'absolute',
    right: 24,
    top: Platform.OS === 'ios' ? 50 : 30,
    padding: 8,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  checkedItem: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  quantity: {
    fontSize: 14,
    color: '#6C63FF',
    marginTop: 4,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.2,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default GroceryScreen;