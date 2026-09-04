// screens/OTPScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import Database from '../utils/database';
import { verifyOTP } from '../services/smsService';
import { socketService } from '../services/socketService';

export default function OTPScreen({ navigation, route }) {
  const { language } = useLanguage();
  const t = translations[language];
  const { phoneNumber, name, email, password, isSignUp, callingCode, countryCode } = route.params || {};
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    startTimer();
    // Auto-focus first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance to next input
    if (text && index < 5) {
      inputRefs.current[index + 1].focus();
    }
    // Auto-submit when all digits are filled
    if (index === 5 && text) {
      Keyboard.dismiss();
      verifyOTPCode();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const verifyOTPCode = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert(t.error, t.enterValidOTP);
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyOTP(phoneNumber, otpCode);
      
      if (isValid) {
        if (isSignUp) {
          // Register new user
          const userData = {
            id: Date.now().toString(),
            phone: phoneNumber,
            name: name || 'User',
            email: email || '',
            countryCode,
            callingCode,
            createdAt: new Date().toISOString(),
            status: 'online',
            isVerified: true,
            balance: 0,
            adsPosted: 0,
            language: 'en',
          };
          
          await Database.saveUser(userData);
          await AsyncStorage.setItem('@pchat_user', JSON.stringify(userData));
          
          // Connect to socket
          socketService.connect(userData.id);
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          // Login existing user
          const user = await Database.getUserByPhone(phoneNumber);
          if (user) {
            await AsyncStorage.setItem('@pchat_user', JSON.stringify(user));
            socketService.connect(user.id);
            
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          } else {
            Alert.alert(t.error, t.userNotFound);
          }
        }
      } else {
        Alert.alert(t.error, t.invalidOTP);
        // Clear OTP
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0].focus();
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      Alert.alert(t.error, t.otpVerificationFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendOTP(phoneNumber);
      startTimer();
      Alert.alert(t.success, t.otpResent);
    } catch (error) {
      Alert.alert(t.error, t.otpResendFailed);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t.verifyPhone}</Text>
        <Text style={styles.subtitle}>
          {t.otpSentTo} {phoneNumber}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputRefs.current[index] = ref}
              style={styles.otpInput}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.verifyButton, isLoading && styles.disabledButton]}
          onPress={verifyOTPCode}
          disabled={isLoading}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? t.verifying : t.verify}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>{t.didntReceive}</Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>{t.resendOTP}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>{t.resendIn} {timer}s</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#075E54',
  },
  loadingContainer: {
    marginVertical: 20,
  },
  verifyButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#075E54',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#075E54',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  timerText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 5,
  },
});
