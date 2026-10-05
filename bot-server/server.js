require('dotenv').config();

const express = require('express');
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');
const serviceAccount = require('./firebase-service-account.json');

const app = express();

app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Authentication middleware
// ─────────────────────────────────────────────

async function authenticateUser(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing Firebase ID token',
      });
    }

    const idToken = authorization.replace('Bearer ', '').trim();

    const decodedToken = await auth.verifyIdToken(idToken);

    req.uid = decodedToken.uid;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(401).json({
      error: 'Invalid or expired authentication token',
    });
  }
}

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'OrbitChat Gemini Bot Server is running',
  });
});

// ─────────────────────────────────────────────
// Create/find Gemini chat
// ─────────────────────────────────────────────

app.post('/api/gemini/chat', authenticateUser, async (req, res) => {
  try {
    const uid = req.uid;

    const existing = await db
      .collection('chats')
      .where('type', '==', 'ai')
      .where('botType', '==', 'gemini')
      .where('participants', 'array-contains', uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.json({
        success: true,
        chatId: existing.docs[0].id,
      });
    }

    const chatRef = db.collection('chats').doc();

    await chatRef.set({
      type: 'ai',
      botType: 'gemini',
      participants: [uid],
      groupName: 'Gemini AI',
      groupPhotoUrl: null,
      createdBy: uid,
      lastMessage: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Initial bot message
    const messageRef = chatRef.collection('messages').doc();

    await messageRef.set({
      senderId: 'gemini-bot',
      text: 'Hello! 👋 I am Gemini AI. How can I help you today?',
      type: 'text',
      status: 'sent',
      readBy: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await chatRef.update({
      lastMessage: {
        text: 'Hello! 👋 I am Gemini AI. How can I help you today?',
        senderId: 'gemini-bot',
        type: 'text',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      chatId: chatRef.id,
    });
  } catch (error) {
    console.error('Create Gemini chat error:', error);

    return res.status(500).json({
      error: 'Failed to create Gemini chat',
    });
  }
});

// ─────────────────────────────────────────────
// Send message to Gemini
// ─────────────────────────────────────────────

app.post('/api/gemini/message', authenticateUser, async (req, res) => {
  try {
    const uid = req.uid;
    const { chatId, text } = req.body;

    if (!chatId || !text || !text.trim()) {
      return res.status(400).json({
        error: 'chatId and text are required',
      });
    }

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    const chatData = chatSnap.data();

    // Make sure this user owns/is a participant in this AI chat.
    if (
      chatData.type !== 'ai' ||
      chatData.botType !== 'gemini' ||
      !Array.isArray(chatData.participants) ||
      !chatData.participants.includes(uid)
    ) {
      return res.status(403).json({
        error: 'You do not have access to this Gemini chat',
      });
    }

    // Save user's message.
    await chatRef.collection('messages').add({
      senderId: uid,
      text: text.trim(),
      type: 'text',
      status: 'sent',
      readBy: [uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get previous messages for conversation context.
    const messagesSnap = await chatRef
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(30)
      .get();

    const contents = [];

    messagesSnap.docs.forEach((doc) => {
      const message = doc.data();

      if (!message.text) return;

      // Skip the initial welcome message if desired.
      if (message.senderId === 'gemini-bot') {
        contents.push({
          role: 'model',
          parts: [{ text: message.text }],
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: message.text }],
        });
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction:
          'You are Gemini AI inside OrbitChat. Be helpful, clear, friendly, and concise. You can help with programming, education, general questions, writing, explanations, and problem solving.',
      },
    });

    const botText =
      response.text ||
      'Sorry, I could not generate a response right now.';

    // Save Gemini response.
    await chatRef.collection('messages').add({
      senderId: 'gemini-bot',
      text: botText,
      type: 'text',
      status: 'sent',
      readBy: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update chat preview.
    await chatRef.update({
      lastMessage: {
        text: botText,
        senderId: 'gemini-bot',
        type: 'text',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      response: botText,
    });
  } catch (error) {
    console.error('Gemini message error:', error);

    return res.status(500).json({
      error: 'Failed to generate Gemini response',
      details: error.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('OrbitChat Gemini Bot Server');
  console.log(`Running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log('========================================');
});