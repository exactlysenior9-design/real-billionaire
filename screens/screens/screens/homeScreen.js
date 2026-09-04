// screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import Database from '../utils/database';
import { socketService } from '../services/socketService';
import { formatTime, getInitials } from '../utils/helpers';

export default function HomeScreen({ navigation }) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusImage, setStatusImage] = useState(null);
  const [selectedTab, setSelectedTab] = useState('chats');

  useFocusEffect(
    useCallback(() => {
      loadData();
      setupSocketListeners();
      return () => {
        cleanupSocketListeners();
      };
    }, [])
  );

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pchat_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Load contacts
      const allUsers = await Database.getAllUsers();
      const filtered = allUsers.filter(u => u.id !== userData?.id);
      setContacts(filtered);

      // Load statuses
      const allStatuses = await Database.getAllStatuses();
      const recentStatuses = allStatuses.filter(s => 
        new Date(s.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      setStatuses(recentStatuses);

      // Load ads
      const allAds = await Database.getAllAds();
      const activeAds = allAds.filter(ad => ad.isActive);
      setAds(activeAds);

      // Get online users from socket
      const online = socketService.getOnlineUsers();
      setOnlineUsers(online);

    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('userOnline', (userId) => {
      setOnlineUsers(prev => [...prev, userId]);
    });

    socketService.on('userOffline', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socketService.on('newStatus', (status) => {
      setStatuses(prev => [status, ...prev]);
    });

    socketService.on('newMessage', (message) => {
      // Update chat list
    });
  };

  const cleanupSocketListeners = () => {
    socketService.off('userOnline');
    socketService.off('userOffline');
    socketService.off('newStatus');
    socketService.off('newMessage');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePostStatus = async () => {
    if (!statusText.trim()) {
      Alert.alert(t.error, t.enterStatusText);
      return;
    }

    try {
      const statusData = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        text: statusText,
        image: statusImage,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      await Database.saveStatus(statusData);
      socketService.emit('newStatus', statusData);
      
      setStatusText('');
      setStatusImage(null);
      setShowStatusModal(false);
      
      // Reload statuses
      loadData();
      Alert.alert(t.success, t.statusPosted);
    } catch (error) {
      console.error('Post status error:', error);
      Alert.alert(t.error, t.statusPostFailed);
    }
  };

  const renderStatusItem = ({ item }) => (
    <TouchableOpacity style={styles.statusItem}>
      <View style={styles.statusAvatar}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.statusAvatarImage} />
        ) : (
          <View style={styles.statusAvatarPlaceholder}>
            <Text style={styles.statusAvatarText}>
              {getInitials(item.userName)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.statusInfo}>
        <Text style={styles.statusName}>{item.userName}</Text>
        <Text style={styles.statusText}>{item.text}</Text>
        <Text style={styles.statusTime}>{formatTime(item.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }) => {
    const isOnline = onlineUsers.includes(item.id);
    return (
      <TouchableOpacity 
        style={styles.contactItem}
        onPress={() => navigation.navigate('Chat', { contact: item })}
      >
        <View style={styles.contactAvatar}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactStatus}>
            {isOnline ? t.online : t.offline}
          </Text>
        </View>
        <View style={styles.contactActions}>
          <TouchableOpacity 
            style={styles.actionIcon}
            onPress={() => navigation.navigate('VoiceCall', { contact: item })}
          >
            <Icon name="call" size={20} color="#075E54" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionIcon}
            onPress={() => navigation.navigate('VideoCall', { contact: item })}
          >
            <Icon name="videocam" size={20} color="#075E54" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAdItem = ({ item }) => (
    <View style={styles.adItem}>
      <Image source={{ uri: item.image }} style={styles.adImage} />
      <View style={styles.adContent}>
        <Text style={styles.adTitle}>{item.title}</Text>
        <Text style={styles.adDescription}>{item.description}</Text>
        <Text style={styles.adPrice}>${item.price}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>pChat</Text>
          <Text style={styles.headerSubtitle}>{t.online} {onlineUsers.length}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'chats' && styles.activeTab]}
          onPress={() => setSelectedTab('chats')}
        >
          <Icon name="chat" size={24} color={selectedTab === 'chats' ? '#075E54' : '#666'} />
          <Text style={[styles.tabText, selectedTab === 'chats' && styles.activeTabText]}>
            {t.chats}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'status' && styles.activeTab]}
          onPress={() => setSelectedTab('status')}
        >
          <Icon name="people" size={24} color={selectedTab === 'status' ? '#075E54' : '#666'} />
          <Text style={[styles.tabText, selectedTab === 'status' && styles.activeTabText]}>
            {t.status}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'ads' && styles.activeTab]}
          onPress={() => setSelectedTab('ads')}
        >
          <Icon name="ad-unit" size={24} color={selectedTab === 'ads' ? '#075E54' : '#666'} />
          <Text style={[styles.tabText, selectedTab === 'ads' && styles.activeTabText]}>
            {t.ads}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={selectedTab === 'chats' ? contacts : selectedTab === 'status' ? statuses : ads}
        keyExtractor={(item) => item.id}
        renderItem={
          selectedTab === 'chats' ? renderContactItem : 
          selectedTab === 'status' ? renderStatusItem : 
          renderAdItem
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name={selectedTab === 'chats' ? "chat-bubble-outline" : "people-outline"} size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedTab === 'chats' ? t.noContacts : 
               selectedTab === 'status' ? t.noStatus : t.noAds}
            </Text>
          </View>
        )}
      />

      {/* FAB Buttons */}
      {selectedTab === 'chats' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Meeting')}
        >
          <Icon name="group" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      
      {selectedTab === 'status' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setShowStatusModal(true)}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {selectedTab === 'ads' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Ads')}
        >
          <Icon name="add-box" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.postStatus}</Text>
            
            <TextInput
              style={styles.statusInput}
              placeholder={t.whatsOnMind}
              multiline
              value={statusText}
              onChangeText={setStatusText}
              maxLength={500}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.postButton]}
                onPress={handlePostStatus}
              >
                <Text style={styles.postButtonText}>{t.post}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#d4f0e6',
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#075E54',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  activeTabText: {
    color: '#075E54',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  contactStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
  },
  actionIcon: {
    padding: 8,
    marginLeft: 5,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  statusAvatarImage: {
    width: 50,
    height: 50,
  },
  statusAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  adItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  adImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  adContent: {
    padding: 15,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  adDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  adPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#075E54',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  statusInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
  },
  postButton: {
    backgroundColor: '#075E54',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});
