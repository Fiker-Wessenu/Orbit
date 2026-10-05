import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

import { useAuth } from '../../firebase/context/AuthContext';

import {
  subscribeToMessages,
  sendMessage,
  sendGeminiMessage,
} from '../../services/messageService';

import Svg, { Path } from 'react-native-svg';

// ─────────────────────────────────────────────
// Simple icon
// ─────────────────────────────────────────────

const Icon = ({ name, size = 24, color = '#000' }) => {
  let path = '';

  if (name === 'chevron-back-outline') {
    path = 'M15 19l-7-7 7-7';
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={path} />
    </Svg>
  );
};

// ─────────────────────────────────────────────
// Gemini icon
// ─────────────────────────────────────────────

const GeminiIcon = ({ size = 26 }) => {
  return (
    <View
      style={[
        styles.geminiIcon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.55 }}>✨</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// Chat Screen
// ─────────────────────────────────────────────

export default function ChatScreen({ route, navigation }) {
  const {
    chatId,
    name,
    contactName,
    isGemini = false,
  } = route.params || {};

  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // ─────────────────────────────────────────────
  // Chat title
  // ─────────────────────────────────────────────

  const chatTitle = isGemini
    ? 'Gemini AI'
    : name || contactName || 'Chat';

  // ─────────────────────────────────────────────
  // Listen to messages
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!chatId) {
      return;
    }

    const unsubscribe = subscribeToMessages(
      chatId,
      (fetchedMessages) => {
        setMessages(fetchedMessages);
      }
    );

    return unsubscribe;
  }, [chatId]);

  // ─────────────────────────────────────────────
  // Send message
  // ─────────────────────────────────────────────

  const handleSend = async () => {
    const trimmedText = inputText.trim();

    if (!trimmedText || !chatId || !user?.uid || sending) {
      return;
    }

    setInputText('');
    setSending(true);

    try {
      // ─────────────────────────────────────────
      // GEMINI CHAT
      // ─────────────────────────────────────────

      if (isGemini) {
        await sendGeminiMessage(
          user,
          chatId,
          trimmedText
        );
      }

      // ─────────────────────────────────────────
      // NORMAL CHAT
      // ─────────────────────────────────────────

      else {
        await sendMessage(chatId, {
          senderId: user.uid,
          text: trimmedText,
        });
      }

      // Do not manually update messages.
      // Firestore onSnapshot handles it.
    } catch (error) {
      console.error(
        isGemini
          ? 'Failed to send Gemini message:'
          : 'Failed to send message:',
        error
      );

      // Restore the message if sending failed.
      setInputText(trimmedText);
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────────
  // Format message time
  // ─────────────────────────────────────────────

  const formatMessageTime = (createdAt) => {
    if (!createdAt) {
      return '';
    }

    if (typeof createdAt.toDate !== 'function') {
      return '';
    }

    return createdAt
      .toDate()
      .toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
  };

  // ─────────────────────────────────────────────
  // Render message
  // ─────────────────────────────────────────────

  const renderItem = ({ item }) => {
    const isMe = item.senderId === user?.uid;

    const isGeminiMessage =
      item.senderId === 'gemini-bot';

    return (
      <View
        style={[
          styles.messageRow,
          isMe
            ? styles.myMessageRow
            : styles.otherMessageRow,
        ]}
      >
        {/* Gemini avatar */}
        {isGeminiMessage && !isMe && (
          <View style={styles.geminiAvatarContainer}>
            <GeminiIcon size={30} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,

            isMe
              ? styles.myBubble
              : isGeminiMessage
              ? styles.geminiBubble
              : styles.otherBubble,
          ]}
        >
          {/* Gemini label */}
          {isGeminiMessage && (
            <View style={styles.geminiLabelRow}>
              <GeminiIcon size={18} />

              <Text style={styles.geminiLabel}>
                Gemini AI
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.messageText,

              isMe
                ? styles.myText
                : isGeminiMessage
                ? styles.geminiText
                : styles.otherText,
            ]}
          >
            {item.text}
          </Text>

          <Text
            style={
              isMe
                ? styles.myTime
                : isGeminiMessage
                ? styles.geminiTime
                : styles.otherTime
            }
          >
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────
  // Screen
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 90 : 0
        }
      >
        {/* ─────────────────────────────────────
            HEADER
        ───────────────────────────────────── */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{
              top: 20,
              bottom: 20,
              left: 20,
              right: 20,
            }}
          >
            <Icon
              name="chevron-back-outline"
              size={28}
              color="#0088cc"
            />
          </TouchableOpacity>

          {/* Gemini header */}
          {isGemini ? (
            <View style={styles.geminiHeader}>
              <GeminiIcon size={34} />

              <View style={styles.geminiHeaderText}>
                <Text style={styles.headerTitle}>
                  Gemini AI
                </Text>

                <Text style={styles.geminiOnlineText}>
                  AI Assistant
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.headerTitle}>
              {chatTitle}
            </Text>
          )}

          <View style={{ width: 40 }} />
        </View>

        {/* ─────────────────────────────────────
            MESSAGES
        ───────────────────────────────────── */}

        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* ─────────────────────────────────────
            INPUT
        ───────────────────────────────────── */}

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              isGemini && styles.geminiInput,
            ]}
            placeholder={
              isGemini
                ? 'Ask Gemini anything...'
                : 'Type a message...'
            }
            placeholderTextColor="#8a8a8a"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,

              isGemini &&
                styles.geminiSendButton,

              (!inputText.trim() || sending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={
              !inputText.trim() || sending
            }
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#fff"
              />
            ) : (
              <Text style={styles.sendText}>
                Send
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // ─────────────────────────────────────────
  // Header
  // ─────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 64,
  },

  backButton: {
    padding: 4,
    width: 40,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    color: '#1a1a1a',
  },

  // ─────────────────────────────────────────
  // Gemini header
  // ─────────────────────────────────────────

  geminiHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  geminiHeaderText: {
    marginLeft: 8,
  },

  geminiOnlineText: {
    fontSize: 11,
    color: '#6C4AB6',
    textAlign: 'center',
    marginTop: 1,
  },

  geminiIcon: {
    backgroundColor: '#eee7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─────────────────────────────────────────
  // Messages
  // ─────────────────────────────────────────

  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },

  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  myMessageRow: {
    justifyContent: 'flex-end',
  },

  otherMessageRow: {
    justifyContent: 'flex-start',
  },

  // ─────────────────────────────────────────
  // Gemini avatar
  // ─────────────────────────────────────────

  geminiAvatarContainer: {
    marginRight: 6,
    marginBottom: 2,
  },

  // ─────────────────────────────────────────
  // Message bubbles
  // ─────────────────────────────────────────

  messageBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 16,
  },

  myBubble: {
    backgroundColor: '#0088cc',
    borderBottomRightRadius: 4,
  },

  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  geminiBubble: {
    backgroundColor: '#f0eaff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#d8caff',
  },

  // ─────────────────────────────────────────
  // Message text
  // ─────────────────────────────────────────

  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },

  myText: {
    color: '#fff',
  },

  otherText: {
    color: '#1a1a1a',
  },

  geminiText: {
    color: '#332066',
  },

  // ─────────────────────────────────────────
  // Gemini label
  // ─────────────────────────────────────────

  geminiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  geminiLabel: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
    color: '#6C4AB6',
  },

  // ─────────────────────────────────────────
  // Timestamps
  // ─────────────────────────────────────────

  myTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  otherTime: {
    fontSize: 10,
    color: '#8a8a8a',
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  geminiTime: {
    fontSize: 10,
    color: '#8a76a8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  // ─────────────────────────────────────────
  // Input
  // ─────────────────────────────────────────

  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 80,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#1a1a1a',
  },

  geminiInput: {
    borderColor: '#d8caff',
    backgroundColor: '#faf8ff',
  },

  // ─────────────────────────────────────────
  // Send button
  // ─────────────────────────────────────────

  sendButton: {
    marginLeft: 8,
    backgroundColor: '#0088cc',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 58,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  geminiSendButton: {
    backgroundColor: '#6C4AB6',
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
});