import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  Animated, 
  Dimensions, 
  SafeAreaView, 
  ActivityIndicator, 
  Modal,
  Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMeals } from '../context/MealContext';
import { useAuth } from '../lib/auth';

const { width, height } = Dimensions.get('window');

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

const convertToArray = (input: any): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed.replace(/'/g, '"'));
      } catch {
        return trimmed.split('\n').map(item => item.trim()).filter(Boolean);
      }
    }
    return trimmed.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
};

const getMealTypeIcon = (type: string) => {
  switch(type) {
    case 'breakfast': return 'food-croissant';
    case 'lunch': return 'food';
    case 'dinner': return 'food-steak';
    default: return 'food-apple';
  }
};

const getMealTypeColor = (type: string) => {
  switch(type) {
    case 'breakfast': return '#FF9F1C';
    case 'lunch': return '#2EC4B6';
    case 'dinner': return '#E71D36';
    default: return '#FF70A6';
  }
};

const MealsScreen = () => {
  const { user } = useAuth();
  const { 
    monthlyPlan, 
    loading, 
    refreshMealPlan, 
    calorieGoal, 
    proteinGoal, 
    markMealAsCompleted, 
    mealPlanName 
  } = useMeals();
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [dailyProgress, setDailyProgress] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, []);

  const dailyMeals = useMemo(() => {
    if (!monthlyPlan?.[selectedDate]) return [];
    
    const meals = [
      ...(monthlyPlan[selectedDate].breakfast ?? []),
      ...(monthlyPlan[selectedDate].lunch ?? []),
      ...(monthlyPlan[selectedDate].dinner ?? []),
      ...(monthlyPlan[selectedDate].snack ?? [])
    ];

    return meals.map(meal => ({
      ...meal,
      ingredients: convertToArray(meal.ingredients),
      preparation: convertToArray(meal.preparation),
      healthbenefits: convertToArray(meal.healthbenefits),
      dietgoals: convertToArray(meal.dietgoals),
      diettypes: convertToArray(meal.diettypes),
      suitablefor: convertToArray(meal.suitablefor),
      allergiesexcluded: convertToArray(meal.allergiesexcluded),
    }));
  }, [monthlyPlan, selectedDate]);

  useEffect(() => {
    if (dailyMeals.length > 0) {
      const completedCount = dailyMeals.filter(meal => meal.completed).length;
      setDailyProgress(Math.round((completedCount / dailyMeals.length) * 100));
    } else {
      setDailyProgress(0);
    }
  }, [dailyMeals]);

  const handleCompleteMeal = async (mealId: string, currentlyCompleted: boolean) => {
    try {
      await markMealAsCompleted(mealId, !currentlyCompleted);
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error("Failed to update meal completion:", error);
    }
  };

  const handleMealSelection = (meal: Meal) => {
    setSelectedMeal(meal);
  };

  const renderDateItem = ({ item }: { item: Date }) => {
    const dateStr = item.toISOString().split('T')[0];
    const isSelected = dateStr === selectedDate;
    const isToday = item.toDateString() === new Date().toDateString();
    
    return (
      <TouchableOpacity 
        onPress={() => setSelectedDate(dateStr)}
        style={[styles.dateItem, isSelected && styles.selectedDateItem]}
      >
        <Text style={[
          styles.dateDay, 
          isSelected ? styles.selectedDateText : isToday ? styles.todayDateText : {}
        ]}>
          {item.toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <View style={[
          styles.dateNumberContainer,
          isToday && !isSelected && styles.todayContainer,
          isSelected && styles.selectedDateContainer
        ]}>
          <Text style={[
            styles.dateNumber,
            isSelected && styles.selectedDateText
          ]}>
            {item.getDate()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMealItem = ({ item }: { item: Meal }) => {
    const mealColor = getMealTypeColor(item.type);
    
    return (
      <TouchableOpacity 
        style={styles.mealCard}
        onPress={() => handleMealSelection(item)}
      >
        <View style={styles.mealCardContent}>
          <Image source={{ uri: item.image }} style={styles.mealImage} />
          <View style={styles.mealInfo}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTypeContainer}>
                <MaterialCommunityIcons
                  name={getMealTypeIcon(item.type)}
                  size={14}
                  color={mealColor}
                />
                <Text style={[styles.mealTypeText, { color: mealColor }]}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleCompleteMeal(item.id, item.completed)}
              >
                <Ionicons
                  name={item.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={item.completed ? "#4ECDC4" : "#ddd"}
                />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.mealName}>{item.name}</Text>
            <Text style={styles.mealTime}>{item.time}</Text>
            
            <View style={styles.nutritionContainer}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{item.calories}</Text>
                <Text style={styles.nutritionLabel}>kcal</Text>
              </View>
              <View style={styles.nutritionDivider} />
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{item.protein}g</Text>
                <Text style={styles.nutritionLabel}>protein</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMealDetailsModal = () => (
    <Modal
      visible={!!selectedMeal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSelectedMeal(null)}
    >
      <View style={styles.modalContainer}>
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setSelectedMeal(null)} 
        />
        
        <View style={styles.modalContent}>
          <Image 
            source={{ uri: selectedMeal?.image || '' }} 
            style={styles.modalImage}
          />
          
          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalMealName}>{selectedMeal?.name}</Text>
              <View style={styles.modalNutritionRow}>
                <View style={styles.modalNutritionItem}>
                  <Text style={styles.modalNutritionValue}>{selectedMeal?.calories}</Text>
                  <Text style={styles.modalNutritionLabel}>Calories</Text>
                </View>
                <View style={styles.modalNutritionDivider} />
                <View style={styles.modalNutritionItem}>
                  <Text style={styles.modalNutritionValue}>{selectedMeal?.protein}g</Text>
                  <Text style={styles.modalNutritionLabel}>Protein</Text>
                </View>
                <View style={styles.modalNutritionDivider} />
                <View style={styles.modalNutritionItem}>
                  <Text style={styles.modalNutritionValue}>{selectedMeal?.carbs}g</Text>
                  <Text style={styles.modalNutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.modalNutritionDivider} />
                <View style={styles.modalNutritionItem}>
                  <Text style={styles.modalNutritionValue}>{selectedMeal?.fat}g</Text>
                  <Text style={styles.modalNutritionLabel}>Fat</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.modalDescription}>{selectedMeal?.description}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredientsList}>
                {selectedMeal?.ingredients.map((ingredient, index) => (
                  <View key={`ing-${index}`} style={styles.ingredientItem}>
                    <View style={styles.ingredientBullet} />
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Preparation</Text>
              <View style={styles.preparationSteps}>
                {selectedMeal?.preparation.map((step, index) => (
                  <View key={`step-${index}`} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedMeal(null)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.planName}>{mealPlanName}</Text>
            <Text style={styles.planSubtitle}>Your daily meal plan</Text>
          </View>
          
          <Animated.View 
            style={[
              styles.progressContainer, 
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Daily Progress</Text>
              <Text style={styles.progressPercent}>{dailyProgress}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <LinearGradient 
                colors={['#6C63FF', '#4ECDC4']}
                style={[styles.progressBar, { width: `${dailyProgress}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </Animated.View>
        </View>

        <View style={styles.datesContainer}>
          <FlatList
            data={dates}
            renderItem={renderDateItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesList}
            keyExtractor={item => item.toISOString()}
          />
        </View>

        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          
          {dailyMeals.length > 0 ? (
            <FlatList
              data={dailyMeals}
              renderItem={renderMealItem}
              scrollEnabled={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.mealList}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name="food-off" 
                size={40} 
                color="#ddd" 
              />
              <Text style={styles.emptyStateText}>No meals planned for today</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderMealDetailsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    padding: 20,
    paddingBottom: 15,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
  },
  progressBarBackground: {
    height: 6,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  datesContainer: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  datesList: {
    paddingBottom: 8,
  },
  dateItem: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dateNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  todayContainer: {
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  selectedDateContainer: {
    backgroundColor: '#6C63FF',
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedDateText: {
    color: '#6C63FF',
  },
  todayDateText: {
    color: '#6C63FF',
  },
  selectedDateItem: {
    backgroundColor: 'transparent',
  },
  mealsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  mealList: {
    paddingBottom: 8,
  },
  mealCard: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  mealCardContent: {
    flexDirection: 'row',
  },
  mealImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mealInfo: {
    flex: 1,
    padding: 12,
    paddingLeft: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  nutritionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#999',
  },
  nutritionDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  completeButton: {
    padding: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  modalMealName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  modalNutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalNutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  modalNutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C63FF',
  },
  modalNutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalNutritionDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  modalSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  ingredientsList: {
    marginTop: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C63FF',
    marginRight: 10,
  },
  ingredientText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  preparationSteps: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MealsScreen;