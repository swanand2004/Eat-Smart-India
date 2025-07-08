import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Animated,
  RefreshControl,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '../context/MealContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';


const { width, height } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
};

type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image: string;
  completed: boolean;
  time: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

type BadgeItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlocked: boolean;
};

type RedeemableItem = {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const streakPulse = useRef(new Animated.Value(1)).current;
  const coinScale = useRef(new Animated.Value(1)).current;
  const { user } = useAuth();
  const userId = user?.id;
  const { 
    todaysPlan, 
    monthlyPlan, 
    loading, 
    refreshMealPlan, 
    calorieGoal, 
    proteinGoal 
  } = useMeals();
  
  const [todaysMeals, setTodaysMeals] = useState<MealItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [wallet, setWallet] = useState({
    coins: 0,
    streakDays: 0,
    lastRewardDate: null as string | null
  });
  const [showCoinReward, setShowCoinReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const coinPosition = useRef(new Animated.Value(0)).current;

  const redeemableItems: RedeemableItem[] = [
    {
      id: 'r1',
      name: 'Personalized Recipe',
      cost: 10,
      description: 'Get a custom recipe based on your preferences',
      icon: 'restaurant'
    },
    {
      id: 'r2',
      name: 'AI Nutritionist',
      cost: 20,
      description: '24-hour access to our AI nutrition assistant',
      icon: 'chatbubbles'
    },
    {
      id: 'r3',
      name: 'Premium Meal Plan',
      cost: 30,
      description: 'Exclusive meal plan for 1 week',
      icon: 'calendar'
    }
  ];

  // Light mode colors only
  const colors = {
    background: '#F8F9FA',
    text: '#1A1A1A',
    card: '#FFFFFF',
    secondaryText: '#666666',
    primary: '#6C63FF',
    streak: '#FF5E3A',
    progressFill: '#6C63FF',
    progressBackground: '#F0F0F0',
    button: '#6C63FF',
    disabledButton: '#CCCCCC',
    modalBackground: '#FFFFFF',
    modalCard: '#FFFFFF',
    greetingText: '#444444',
    dateText: '#777777',
    white: '#FFFFFF'
  };

  const pulseStreak = useCallback(() => {
    Animated.sequence([
      Animated.timing(streakPulse, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(streakPulse, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  }, [streakPulse]);

  const fetchWalletData = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_wallet')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setWallet({
          coins: data.coins || 0,
          streakDays: data.streak_days || 0,
          lastRewardDate: data.last_reward_date
        });
        pulseStreak();
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching wallet:', error);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  }, [userId, pulseStreak]);

  useEffect(() => {
    if (todaysMeals.length > 0) {
      checkForRewards();
    }
  }, [todaysMeals]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    if (todaysPlan) {
      const transformedMeals: MealItem[] = [];
    
      const addMeals = (meals: any[] | undefined, type: 'breakfast' | 'lunch' | 'dinner' | 'snack', time: string) => {
        if (meals && meals.length > 0) {
          transformedMeals.push(...meals.map((meal: any) => ({
            ...meal,
            completed: meal.completed || false,
            time,
            type
          })));
        }
      };
      
      addMeals(todaysPlan.breakfast, 'breakfast', '8:30 AM');
      addMeals(todaysPlan.lunch, 'lunch', '1:15 PM');
      addMeals(todaysPlan.dinner, 'dinner', '7:30 PM');
      addMeals(todaysPlan.snack, 'snack', '4:30 PM');
      
      setTodaysMeals(transformedMeals);
    }
  }, [todaysPlan]);

  const checkForRewards = useCallback(async () => {
    if (!userId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const allCompleted = todaysMeals.every(meal => meal.completed);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (!allCompleted || wallet.lastRewardDate === today) return;
    
    let newStreak = 1;
    let coinsToAdd = 1;
    
    if (wallet.lastRewardDate === yesterdayStr) {
      newStreak = wallet.streakDays + 1;
      
      if (newStreak % 5 === 0) {
        coinsToAdd += 1;
      }
    }
    
    const updatedWallet = {
      coins: wallet.coins + coinsToAdd,
      streakDays: newStreak,
      lastRewardDate: today
    };
    
    try {
      const { error } = await supabase
        .from('user_wallet')
        .upsert({
          user_id: userId,
          coins: updatedWallet.coins,
          streak_days: updatedWallet.streakDays,
          last_reward_date: updatedWallet.lastRewardDate
        });
      
      if (!error) {
        setWallet(updatedWallet);
        pulseStreak();
        if (coinsToAdd > 0) {
          setRewardAmount(coinsToAdd);
          showCoinAnimation();
        }
      }
    } catch (error) {
      console.error('Error updating wallet:', error);
    }
  }, [userId, todaysMeals, wallet, pulseStreak]);

  const showCoinAnimation = useCallback(() => {
    setShowCoinReward(true);
    
    Animated.sequence([
      Animated.timing(coinPosition, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true
      }),
      Animated.delay(1500),
      Animated.timing(coinPosition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowCoinReward(false);
      coinPosition.setValue(0);
    });
    
    Animated.sequence([
      Animated.timing(coinScale, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(coinScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  }, [coinPosition, coinScale]);

  const handleRedeem = async (itemId: string, cost: number) => {
    if (wallet.coins < cost) return;
    
    try {
      const { error } = await supabase
        .from('user_wallet')
        .update({ coins: wallet.coins - cost })
        .eq('user_id', userId);
      
      if (!error) {
        setWallet(prev => ({ ...prev, coins: prev.coins - cost }));
        const item = redeemableItems.find((i: RedeemableItem) => i.id === itemId);
        alert(`You've unlocked: ${item?.name}`);
      }
    } catch (error) {
      console.error('Error redeeming:', error);
    }
  };

  const stats = useMemo(() => {
    const completedMeals = todaysMeals.filter(meal => meal.completed);
    const caloriesConsumed = completedMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const proteinConsumed = completedMeals.reduce((sum, meal) => sum + meal.protein, 0);
    
    return {
      caloriesConsumed,
      caloriesGoal: calorieGoal,
      proteinConsumed,
      proteinGoal,
      mealsCompleted: completedMeals.length,
      totalMeals: todaysMeals.length,
      dailyCompletion: Math.round((caloriesConsumed / calorieGoal) * 100)
    };
  }, [todaysMeals, calorieGoal, proteinGoal]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshMealPlan().finally(() => setRefreshing(false));
  }, [refreshMealPlan]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const renderMealItem = useCallback(({ item }: { item: MealItem }) => (
    <View style={[styles.horizontalMealCard, { backgroundColor: colors.card }]}>
      <Image source={{ uri: item.image }} style={styles.horizontalMealImage} />
      <View style={styles.horizontalMealDetails}>
        <Text style={[styles.horizontalMealType, { color: colors.primary }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        <Text style={[styles.horizontalMealName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.horizontalMealInfo}>
          <Text style={[styles.horizontalMealTime, { color: colors.secondaryText }]}>{item.time}</Text>
          <Text style={[styles.horizontalMealCalories, { color: colors.primary }]}>{item.calories} kcal</Text>
        </View>
      </View>
    </View>
  ), []);

  const renderBadgeItem = useCallback(({ item }: { item: BadgeItem }) => (
    <View style={[styles.badgeCard, !item.unlocked && styles.lockedBadge, { backgroundColor: colors.card }]}>
      <Text style={styles.badgeEmoji}>{item.emoji}</Text>
      <Text style={[styles.badgeName, { color: colors.text }]}>{item.name}</Text>
      {item.unlocked && (
        <Text style={[styles.badgeDescription, { color: colors.secondaryText }]} numberOfLines={2}>{item.description}</Text>
      )}
    </View>
  ), []);

  const renderRedeemItem = useCallback(({ item }: { item: RedeemableItem }) => (
    <View style={[styles.redeemItem, { backgroundColor: colors.card }]}>
      <Ionicons name={item.icon} size={24} color={colors.primary} />
      <View style={styles.redeemItemInfo}>
        <Text style={[styles.redeemItemName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.redeemItemDesc, { color: colors.secondaryText }]}>{item.description}</Text>
      </View>
      <TouchableOpacity 
        style={[
          styles.redeemButton, 
          wallet.coins < item.cost && styles.redeemButtonDisabled,
          { backgroundColor: wallet.coins < item.cost ? colors.disabledButton : colors.button }
        ]}
        onPress={() => handleRedeem(item.id, item.cost)}
        disabled={wallet.coins < item.cost}
      >
        <Text style={styles.redeemButtonText}>{item.cost} 🪙</Text>
      </TouchableOpacity>
    </View>
  ), [wallet.coins]);

  const coinAnimationStyle = {
    transform: [
      {
        translateY: coinPosition.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -100]
        })
      },
      {
        scale: coinPosition.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.5, 1]
        })
      },
      {
        rotate: coinPosition.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
        })
      }
    ],
    opacity: coinPosition.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [1, 1, 0]
    })
  };

  const streakAnimationStyle = {
    transform: [{ scale: streakPulse }]
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <Modal visible={showCoinReward} transparent animationType="fade">
        <View style={styles.coinModalContainer}>
          <Animated.View style={[styles.coinReward, coinAnimationStyle, { backgroundColor: colors.modalCard }]}>
            <Text style={[styles.coinRewardText, { color: colors.text }]}>+{rewardAmount} 🪙</Text>
            <Text style={[styles.coinRewardSubtext, { color: colors.secondaryText }]}>Keep the streak going!</Text>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showWalletModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <View style={[styles.walletModalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.walletModalContent, { backgroundColor: colors.modalBackground }]}>
            <View style={styles.walletModalHeader}>
              <Text style={[styles.walletModalTitle, { color: colors.text }]}>Your Wallet</Text>
              <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={['#6C63FF', '#4ECDC4']}
              style={styles.balanceCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <Text style={styles.balanceAmount}>₹{wallet.coins}</Text>
              
              <View style={styles.streakContainer}>
                <Ionicons name="flame" size={20} color="#FF9500" />
                <Text style={styles.streakText}>{wallet.streakDays} Day Streak</Text>
              </View>
            </LinearGradient>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>How to Earn More</Text>
            <View style={[styles.tipCard, { backgroundColor: '#F5F5F5' }]}>
              <Text style={[styles.tipText, { color: colors.secondaryText }]}>• Complete all daily meals to earn 1 coin</Text>
              <Text style={[styles.tipText, { color: colors.secondaryText }]}>• Maintain a 5-day streak for bonus coins</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Redeem Your Coins</Text>
            <FlatList
              data={redeemableItems}
              renderItem={renderRedeemItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.redeemList}
            />
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={[styles.greetingText, { color: colors.greetingText }]}>
              Good <Text style={{ color: colors.primary }}>{getTimeOfDay()}</Text>,
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.user_metadata?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.walletButton, { backgroundColor: colors.card }]}
            onPress={() => setShowWalletModal(true)}
          >
            <Text style={[styles.walletAmount, { color: colors.streak }]}>₹{wallet.coins}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.dateText, { color: colors.dateText }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.progressGrid}>
            <LinearGradient colors={['#FF9A8B', '#FF6B95']} style={styles.progressCard}>
              <Text style={styles.progressValue}>{stats.proteinConsumed}g</Text>
              <Text style={styles.progressLabel}>Protein</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
                <LinearGradient
                  colors={['#FFFFFF', '#FFFFFF']}
                  style={[styles.progressFill, { width: `${Math.min(100, (stats.proteinConsumed / stats.proteinGoal) * 100)}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressGoal}>{stats.proteinGoal}g goal</Text>
            </LinearGradient>
            
            <LinearGradient colors={['#92A3FD', '#9DCEFF']} style={styles.progressCard}>
              <Text style={styles.progressValue}>{stats.caloriesConsumed}</Text>
              <Text style={styles.progressLabel}>Calories</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
                <LinearGradient
                  colors={['#FFFFFF', '#FFFFFF']}
                  style={[styles.progressFill, { width: `${Math.min(100, stats.dailyCompletion)}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressGoal}>{stats.caloriesGoal} goal</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.progressGrid}>
            <LinearGradient colors={['#C58BF2', '#EEA4CE']} style={styles.progressCard}>
              <Text style={styles.progressValue}>{stats.mealsCompleted}/{stats.totalMeals}</Text>
              <Text style={styles.progressLabel}>Meals</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
                <LinearGradient
                  colors={['#FFFFFF', '#FFFFFF']}
                  style={[styles.progressFill, { width: `${Math.min(100, (stats.mealsCompleted / stats.totalMeals) * 100)}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressGoal}>Daily meals</Text>
            </LinearGradient>
            
            <LinearGradient colors={['#84D7E9', '#A0E7CB']} style={styles.progressCard}>
              <Text style={styles.progressValue}>{stats.dailyCompletion}%</Text>
              <Text style={styles.progressLabel}>Today</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
                <LinearGradient
                  colors={['#FFFFFF', '#FFFFFF']}
                  style={[styles.progressFill, { width: `${stats.dailyCompletion}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressGoal}>Daily goal</Text>
            </LinearGradient>
          </View>
        </View>

        {wallet.streakDays > 0 && (
          <Animated.View style={[styles.streakBanner, streakAnimationStyle]}>
            <LinearGradient
              colors={['#FF9500', '#FF5E3A']}
              style={styles.streakGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flame" size={24} color="white" />
              <Text style={styles.streakBannerText}>
                {wallet.streakDays} Day Streak! Keep it going!
              </Text>
              <Ionicons name="flame" size={24} color="white" style={{ marginLeft: 'auto' }} />
            </LinearGradient>
          </Animated.View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Meals</Text>
          <FlatList
            data={todaysMeals}
            renderItem={renderMealItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalMealList}
            keyExtractor={item => item.id}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Achievements</Text>
          <FlatList
            data={badges}
            renderItem={renderBadgeItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgeList}
            keyExtractor={item => item.id}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  walletAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  greetingText: {
    fontSize: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dateText: {
    fontSize: 14,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  coinModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  coinReward: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
  },
  coinRewardText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  coinRewardSubtext: {
    fontSize: 16,
    marginTop: 8,
  },
  walletModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  walletModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  walletModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    opacity: 0.8,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  streakText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '600',
  },
  tipCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  tipText: {
    marginBottom: 5,
  },
  redeemList: {
    paddingBottom: 20,
  },
  redeemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  redeemItemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  redeemItemName: {
    fontWeight: '600',
    fontSize: 16,
  },
  redeemItemDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  redeemButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  redeemButtonDisabled: {
  },
  redeemButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  streakBanner: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  streakGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBannerText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: 'white',
    marginBottom: 12,
    opacity: 0.9,
  },
  progressBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressGoal: {
    fontSize: 12,
    color: 'white',
    marginTop: 8,
    opacity: 0.8,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  horizontalMealList: {
    paddingLeft: 4,
  },
  horizontalMealCard: {
    width: 180,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  horizontalMealImage: {
    width: '100%',
    height: 120,
  },
  horizontalMealDetails: {
    padding: 12,
  },
  horizontalMealType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  horizontalMealName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  horizontalMealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  horizontalMealTime: {
    fontSize: 12,
  },
  horizontalMealCalories: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeList: {
    paddingLeft: 4,
  },
  badgeCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lockedBadge: {
    opacity: 0.7,
  },
  badgeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default HomeScreen;