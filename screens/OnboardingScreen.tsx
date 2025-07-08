import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner-native';

type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Onboarding: undefined;
};

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const { width } = Dimensions.get('window');

type Option = {
  id: string;
  name: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  description?: string;
  image?: string;
};

type CuisineOption = Option & { description: string };
type DietGoalOption = Option & { description: string };
type ActivityLevelOption = Option & { description: string };
type HealthConditionOption = Option & { severity: 'low' | 'medium' | 'high' };

const DIET_GOALS: DietGoalOption[] = [
  { id: 'weight_loss', name: 'Weight Loss', icon: 'scale-bathroom', description: 'Calorie-controlled meals to help you shed extra weight' },
  { id: 'muscle_gain', name: 'Muscle Gain', icon: 'arm-flex', description: 'Protein-rich meals to support muscle growth' },
  { id: 'balanced', name: 'Balanced Diet', icon: 'nutrition', description: 'Well-rounded nutrition for overall health' },
  { id: 'diabetes', name: 'Diabetic', icon: 'diabetes', description: 'Low glycemic index foods to manage blood sugar' },
];

const DIET_TYPES: Option[] = [
  { id: 'veg', name: 'Vegetarian', icon: 'leaf' },
  { id: 'non_veg', name: 'Non-Vegetarian', icon: 'food-steak' },
  { id: 'jain', name: 'Jain', icon: 'fruit-watermelon' },
];

const CUISINES: CuisineOption[] = [
  { id: 'north_indian', name: 'North Indian', description: 'Punjabi, Kashmiri, Mughlai', image: 'north_indian_thali' },
  { id: 'south_indian', name: 'South Indian', description: 'Tamil, Telugu, Kannada, Malayalam', image: 'south_indian_thali' },
  { id: 'east_indian', name: 'East Indian', description: 'Bengali, Odia, Assamese', image: 'bengali_food_platter' },
  { id: 'west_indian', name: 'West Indian', description: 'Maharashtrian, Gujarati, Rajasthani', image: 'maharashtrian_food_platter' },
];

const ACTIVITY_LEVELS: ActivityLevelOption[] = [
  { id: 'sedentary', name: 'Sedentary', icon: 'sofa', description: 'Little or no exercise' },
  { id: 'moderate', name: 'Moderately Active', icon: 'run', description: '3-5 days/week' },
  { id: 'very', name: 'Very Active', icon: 'bike', description: '6-7 days/week' },
];

const ALLERGIES: Option[] = [
  { id: 'dairy', name: 'Dairy', icon: 'cheese' },
  { id: 'nuts', name: 'Nuts', icon: 'peanut' },
  { id: 'gluten', name: 'Gluten', icon: 'barley' },
  { id: 'seafood', name: 'Seafood', icon: 'fish' },
  { id: 'eggs', name: 'Eggs', icon: 'egg' },
  { id: 'soy', name: 'Soy', icon: 'seed' },
];

const COOKING_TIMES: Option[] = [
  { id: 'quick', name: 'Quick (< 15 min)', icon: 'timer-sand' },
  { id: 'medium', name: 'Medium (15-30 min)', icon: 'timer-outline' },
  { id: 'long', name: 'Elaborate (> 30 min)', icon: 'pot-steam' },
];

const SPICE_LEVELS: Option[] = [
  { id: 'mild', name: 'Mild', icon: 'thermometer-low' },
  { id: 'medium', name: 'Medium', icon: 'thermometer' },
  { id: 'spicy', name: 'Spicy', icon: 'thermometer-high' },
];

