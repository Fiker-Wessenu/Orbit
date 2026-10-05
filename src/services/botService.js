import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const BOT_ID = 'ai-assistant';

/**
 * Create or retrieve the user's AI chat.
 */
export async function getOrCreateBotChat() {
  const user = auth().currentUser;

  if (!user) {
    throw new Error('User is not signed in');
  }

  const uid = user.uid;

  // One AI chat per user
  const chatId = `bot_${uid}`;

  const chatRef = firestore()
    .collection('chats')
    .doc(chatId);

  const snapshot = await chatRef.get();

  if (!snapshot.exists) {
    await chatRef.set({
      type: 'bot',

      participants: [
        uid,
        BOT_ID,
      ],

      createdBy: uid,

      createdAt:
        firestore.FieldValue.serverTimestamp(),

      lastMessage: null,

      lastMessageAt: null,
    });
  }

  return chatId;
}

/**
 * Ask the OrbitChat3 AI server to generate a response.
 */
export async function pingBot(chatId) {
  const user = auth().currentUser;

  if (!user) {
    throw new Error('User is not signed in');
  }

  // Get the user's Firebase ID token
  const token = await user.getIdToken();

  /*
   * Android emulator:
   *
   * 10.0.2.2 = your Windows computer
   *
   * Your Node server is running on:
   * http://localhost:3000
   *
   * But the Android emulator reaches the PC through:
   * http://10.0.2.2:3000
   */

  const BOT_URL = 'http://10.0.2.2:3000/bot';

  const response = await fetch(BOT_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify({
      chatId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || 'Bot request failed'
    );
  }

  return data;
}