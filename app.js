// App.js - Main Application Entry Point
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  LogBox,
  AppState,
  Platform,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { StripeProvider } from '@stripe/stripe-react-native';
import { PayPalProvider } from 'react-native-paypal';
import OneSignal from 'react-native-onesignal';
import CodePush from 'react-native-code-push';

// Import Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import OTPScreen from './screens/OTPScreen';
import LanguageSelectScreen from './screens/LanguageSelectScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import StatusScreen from './screens/StatusScreen';
import VideoCallScreen from './screens/VideoCallScreen';
import VoiceCallScreen from './screens/VoiceCallScreen';
import MeetingScreen from './screens/MeetingScreen';
import PaymentScreen from './screens/PaymentScreen';
import AdsScreen from './screens/AdsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import MeetingRoomScreen from './screens/MeetingRoomScreen';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { PaymentProvider } from './context/PaymentContext';

// Utils
import { translations } from './utils/translations';
import Database from './utils/database';
import { socketService } from './services/socketService';

LogBox.ignoreAllLogs();

const Stack = createStackNavigator();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    initializeApp();
    setupNetworkListener();
    setupPushNotifications();
    checkCodePushUpdate();
  }, []);

  const initializeApp = async () => {
    try {
      // Check authentication
      const user = await AsyncStorage.getItem('@pchat_user');
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserData(parsedUser);
        setIsAuthenticated(true);
        
        // Connect to socket
        socketService.connect(parsedUser.id);
      }
      
      // Load language preference
      const savedLang = await AsyncStorage.getItem('@pchat_language');
      if (savedLang) {
        setLanguage(savedLang);
      }
    } catch (error) {
      console.error('Init error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupNetworkListener = () => {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('Network connected');
        socketService.reconnect();
      } else {
        console.log('Network disconnected');
        Alert.alert('Network Error', 'Please check your internet connection');
      }
    });
  };

  const setupPushNotifications = () => {
    OneSignal.setLogLevel(6, 0);
    OneSignal.setAppId('YOUR_ONESIGNAL_APP_ID');
    OneSignal.promptForPushNotificationsWithUserResponse(response => {
      console.log('Push notification permission:', response);
    });
  };

  const checkCodePushUpdate = () => {
    CodePush.sync({
      updateDialog: true,
      installMode: CodePush.InstallMode.IMMEDIATE,
    });
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <LanguageProvider value={{ language, setLanguage }}>
      <AuthProvider value={{ user: userData, setUser: setUserData }}>
        <PaymentProvider>
          <StripeProvider publishableKey="YOUR_STRIPE_PUBLISHABLE_KEY">
            <PayPalProvider clientId="YOUR_PAYPAL_CLIENT_ID">
              <PaperProvider>
                <NavigationContainer>
                  <StatusBar barStyle="light-content" backgroundColor="#075E54" />
                  <Stack.Navigator
                    screenOptions={{
                      headerStyle: {
                        backgroundColor: '#075E54',
                      },
                      headerTintColor: '#fff',
                      headerTitleStyle: {
                        fontWeight: 'bold',
                      },
                    }}
                  >
                    {!isAuthenticated ? (
                      <>
                        <Stack.Screen 
                          name="Language" 
                          component={LanguageSelectScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Login" 
                          component={LoginScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="OTP" 
                          component={OTPScreen}
                          options={{ headerShown: false }}
                        />
                      </>
                    ) : (
                      <>
                        <Stack.Screen 
                          name="Home" 
                          component={HomeScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Chat" 
                          component={ChatScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Status" 
                          component={StatusScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="VideoCall" 
                          component={VideoCallScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="VoiceCall" 
                          component={VoiceCallScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Meeting" 
                          component={MeetingScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="MeetingRoom" 
                          component={MeetingRoomScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Payment" 
                          component={PaymentScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Ads" 
                          component={AdsScreen}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                          name="Profile" 
                          component={ProfileScreen}
                        />
                        <Stack.Screen 
                          name="Settings" 
                          component={SettingsScreen}
                        />
                      </>
                    )}
                  </Stack.Navigator>
                </NavigationContainer>
              </PaperProvider>
            </PayPalProvider>
          </StripeProvider>
        </PaymentProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default CodePush({
  checkFrequency: CodePush.CheckFrequency.ON_APP_START,
})(App);