const HEALTH_CONDITIONS: HealthConditionOption[] = [
  { id: 'diabetes', name: 'Diabetes', icon: 'needle', severity: 'high' },
  { id: 'hypertension', name: 'Hypertension', icon: 'heart-pulse', severity: 'high' },
  { id: 'pcos', name: 'PCOS', icon: 'gender-female', severity: 'medium' },
  { id: 'thyroid', name: 'Thyroid', icon: 'atom', severity: 'medium' },
  { id: 'cholesterol', name: 'High Cholesterol', icon: 'water-alert', severity: 'high' },
  { id: 'ibs', name: 'IBS', icon: 'stomach', severity: 'medium' },
  { id: 'heart_disease', name: 'Heart Disease', icon: 'heart', severity: 'high' },
  { id: 'kidney_disease', name: 'Kidney Disease', icon: 'water', severity: 'high' },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [idealWeightRange, setIdealWeightRange] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedDietType, setSelectedDietType] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedActivityLevel, setSelectedActivityLevel] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedCookingTime, setSelectedCookingTime] = useState('');
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / 10,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      const bmiValue = weightInKg / (heightInMeters * heightInMeters);
      setBmi(parseFloat(bmiValue.toFixed(1)));

      const minWeight = (18.5 * (heightInMeters * heightInMeters)).toFixed(1);
      const maxWeight = (24.9 * (heightInMeters * heightInMeters)).toFixed(1);
      setIdealWeightRange(`${minWeight} - ${maxWeight} kg`);
    }
  }, [height, weight]);

  const handleNext = () => {
      if (currentStep === 1 && !name) {
    toast.error("Please enter your name");
    return;
  }
  
  if (currentStep === 2 && (!height || !weight)) {
    toast.error("Please enter both height and weight");
    return;
  }
  
  if (currentStep === 3 && !selectedGoal) {
    toast.error("Please select your goal");
    return;
  }
  
  if (currentStep === 4 && !selectedDietType) {
    toast.error("Please select your diet type");
    return;
  }
  
  if (currentStep === 5 && selectedCuisines.length === 0) {
    toast.error("Please select at least one cuisine");
    return;
  }
  
  if (currentStep === 6 && !selectedActivityLevel) {
    toast.error("Please select your activity level");
    return;
  }

  if (currentStep === 9 && !selectedCookingTime) {
    toast.error("Please select your cooking time");
    return;
  }

  if (currentStep === 10 && !selectedSpiceLevel) {
    toast.error("Please select your spice level");
    return;
  }
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateX, {
        toValue: 50,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    setTimeout(() => {
      if (currentStep < 9) {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      } else {
        handleComplete();
      }
    }, 200);
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 50,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(translateX, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      }, 200);
    }
  };
  
  const handleComplete = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw userError || new Error('No authenticated user found');
      }

      const onboardingData = {
        user_id: user.id,
        name,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        bmi,
        ideal_weight_range: idealWeightRange || null,
        goal: selectedGoal || null,
        diet_type: selectedDietType || null,
        cuisines: selectedCuisines.length > 0 ? selectedCuisines : null,
        activity_level: selectedActivityLevel || null,
        allergies: selectedAllergies.length > 0 ? selectedAllergies : null,
        cooking_time: selectedCookingTime || null,
        spice_level: selectedSpiceLevel || null,
        health_conditions: selectedConditions.length > 0 ? selectedConditions : null,
        custom_condition: customCondition || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await AsyncStorage.multiSet([
        ['@hasCompletedOnboarding', 'true'],
        ['@userName', name || 'User'],
        ['@userPreferences', JSON.stringify(onboardingData)]
      ]);

      const { error } = await supabase
        .from('onboarding_info')
        .upsert(onboardingData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Profile created!", {
        description: "Your personalized meal plan is ready",
        duration: 3000,
      });
      
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error("Failed to save to cloud. Using local storage.", {
        duration: 3000,
      });
      navigation.navigate('Home');
    }
  };

  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id));
    } else {
      setList([...list, id]);
    }
  };
  
  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }) 
            }
          ]}
        />
      </View>
    );
  };
  
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {Array(9).fill(0).map((_, index) => (
          <View 
            key={index}
            style={[
              styles.stepDot,
              currentStep === index ? styles.activeDot : {},
              currentStep > index ? styles.completedDot : {},
            ]}
          />
        ))}
      </View>
    );
  };
  
  const renderPersonalInfoStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepDescription}>
          We'll use this information to create your personalized meal plan
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>
        
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Years"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderSelector}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'male' ? styles.selectedGender : {}
                ]}
                onPress={() => setGender('male')}
              >
                <Ionicons name="male" size={20} color={gender === 'male' ? 'white' : '#666'} />
                <Text style={[styles.genderText, gender === 'male' ? styles.selectedGenderText : {}]}>
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'female' ? styles.selectedGender : {}
                ]}
                onPress={() => setGender('female')}
              >
                <Ionicons name="female" size={20} color={gender === 'female' ? 'white' : '#666'} />
                <Text style={[styles.genderText, gender === 'female' ? styles.selectedGenderText : {}]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  const renderBodyMetricsStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Body Metrics</Text>
        <Text style={styles.stepDescription}>
          We'll use this to calculate your nutritional needs
        </Text>
        
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your height"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your weight"
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
            />
          </View>
        </View>
        
        {bmi && (
          <View style={styles.metricDisplay}>
            <Text style={styles.metricText}>BMI: {bmi}</Text>
            <Text style={styles.metricText}>Ideal Weight Range: {idealWeightRange}</Text>
          </View>
        )}
      </View>
    );
  };
  
  const renderGoalStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What's your goal?</Text>
        <Text style={styles.stepDescription}>
          We'll customize your meal plan based on your health goals
        </Text>
        
        <View style={styles.gridContainer}>
          {DIET_GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.card,
                selectedGoal === goal.id ? styles.selectedCard : {}
              ]}
              onPress={() => setSelectedGoal(goal.id)}
            >
              <View style={[
                styles.iconContainer,
                selectedGoal === goal.id ? styles.selectedIconContainer : {}
              ]}>
                <MaterialCommunityIcons 
                  name={goal.icon} 
                  size={28} 
                  color={selectedGoal === goal.id ? '#FF6B6B' : '#666'} 
                />
              </View>
              <Text style={[
                styles.cardTitle,
                selectedGoal === goal.id ? styles.selectedCardTitle : {}
              ]}>
                {goal.name}
              </Text>
              <Text style={styles.cardDescription}>{goal.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderDietTypeStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Diet Type</Text>
        <Text style={styles.stepDescription}>
          Select your dietary preference
        </Text>
        
        <View style={styles.gridContainer}>
          {DIET_TYPES.map((dietType) => (
            <TouchableOpacity
              key={dietType.id}
              style={[
                styles.card,
                selectedDietType === dietType.id ? styles.selectedCard : {}
              ]}
              onPress={() => setSelectedDietType(dietType.id)}
            >
              <MaterialCommunityIcons 
                name={dietType.icon} 
                size={32} 
                color={selectedDietType === dietType.id ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.cardTitle,
                selectedDietType === dietType.id ? styles.selectedCardTitle : {}
              ]}>
                {dietType.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderCuisineStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Cuisine Preferences</Text>
        <Text style={styles.stepDescription}>
          Select all cuisines you enjoy (you can choose multiple)
        </Text>
        
        <View style={styles.verticalCuisineContainer}>
          {CUISINES.map((cuisine) => (
            <TouchableOpacity
              key={cuisine.id}
              style={[
                styles.verticalCuisineCard,
                selectedCuisines.includes(cuisine.id) ? styles.selectedCard : {}
              ]}
              onPress={() => toggleSelection(selectedCuisines, setSelectedCuisines, cuisine.id)}
            >
              <Image
                source={{ uri: `https://source.unsplash.com/random/300x300/?${cuisine.image}` }}
                style={styles.verticalCuisineImage}
              />
              <View style={styles.verticalCuisineTextContainer}>
                <Text style={styles.verticalCuisineTitle}>{cuisine.name}</Text>
                <Text style={styles.verticalCuisineDescription}>{cuisine.description}</Text>
              </View>
              {selectedCuisines.includes(cuisine.id) && (
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderActivityStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Activity Level</Text>
        <Text style={styles.stepDescription}>
          How active are you on a typical week?
        </Text>
        
        <View style={styles.listContainer}>
          {ACTIVITY_LEVELS.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.listItem,
                selectedActivityLevel === activity.id ? styles.selectedListItem : {}
              ]}
              onPress={() => setSelectedActivityLevel(activity.id)}
            >
              <MaterialCommunityIcons 
                name={activity.icon} 
                size={24} 
                color={selectedActivityLevel === activity.id ? '#FF6B6B' : '#666'} 
              />
              <View style={styles.listItemTextContainer}>
                <Text style={[
                  styles.listItemTitle,
                  selectedActivityLevel === activity.id ? styles.selectedListItemTitle : {}
                ]}>
                  {activity.name}
                </Text>
                <Text style={styles.listItemDescription}>{activity.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderAllergiesStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Food Allergies & Intolerances</Text>
        <Text style={styles.stepDescription}>
          Select all that apply (if any)
        </Text>
        
        <View style={styles.gridContainer}>
          {ALLERGIES.map((allergy) => (
            <TouchableOpacity
              key={allergy.id}
              style={[
                styles.card,
                selectedAllergies.includes(allergy.id) ? styles.selectedCard : {}
              ]}
              onPress={() => toggleSelection(selectedAllergies, setSelectedAllergies, allergy.id)}
            >
              <MaterialCommunityIcons 
                name={allergy.icon} 
                size={28} 
                color={selectedAllergies.includes(allergy.id) ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.cardTitle,
                selectedAllergies.includes(allergy.id) ? styles.selectedCardTitle : {}
              ]}>
                {allergy.name}
              </Text>
              
              {selectedAllergies.includes(allergy.id) && (
                <View style={styles.selectedCheckSmall}>
                  <Ionicons name="close-circle" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderHealthConditionsStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Health Conditions</Text>
        <Text style={styles.stepDescription}>
          Select any health conditions you have (optional)
        </Text>
        
        <View style={styles.gridContainer}>
          {HEALTH_CONDITIONS.map((condition) => (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.card,
                selectedConditions.includes(condition.id) ? styles.selectedCard : {},
                condition.severity === 'high' ? styles.highSeverity : {},
                condition.severity === 'medium' ? styles.mediumSeverity : {},
              ]}
              onPress={() => toggleSelection(selectedConditions, setSelectedConditions, condition.id)}
            >
              <MaterialCommunityIcons 
                name={condition.icon} 
                size={28} 
                color={selectedConditions.includes(condition.id) ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.cardTitle,
                selectedConditions.includes(condition.id) ? styles.selectedCardTitle : {}
              ]}>
                {condition.name}
              </Text>
              
              {selectedConditions.includes(condition.id) && (
                <View style={styles.selectedCheckSmall}>
                  <Ionicons name="close-circle" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Other conditions not listed?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter any other health conditions"
            value={customCondition}
            onChangeText={setCustomCondition}
          />
        </View>
      </View>
    );
  };
  
  const renderCookingTimeStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Cooking Time Preferences</Text>
        <Text style={styles.stepDescription}>
          How much time do you typically have for cooking?
        </Text>
        
        <View style={styles.listContainer}>
          {COOKING_TIMES.map((time) => (
            <TouchableOpacity
              key={time.id}
              style={[
                styles.listItem,
                selectedCookingTime === time.id ? styles.selectedListItem : {}
              ]}
              onPress={() => setSelectedCookingTime(time.id)}
            >
              <MaterialCommunityIcons 
                name={time.icon} 
                size={24} 
                color={selectedCookingTime === time.id ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.listItemTitle,
                selectedCookingTime === time.id ? styles.selectedListItemTitle : {}
              ]}>
                {time.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderSpiceLevelStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Spice Level Preference</Text>
        <Text style={styles.stepDescription}>
          How spicy do you like your food?
        </Text>
        
        <View style={styles.listContainer}>
          {SPICE_LEVELS.map((spice) => (
            <TouchableOpacity
              key={spice.id}
              style={[
                styles.listItem,
                selectedSpiceLevel === spice.id ? styles.selectedListItem : {}
              ]}
              onPress={() => setSelectedSpiceLevel(spice.id)}
            >
              <MaterialCommunityIcons 
                name={spice.icon} 
                size={24} 
                color={selectedSpiceLevel === spice.id ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.listItemTitle,
                selectedSpiceLevel === spice.id ? styles.selectedListItemTitle : {}
              ]}>
                {spice.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderPersonalInfoStep();
      case 1: return renderBodyMetricsStep();
      case 2: return renderGoalStep();
      case 3: return renderDietTypeStep();
      case 4: return renderCuisineStep();
      case 5: return renderActivityStep();
      case 6: return renderAllergiesStep();
      case 7: return renderHealthConditionsStep();
      case 8: return renderSpiceLevelStep();
      case 9: return renderCookingTimeStep();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {currentStep > 0 && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.headerCenter}>
            <Image
              source={{ uri: 'https://i.imgur.com/mCHMpLT.png' }}
              style={styles.logo}
            />
            <Text style={styles.appName}>EatSmart</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>
        
        {renderProgressBar()}
        {renderStepIndicator()}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: translateX }],
              }
            ]}
          >
            {renderCurrentStep()}
          </Animated.View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep < 9 ? 'Continue' : 'Complete'}
            </Text>
            <Ionicons 
              name={currentStep < 9 ? 'arrow-forward' : 'checkmark'} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  stepContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    width: 40,
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginRight: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  previewButton: {
    padding: 5,
  },
  previewText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#6C63FF',
    borderRadius: 2,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEE',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#6C63FF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  completedDot: {
    backgroundColor: '#4ECDC4',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  stepContainer: {
    paddingVertical: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 2,
  },
  selectedGender: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  selectedGenderText: {
    color: 'white',
  },
  metricDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  metricText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0F0FF',
  },
  highSeverity: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  mediumSeverity: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedIconContainer: {
    backgroundColor: '#F0F0FF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  selectedCardTitle: {
    color: '#6C63FF',
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  verticalCuisineContainer: {
    marginBottom: 15,
  },
  verticalCuisineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  verticalCuisineImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  verticalCuisineTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  verticalCuisineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  verticalCuisineDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  listContainer: {
    marginBottom: 15,
  },
  listItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedListItem: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0F0FF',
  },
  listItemTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  listItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  selectedListItemTitle: {
    color: '#6C63FF',
  },
  listItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  selectedCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  selectedCheckSmall: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 2,
  },
});