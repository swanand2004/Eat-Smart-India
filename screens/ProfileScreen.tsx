import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../lib/auth';

type Option = {
  id: string;
  name: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
};

const DIET_GOALS: Option[] = [
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

const CUISINES: Option[] = [
  { id: 'north_indian', name: 'North Indian', description: 'Punjabi, Kashmiri, Mughlai' },
  { id: 'south_indian', name: 'South Indian', description: 'Tamil, Telugu, Kannada, Malayalam' },
  { id: 'east_indian', name: 'East Indian', description: 'Bengali, Odia, Assamese' },
  { id: 'west_indian', name: 'West Indian', description: 'Maharashtrian, Gujarati, Rajasthani' },
];

const ACTIVITY_LEVELS: Option[] = [
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

const HEALTH_CONDITIONS: Option[] = [
  { id: 'diabetes', name: 'Diabetes', icon: 'needle', severity: 'high' },
  { id: 'hypertension', name: 'Hypertension', icon: 'heart-pulse', severity: 'high' },
  { id: 'pcos', name: 'PCOS', icon: 'gender-female', severity: 'medium' },
  { id: 'thyroid', name: 'Thyroid', icon: 'atom', severity: 'medium' },
  { id: 'cholesterol', name: 'High Cholesterol', icon: 'water-alert', severity: 'high' },
  { id: 'ibs', name: 'IBS', icon: 'stomach', severity: 'medium' },
  { id: 'heart_disease', name: 'Heart Disease', icon: 'heart', severity: 'high' },
  { id: 'kidney_disease', name: 'Kidney Disease', icon: 'water', severity: 'high' },
];

type EditStepField = {
  key: keyof UserData;
  label: string;
  options: Option[];
  type: 'single-select' | 'multi-select';
  description?: string;
};

type EditStep = {
  title: string;
  fields: EditStepField[];
};

const EDIT_STEPS: EditStep[] = [
  {
    title: 'Diet Goals',
    fields: [
      { 
        key: 'goal', 
        label: 'What\'s your goal?', 
        options: DIET_GOALS,
        type: 'single-select',
        description: 'We\'ll customize your meal plan based on your health goals'
      }
    ]
  },
  {
    title: 'Diet Type',
    fields: [
      { 
        key: 'diet_type', 
        label: 'Diet Preference', 
        options: DIET_TYPES,
        type: 'single-select',
        description: 'Select your dietary preference'
      }
    ]
  },
  {
    title: 'Cuisine Preferences',
    fields: [
      { 
        key: 'cuisines', 
        label: 'Preferred Cuisines', 
        options: CUISINES,
        type: 'multi-select',
        description: 'Select all cuisines you enjoy (you can choose multiple)'
      }
    ]
  },
  {
    title: 'Activity Level',
    fields: [
      { 
        key: 'activity_level', 
        label: 'How active are you?', 
        options: ACTIVITY_LEVELS,
        type: 'single-select',
        description: 'How active are you on a typical week?'
      }
    ]
  },
  {
    title: 'Food Allergies',
    fields: [
      { 
        key: 'allergies', 
        label: 'Allergies & Intolerances', 
        options: ALLERGIES,
        type: 'multi-select',
        description: 'Select all that apply (if any)'
      }
    ]
  },
  {
    title: 'Health Conditions',
    fields: [
      { 
        key: 'health_conditions', 
        label: 'Health Conditions', 
        options: HEALTH_CONDITIONS,
        type: 'multi-select',
        description: 'Select any health conditions you have (optional)'
      }
    ]
  },
  {
    title: 'Spice Level',
    fields: [
      { 
        key: 'spice_level', 
        label: 'Spice Preference', 
        options: SPICE_LEVELS,
        type: 'single-select',
        description: 'How spicy do you like your food?'
      }
    ]
  },
  {
    title: 'Cooking Time',
    fields: [
      { 
        key: 'cooking_time', 
        label: 'Cooking Preference', 
        options: COOKING_TIMES,
        type: 'single-select',
        description: 'How much time do you typically have for cooking?'
      }
    ]
  }
];

type UserData = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  ideal_weight_range?: string;
  goal?: string;
  diet_type?: string;
  cuisines?: string[];
  activity_level?: string;
  allergies?: string[];
  cooking_time?: string;
  spice_level?: string;
  health_conditions?: string[];
  current_diet_plan?: string;
  updated_at?: string; // Add this line
};

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserData>>({
    cuisines: [],
    allergies: [],
    health_conditions: []
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser?.id) {
        Alert.alert('Session Expired', 'Please login again');
        return;
      }

      try {
        setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('No valid session found');
          return;
        }

        const cachedData = await AsyncStorage.getItem(`@userProfile_${authUser.id}`);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setUserData(parsedData);
          setFormData({
            ...parsedData,
            cuisines: parsedData.cuisines || [],
            allergies: parsedData.allergies || [],
            health_conditions: parsedData.health_conditions || []
          });
        }

        const { data: profileData, error: profileError } = await supabase
          .from('onboarding_info')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (profileError) throw profileError;

        if (profileData) {
          const transformedData = {
            id: authUser.id,
            email: authUser.email,
            phone: authUser.phone,
            name: profileData.name || authUser.user_metadata?.full_name,
            cuisines: profileData.cuisines || [],
            allergies: profileData.allergies || [],
            health_conditions: profileData.health_conditions || [],
            ...profileData,
          };

          setUserData(transformedData);
          setFormData({
            ...transformedData,
            cuisines: transformedData.cuisines || [],
            allergies: transformedData.allergies || [],
            health_conditions: transformedData.health_conditions || []
          });
          await AsyncStorage.setItem(`@userProfile_${authUser.id}`, JSON.stringify(transformedData));
        }

        const { data: premiumData } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', authUser.id)
          .single();

        setIsPremium(premiumData?.status === 'active');

      } catch (error) {
        console.error('Profile load error:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser?.id]);

  const handleSaveChanges = async () => {
  if (!authUser?.id) {
    Alert.alert('Error', 'No authenticated user');
    return;
  }

  try {
    setLoading(true);

    // 1. Prepare update data with proper typing
    const updateData: Partial<UserData> = {
      goal: formData.goal,
      diet_type: formData.diet_type,
      cuisines: formData.cuisines || [],
      activity_level: formData.activity_level,
      allergies: formData.allergies || [],
      cooking_time: formData.cooking_time,
      spice_level: formData.spice_level,
      health_conditions: formData.health_conditions || [],
      updated_at: new Date().toISOString()
    };

    // 2. Update user preferences in onboarding_info
    const { error: updateError } = await supabase
      .from('onboarding_info')
      .update(updateData)
      .eq('user_id', authUser.id);

    if (updateError) throw updateError;

    // 3. Call Edge Function to generate new meal plan
    const { data: planData, error: planError } = await supabase.functions.invoke(
      'generate_meal_plan',
      {
        body: {
          user_id: authUser.id,
          preferences: updateData,
          forceRefresh: true // ✅ force new meal plan generation
        }
      }
    );

    if (planError) throw planError;

    // 4. Create properly typed updated user data
    const updatedData: UserData = {
      id: authUser.id, // Ensure required field is set
      ...userData, // Existing data
      ...updateData, // Updated preferences
      current_diet_plan: planData?.plan_name || 'Custom Plan' // From Edge Function
    };

    // 5. Update state and storage
    setUserData(updatedData);
    await AsyncStorage.setItem(`@userProfile_${authUser.id}`, JSON.stringify(updatedData));

    setEditModalVisible(false);
    Alert.alert('Success', 'Profile and meal plan updated successfully!');
  } catch (error) {
    console.error('Save error:', error);
    let errorMessage = 'Failed to save changes';
    
    if (error instanceof Error) {
      if (error.message.includes('meal plan')) {
        errorMessage = 'Profile saved but meal plan generation failed';
      }
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
  }
};

  const handleLogout = async () => {
    try {
      if (authUser?.id) {
        await AsyncStorage.removeItem(`@userProfile_${authUser.id}`);
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleChangePlan = () => {
    if (!authUser?.id) {
      Alert.alert('Error', 'Please login again');
      return;
    }
    setFormData({
      ...userData,
      cuisines: userData?.cuisines || [],
      allergies: userData?.allergies || [],
      health_conditions: userData?.health_conditions || []
    });
    setEditModalVisible(true);
    setCurrentStep(0);
  };

  const handleFieldSelect = (key: keyof UserData, value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [key]: value 
    }));
  };

  const toggleSelection = (key: keyof UserData, value: string) => {
    setFormData(prev => {
      const currentValues = Array.isArray(prev[key]) ? [...(prev[key] as string[])] : [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  };

  const handleNextStep = () => {
    if (currentStep < EDIT_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCloseModal = () => {
    setFormData({
      ...userData,
      cuisines: userData?.cuisines || [],
      allergies: userData?.allergies || [],
      health_conditions: userData?.health_conditions || []
    });
    setEditModalVisible(false);
    setCurrentStep(0);
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Go Premium',
      'Unlock all premium features for $9.99/month',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe', 
          onPress: () => Linking.openURL('https://your-app.com/premium') 
        },
      ]
    );
  };

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi >= 18.5 && bmi < 25) return 'Normal';
    if (bmi >= 25 && bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const renderEditField = (field: EditStepField) => {
    switch (field.type) {
      case 'single-select':
        return (
          <View style={styles.optionsContainer}>
            {field.options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  formData[field.key] === option.id && styles.selectedOption
                ]}
                onPress={() => handleFieldSelect(field.key, option.id)}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={24} 
                      color={formData[field.key] === option.id ? '#6C63FF' : '#666'} 
                      style={styles.optionIcon}
                    />
                  )}
                  <View>
                    <Text style={[
                      styles.optionText,
                      formData[field.key] === option.id && styles.selectedOptionText
                    ]}>
                      {option.name}
                    </Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      
      case 'multi-select':
        return (
          <View style={styles.optionsContainer}>
            {field.options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  (formData[field.key] as string[])?.includes(option.id) && styles.selectedOption
                ]}
                onPress={() => toggleSelection(field.key, option.id)}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={24} 
                      color={(formData[field.key] as string[])?.includes(option.id) ? '#6C63FF' : '#666'} 
                      style={styles.optionIcon}
                    />
                  )}
                  <View>
                    <Text style={[
                      styles.optionText,
                      (formData[field.key] as string[])?.includes(option.id) && styles.selectedOptionText
                    ]}>
                      {option.name}
                    </Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    )}
                  </View>
                </View>
                {(formData[field.key] as string[])?.includes(option.id) && (
                  <Ionicons name="checkmark-circle" size={20} color="#6C63FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderProfileRow = (label: string, value: string | undefined | string[], icon: keyof typeof Ionicons.glyphMap) => {
    let displayValue = 'Not set';
    
    if (Array.isArray(value)) {
      displayValue = value.length > 0 ? 
        value.map(v => {
          let option;
          if (label === 'Preferred Cuisines') {
            option = CUISINES.find(c => c.id === v);
          } else if (label === 'Allergies') {
            option = ALLERGIES.find(a => a.id === v);
          } else if (label === 'Health Conditions') {
            option = HEALTH_CONDITIONS.find(h => h.id === v);
          }
          return option?.name || v;
        }).join(', ') : 'None';
    } else if (value) {
      displayValue = value;
    }

    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Ionicons name={icon} size={22} color="#666" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowValue} numberOfLines={1}>{displayValue}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  if (!authUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Please login to view your profile</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Feather name="log-out" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: 'https://i.imgur.com/mCHMpLT.png' }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{userData?.name || 'User'}</Text>
              <Text style={styles.memberSince}>
                Member since {new Date(authUser.created_at).getFullYear()}
              </Text>
            </View>
          </View>

          {!isPremium && (
            <TouchableOpacity 
              style={styles.premiumBanner}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={['#FF9A9E', '#FAD0C4']}
                style={styles.premiumGradient}
              >
                <View style={styles.premiumContent}>
                  <Ionicons name="diamond" size={20} color="#FFF" />
                  <Text style={styles.premiumText}>Upgrade to Premium</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {renderProfileRow("Name", userData?.name, "person-outline")}
          {renderProfileRow("Email", userData?.email, "mail-outline")}
          {renderProfileRow("Phone", userData?.phone, "call-outline")}
          {renderProfileRow("Gender", userData?.gender, "transgender-outline")}
          {renderProfileRow("Age", userData?.age ? `${userData.age} years` : undefined, "calendar-outline")}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Diet Plan</Text>
          <View style={styles.dietPlanContainer}>
            <Text style={styles.dietPlanText}>{userData?.current_diet_plan || 'No active plan'}</Text>
            <TouchableOpacity 
              style={styles.changePlanButton}
              onPress={handleChangePlan}
            >
              <Text style={styles.changePlanButtonText}>Change Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <MaterialCommunityIcons name="scale" size={18} color="#6C63FF" />
                <Text style={styles.metricTitle}>Weight</Text>
              </View>
              <Text style={styles.metricValue}>{userData?.weight ? `${userData.weight} kg` : '--'}</Text>
              {userData?.ideal_weight_range && (
                <Text style={styles.metricSubtitle}>Ideal: {userData.ideal_weight_range}</Text>
              )}
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <MaterialCommunityIcons name="human-male-height" size={18} color="#6C63FF" />
                <Text style={styles.metricTitle}>Height</Text>
              </View>
              <Text style={styles.metricValue}>{userData?.height ? `${userData.height} cm` : '--'}</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <MaterialCommunityIcons name="heart-pulse" size={18} color="#6C63FF" />
                <Text style={styles.metricTitle}>BMI</Text>
              </View>
              <Text style={styles.metricValue}>{userData?.bmi ? userData.bmi.toFixed(1) : '--'}</Text>
              {userData?.bmi && (
                <Text style={styles.metricSubtitle}>{getBmiCategory(userData.bmi)}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          {renderProfileRow("Diet Goal", userData?.goal, "flag-outline")}
          {renderProfileRow("Diet Type", userData?.diet_type, "nutrition-outline")}
          {renderProfileRow("Preferred Cuisines", userData?.cuisines, "restaurant-outline")}
          {renderProfileRow("Spice Level", userData?.spice_level, "flame-outline")}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          {renderProfileRow("Activity Level", userData?.activity_level, "walk-outline")}
          {renderProfileRow("Cooking Time", userData?.cooking_time, "time-outline")}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health</Text>
          {renderProfileRow("Allergies", userData?.allergies, "alert-circle-outline")}
          {renderProfileRow("Health Conditions", userData?.health_conditions, "medkit-outline")}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.editModalTitle}>
                  {EDIT_STEPS[currentStep].title} ({currentStep + 1}/{EDIT_STEPS.length})
                </Text>
                <View style={{ width: 24 }} />
              </View>
              
              <FlatList
                data={EDIT_STEPS[currentStep].fields}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>{item.label}</Text>
                    {item.description && (
                      <Text style={styles.editFieldDescription}>{item.description}</Text>
                    )}
                    {renderEditField(item)}
                  </View>
                )}
              />

              <View style={styles.modalButtonsContainer}>
                {currentStep > 0 && (
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={handlePrevStep}
                  >
                    <Text style={styles.modalButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                
                {currentStep < EDIT_STEPS.length - 1 ? (
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.primaryButton]}
                    onPress={handleNextStep}
                  >
                    <Text style={[styles.modalButtonText, styles.primaryButtonText]}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.primaryButton]}
                    onPress={handleSaveChanges}
                  >
                    <Text style={[styles.modalButtonText, styles.primaryButtonText]}>Save Changes</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#999',
  },
  premiumBanner: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  premiumGradient: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: '#333',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  rowValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  dietPlanContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dietPlanText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  changePlanButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  changePlanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: '#FFF',
    width: '90%',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  editFieldContainer: {
    marginBottom: 20,
  },
  editFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  editFieldDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#F0F0FF',
    borderColor: '#6C63FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFF',
  },
});

export default ProfileScreen;