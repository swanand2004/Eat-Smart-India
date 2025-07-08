import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MealsScreen from './screens/MealsScreen';
import GroceryScreen from './screens/GroceryScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import { MealsProvider } from './context/MealContext';
import { useAuth } from './lib/auth';
import { supabase } from './lib/supabase';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Home: undefined;
};

type HomeTabParamList = {
  HomeTab: undefined;
  Meals: undefined;
  Grocery: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

function HomeTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Meals') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Grocery') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 80,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsScreen} />
      <Tab.Screen name="Grocery" component={GroceryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { session, user } = useAuth();
  const userId = user?.id ?? null;

  const [isOnboarded, setIsOnboarded] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (userId) {
        const { data, error } = await supabase
          .from('onboarding_info')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding:', error);
          setIsOnboarded(false);
        } else {
          setIsOnboarded(!!data);
        }
      }
      setCheckingOnboarding(false);
    };

    if (userId) {
      checkOnboardingStatus();
    } else {
      setCheckingOnboarding(false);
    }
  }, [userId]);

  if (checkingOnboarding) {
    return null; // Or show a splash screen
  }

  let initialRouteName: keyof RootStackParamList;

  if (!session) {
    initialRouteName = 'Login';
  } else if (!isOnboarded) {
    initialRouteName = 'Onboarding';
  } else {
    initialRouteName = 'Home';
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MealsProvider>
          <Toaster
            position="top-center"
            duration={3000}
            toastOptions={{
              style: {
                backgroundColor: '#333',
                padding: 16,
                borderRadius: 8,
              },
              titleStyle: {
                color: '#fff',
              },
              actionButtonTextStyle: {
                color: '#fff',
              },
            }}
          />
          <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRouteName}>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Home"
                component={HomeTabsNavigator}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </MealsProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
