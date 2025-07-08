import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { signInWithPhone, verifyOTP, signInWithEmail, signUpWithEmail } from '../lib/auth';

type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);

  // ✅ Check onboarding data in Supabase
  const checkOnboardingData = async (userId: string) => {
    const { data, error } = await supabase
      .from('onboarding_info')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking onboarding:', error.message);
      return navigation.navigate('Onboarding');
    }

    if (data?.user_id) {
      navigation.navigate('Home');
    } else {
      navigation.navigate('Onboarding');
    }
  };

  const handleSendOTP = async () => {
    try {
      setIsLoading(true);
      await signInWithPhone('+91' + phoneNumber);
      setIsOTPSent(true);
    } catch (error) {
      alert('OTP sending failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setIsLoading(true);
      const { user, error } = await verifyOTP('+91' + phoneNumber, otp);
      if (error || !user) {
        alert('Invalid OTP');
      } else {
        await checkOnboardingData(user.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Please enter both email and password to login.');
      return;
    }

    try {
      setIsLoading(true);
      const { user, error } = await signInWithEmail(email, password);
      if (error || !user) {
        alert('Login failed: ' + (error?.message || 'Unknown error'));
      } else {
        await checkOnboardingData(user.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Please enter both email and password to sign up.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await signUpWithEmail(email, password);

      if (error) {
        alert('Sign up failed: ' + error.message);
      } else {
        alert('Sign up successful, you can now log in.');
        setIsSignupMode(false);
        setEmail('');
        setPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhoneLogin = () =>
    !isOTPSent ? (
      <>
        <Text style={styles.sectionTitle}>Login with Phone</Text>
        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91</Text>
            <Ionicons name="chevron-down" size={16} color="#6C63FF" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            maxLength={10}
          />
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSendOTP}
          disabled={phoneNumber.length < 10 || isLoading}
        >
          <LinearGradient
            colors={['#6C63FF', '#4ECDC4']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>{isLoading ? 'Sending...' : 'Send OTP'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <Text style={styles.sectionTitle}>Enter OTP</Text>
        <Text style={styles.otpSentText}>Sent to +91 {phoneNumber}</Text>
        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
        />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleVerifyOTP}
          disabled={otp.length < 6 || isLoading}
        >
          <LinearGradient
            colors={['#6C63FF', '#4ECDC4']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify OTP'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.otpFooter}>
          <TouchableOpacity onPress={() => setIsOTPSent(false)}>
            <Text style={styles.linkText}>Change Number</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSendOTP}>
            <Text style={styles.linkText}>Resend OTP</Text>
          </TouchableOpacity>
        </View>
      </>
    );

  const renderEmailLogin = () => (
    <>
      <Text style={styles.sectionTitle}>
        {isSignupMode ? 'Sign Up with Email' : 'Login with Email'}
      </Text>
      <TextInput
        style={styles.otpInput}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.otpInput}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={isSignupMode ? handleEmailSignup : handleEmailLogin}
      >
        <LinearGradient colors={['#6C63FF', '#4ECDC4']} style={styles.gradient}>
          <Text style={styles.buttonText}>
            {isLoading
              ? isSignupMode
                ? 'Signing up...'
                : 'Logging in...'
              : isSignupMode
              ? 'Sign Up'
              : 'Login'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsSignupMode(!isSignupMode)}>
        <Text style={styles.linkText}>
          {isSignupMode ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons name="restaurant" size={60} color="#6C63FF" />
            <Text style={styles.title}>EatSmart</Text>
            <Text style={styles.subtitle}>Your personalized nutrition guide</Text>
          </View>

          <View style={styles.formContainer}>
            {isEmailMode ? renderEmailLogin() : renderPhoneLogin()}

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPress={() => {
                setIsEmailMode(!isEmailMode);
                setIsSignupMode(false);
                setEmail('');
                setPassword('');
                setPhoneNumber('');
                setOtp('');
                setIsOTPSent(false);
              }}
            >
              <Text style={styles.linkText}>
                {isEmailMode ? 'Use Phone Login Instead' : 'Use Email Login Instead'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>By continuing, you agree to our</Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity>
                <Text style={styles.linkText}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.footerText}> and </Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  formContainer: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
  countryCode: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#F5F5F5', borderRightWidth: 1, borderRightColor: '#E0E0E0' },
  countryCodeText: { color: '#6C63FF', marginRight: 5, fontWeight: '600' },
  input: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  otpInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 15 },
  otpSentText: { color: '#666', textAlign: 'center', marginBottom: 20 },
  primaryButton: { borderRadius: 8, overflow: 'hidden', marginBottom: 15 },
  gradient: { padding: 16, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  otpFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { paddingHorizontal: 10, color: '#999' },
  footer: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#666', fontSize: 12 },
  footerLinks: { flexDirection: 'row', marginTop: 5 },
  linkText: { color: '#6C63FF', fontSize: 14, textAlign: 'center', fontWeight: '500' }
});

export default LoginScreen;
