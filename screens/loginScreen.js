// screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountryPicker from 'react-native-country-picker-modal';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import Database from '../utils/database';
import { sendOTP } from '../services/smsService';

export default function LoginScreen({ navigation }) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('TZ');
  const [callingCode, setCallingCode] = useState('255');
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      Alert.alert(t.error, t.invalidPhone);
      return;
    }

    setIsLoading(true);
    try {
      // Send OTP via SMS
      const fullNumber = `${callingCode}${phoneNumber}`;
      const otpSent = await sendOTP(fullNumber);
      
      if (otpSent) {
        navigation.navigate('OTP', { 
          phoneNumber: fullNumber, 
          name, 
          email,
          password,
          isSignUp,
          callingCode,
          countryCode
        });
      } else {
        Alert.alert(t.error, t.otpFailed);
      }
    } catch (error) {
      console.error('OTP Error:', error);
      Alert.alert(t.error, t.otpFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            defaultSource={require('../assets/logo.png')}
          />
          <Text style={styles.appName}>pChat</Text>
          <Text style={styles.appSubtitle}>{t.appSubtitle}</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>{isSignUp ? t.createAccount : t.welcomeBack}</Text>

          {isSignUp && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t.fullName}
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder={t.email}
                placeholderTextColor="#999"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder={t.password}
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </>
          )}

          <View style={styles.phoneContainer}>
            <TouchableOpacity 
              style={styles.countryPicker}
              onPress={() => setShowCountryPicker(true)}
            >
              <CountryPicker
                {...{
                  countryCode,
                  withFilter: true,
                  withFlag: true,
                  withCallingCode: true,
                  withAlphaFilter: true,
                  withEmoji: true,
                  onSelect: (country) => {
                    setCountryCode(country.cca2);
                    setCallingCode(country.callingCode[0]);
                    setShowCountryPicker(false);
                  },
                }}
                visible={showCountryPicker}
              />
              <Text style={styles.countryCode}>+{callingCode}</Text>
            </TouchableOpacity>
            
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder={t.phoneNumber}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={10}
            />
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {t.sendOTP}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isSignUp ? t.alreadyAccount : t.noAccount}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#075E54',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#075E54',
    marginTop: 10,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    marginRight: 10,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
  phoneInput: {
    flex: 1,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#075E54',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#075E54',
    fontSize: 14,
  },
});
