// screens/PaymentScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { usePayPal } from 'react-native-paypal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Database from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaymentScreen({ navigation, route }) {
  const { language } = useLanguage();
  const t = translations[language];
  const { amount, purpose } = route.params || { amount: 2, purpose: 'ads' };
  
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [user, setUser] = useState(null);

  const paymentMethods = [
    { id: 'mpesa', name: 'M-Pesa', icon: 'phone-android', color: '#4CAF50' },
    { id: 'airtel', name: 'Airtel Money', icon: 'phone-android', color: '#FF6F00' },
    { id: 'tpesa', name: 'T-Pesa', icon: 'phone-android', color: '#0D47A1' },
    { id: 'paypal', name: 'PayPal', icon: 'payment', color: '#0070BA' },
    { id: 'stripe', name: 'Credit Card', icon: 'credit-card', color: '#635BFF' },
    { id: 'mpesa_mixx', name: 'M-Pesa Mixx by Yas', icon: 'payment', color: '#E65100' },
    { id: 'bank', name: 'Bank Transfer', icon: 'account-balance', color: '#1A237E' },
    { id: 'nmb', name: 'NMB Bank', icon: 'account-balance', color: '#C62828' },
    { id: 'nbc', name: 'NBC Bank', icon: 'account-balance', color: '#0D47A1' },
  ];

  const handlePayment = async () => {
    if (selectedMethod === 'mpesa' || selectedMethod === 'airtel' || 
        selectedMethod === 'tpesa' || selectedMethod === 'mpesa_mixx') {
      if (!phoneNumber || phoneNumber.length < 10) {
        Alert.alert(t.error, t.enterValidPhone);
        return;
      }
      await processMobileMoney();
    } else if (selectedMethod === 'paypal') {
      await processPayPal();
    } else if (selectedMethod === 'stripe') {
      await processStripe();
    } else {
      await processBankTransfer();
    }
  };

  const processMobileMoney = async () => {
    setIsLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In production, integrate with actual payment APIs
      Alert.alert(t.success, t.paymentSuccessful, [
        {
          text: 'OK',
          onPress: () => {
            // Update user balance and ad status
            updatePaymentSuccess();
          }
        }
      ]);
    } catch (error) {
      Alert.alert(t.error, t.paymentFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const processPayPal = async () => {
    try {
      // PayPal integration
      const result = await usePayPal.pay({
        amount: amount.toString(),
        currency: 'USD',
        description: purpose === 'ads' ? 'Ad Posting Fee' : 'Premium Feature',
      });
      
      if (result.success) {
        Alert.alert(t.success, t.paymentSuccessful);
        updatePaymentSuccess();
      }
    } catch (error) {
      Alert.alert(t.error, t.paymentFailed);
    }
  };

  const processStripe = async () => {
    try {
      // Stripe integration
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: 'YOUR_PAYMENT_INTENT_SECRET',
        merchantDisplayName: 'pChat',
      });
      
      if (!error) {
        const { error: presentError } = await presentPaymentSheet();
        if (!presentError) {
          Alert.alert(t.success, t.paymentSuccessful);
          updatePaymentSuccess();
        }
      }
    } catch (error) {
      Alert.alert(t.error, t.paymentFailed);
    }
  };

  const processBankTransfer = async () => {
    // Show bank details
    Alert.alert(
      'Bank Transfer Details',
      `Please transfer $${amount} to:\n\nAccount: pChat Technologies\nBank: NMB/NBC\nAccount Number: 1234567890\nReference: ${purpose}_${Date.now()}\n\nWe'll verify and activate your account within 24 hours.`,
      [
        { text: 'OK', onPress: () => {
          // Allow user to submit payment proof
          Alert.alert(t.success, t.paymentSubmitted);
          updatePaymentSuccess();
        }},
      ]
    );
  };

  const updatePaymentSuccess = async () => {
    try {
      // Update user balance and ad status
      const userData = await AsyncStorage.getItem('@pchat_user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = {
          ...user,
          balance: (user.balance || 0) + amount,
          adsPosted: (user.adsPosted || 0) + 1,
        };
        await Database.updateUser(updatedUser);
        await AsyncStorage.setItem('@pchat_user', JSON.stringify(updatedUser));
        
        if (purpose === 'ads') {
          // Navigate to ad creation
          navigation.navigate('Ads', { paymentSuccess: true });
        } else {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.payment}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>{t.amountToPay}</Text>
        <Text style={styles.amount}>${amount}</Text>
        <Text style={styles.purpose}>{purpose === 'ads' ? t.adPosting : t.premiumFeature}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t.selectPaymentMethod}</Text>

      <View style={styles.methodsGrid}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
              <Icon name={method.icon} size={24} color="#fff" />
            </View>
            <Text style={styles.methodName}>{method.name}</Text>
            {selectedMethod === method.id && (
              <View style={styles.selectedBadge}>
                <Icon name="check-circle" size={20} color="#075E54" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {(selectedMethod === 'mpesa' || selectedMethod === 'airtel' || 
        selectedMethod === 'tpesa' || selectedMethod === 'mpesa_mixx') && (
        <View style={styles.phoneInputContainer}>
          <Text style={styles.inputLabel}>{t.phoneNumber}</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder={t.enterPhoneNumber}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>
      )}

      <TouchableOpacity 
        style={styles.payButton}
        onPress={handlePayment}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>
            {t.pay} ${amount}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.secureText}>
        <Icon name="lock" size={14} color="#666" /> {t.securePayment}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#075E54',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  amountContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#075E54',
    marginVertical: 10,
  },
  purpose: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 15,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  methodCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  methodCardSelected: {
    borderWidth: 2,
    borderColor: '#075E54',
    backgroundColor: '#f0f9f8',
  },
  methodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  phoneInputContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  payButton: {
    backgroundColor: '#075E54',
    marginHorizontal: 15,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secureText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 15,
    marginBottom: 30,
  },
});
