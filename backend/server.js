import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

dotenv.config();

// ═══════════════════════════════════════════════════════
// FIREBASE ADMIN
// ═══════════════════════════════════════════════════════

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();
const auth = admin.auth();

// ═══════════════════════════════════════════════════════
// GEMINI
// ═══════════════════════════════════════════════════════

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL = 'gemini-3.8-flash';

// ═══════════════════════════════════════════════════════
// GEMINI REQUEST WITH AUTOMATIC RETRY
// ═══════════════════════════════════════════════════════

async function sendGeminiWithRetry(
  geminiChat,
  message,
  maxRetries = 3
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Gemini request attempt ${attempt}/${maxRetries}`
      );

      const response = await geminiChat.sendMessage({
        message,
      });

      console.log(
        'Gemini response generated successfully.'
      );

      return response;
    } catch (error) {
      lastError = error;

      console.error(
        `Gemini attempt ${attempt} failed:`,
        error?.message || error
      );

      const errorText = JSON.stringify(error);

      // Temporary Gemini/API errors that are worth retrying
      const isTemporaryError =
        error?.status === 503 ||
        error?.code === 503 ||
        error?.status === 429 ||
        error?.code === 429 ||
        errorText.includes('"code":503') ||
        errorText.includes('"code":429') ||
        errorText.includes('UNAVAILABLE') ||
        errorText.includes('RESOURCE_EXHAUSTED') ||
        errorText.includes('high demand') ||
        errorText.includes('temporarily');

      // If this isn't a temporary error, stop immediately.
      if (!isTemporaryError) {
        throw error;
      }

      // If we've used all attempts, stop.
      if (attempt === maxRetries) {
        console.error(
          'Gemini still unavailable after all retry attempts.'
        );

        throw error;
      }

      // Wait progressively longer:
      // Attempt 1 → 2 seconds
      // Attempt 2 → 4 seconds
      const waitTime = attempt * 2000;

      console.log(
        `Gemini temporarily unavailable. ` +
        `Retrying in ${waitTime / 1000} seconds...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, waitTime)
      );
    }
  }

  throw lastError;
}

// ═══════════════════════════════════════════════════════
// EXPRESS
// ═══════════════════════════════════════════════════════

const app = express();

app.use(
  cors({
    origin: '*',
  })
);

app.use(express.json());

// ═══════════════════════════════════════════════════════
// BASIC SERVER TEST
// ═══════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'OrbitChat Gemini server is running',
  });
});

// ═══════════════════════════════════════════════════════
// FIREBASE AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════

async function authenticateFirebaseUser(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        error: 'Authorization header is required',
      });
    }

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid authorization format',
      });
    }

    const idToken = authorization.substring(7);

    const decodedToken = await auth.verifyIdToken(idToken);

    req.user = decodedToken;

    next();
  } catch (error) {
    console.error(
      'Firebase authentication error:',
      error
    );

    return res.status(401).json({
      error:
        'Invalid or expired Firebase authentication token',
    });
  }
}

// ═══════════════════════════════════════════════════════
// CREATE / GET GEMINI CHAT
// ═══════════════════════════════════════════════════════

app.post(
  '/api/gemini/chat',
  authenticateFirebaseUser,
  async (req, res) => {
    try {
      const uid = req.user.uid;

      console.log(
        `Gemini chat request from user: ${uid}`
      );

      // Search for an existing Gemini chat belonging
      // to this user.
      const existingChatsSnapshot = await db
        .collection('chats')
        .where('type', '==', 'ai')
        .where('botType', '==', 'gemini')
        .where(
          'participants',
          'array-contains',
          uid
        )
        .limit(1)
        .get();

      if (!existingChatsSnapshot.empty) {
        const existingChat =
          existingChatsSnapshot.docs[0];

        console.log(
          `Existing Gemini chat found: ${existingChat.id}`
        );

        return res.json({
          success: true,
          chatId: existingChat.id,
          existing: true,
        });
      }

      // Create a new Gemini chat.
      const chatRef = db.collection('chats').doc();

      const chatData = {
        type: 'ai',
        botType: 'gemini',
        name: 'Gemini AI',
        participants: [uid],
        createdBy: uid,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),

        lastMessage: '',

        lastMessageAt:
          admin.firestore.FieldValue.serverTimestamp(),
      };

      await chatRef.set(chatData);

      console.log(
        `Created Gemini chat: ${chatRef.id}`
      );

      return res.status(201).json({
        success: true,
        chatId: chatRef.id,
        existing: false,
      });
    } catch (error) {
      console.error(
        'Create Gemini chat error:',
        error
      );

      return res.status(500).json({
        error:
          error?.message ||
          'Failed to create Gemini chat',
      });
    }
  }
);

// ═══════════════════════════════════════════════════════
// SEND MESSAGE TO GEMINI
// ═══════════════════════════════════════════════════════

app.post(
  '/api/gemini/message',
  authenticateFirebaseUser,
  async (req, res) => {
    try {
      const uid = req.user.uid;

      const { chatId, text } = req.body;

      // ═════════════════════════════════════════════════
      // VALIDATE REQUEST
      // ═════════════════════════════════════════════════

      if (!chatId) {
        return res.status(400).json({
          error: 'chatId is required',
        });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({
          error: 'Message text is required',
        });
      }

      const userText = text.trim();

      console.log('');
      console.log(
        '════════════════════════════════════════'
      );
      console.log(
        `Gemini message from ${uid}: ${userText}`
      );
      console.log(
        '════════════════════════════════════════'
      );

      // ═════════════════════════════════════════════════
      // VERIFY CHAT
      // ═════════════════════════════════════════════════

      const chatRef = db
        .collection('chats')
        .doc(chatId);

      const chatSnapshot = await chatRef.get();

      if (!chatSnapshot.exists) {
        return res.status(404).json({
          error: 'Gemini chat not found',
        });
      }

      const chatData = chatSnapshot.data();

      if (
        chatData.type !== 'ai' ||
        chatData.botType !== 'gemini'
      ) {
        return res.status(400).json({
          error: 'This is not a Gemini chat',
        });
      }

      if (!chatData.participants?.includes(uid)) {
        return res.status(403).json({
          error:
            'You are not a participant in this chat',
        });
      }

      // ═════════════════════════════════════════════════
      // SAVE USER MESSAGE
      // ═════════════════════════════════════════════════

      const userMessageRef = chatRef
        .collection('messages')
        .doc();

      await userMessageRef.set({
        senderId: uid,
        text: userText,
        type: 'text',
        status: 'sent',
        readBy: [uid],

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('User message saved to Firestore.');

      // ═════════════════════════════════════════════════
      // GET PREVIOUS GEMINI CONVERSATION
      // ═════════════════════════════════════════════════

      const previousMessagesSnapshot = await chatRef
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(30)
        .get();

      const history = [];

      previousMessagesSnapshot.forEach((doc) => {
        const message = doc.data();

        if (!message.text) {
          return;
        }

        // Don't send the just-created user message twice.
        if (doc.id === userMessageRef.id) {
          return;
        }

        if (message.senderId === 'gemini') {
          history.push({
            role: 'model',
            parts: [
              {
                text: message.text,
              },
            ],
          });
        } else {
          history.push({
            role: 'user',
            parts: [
              {
                text: message.text,
              },
            ],
          });
        }
      });

      console.log(
        `Conversation history loaded: ${history.length} messages`
      );

      // ═════════════════════════════════════════════════
      // CREATE GEMINI CHAT
      // ═════════════════════════════════════════════════

      const geminiChat = ai.chats.create({
        model: GEMINI_MODEL,

        history,

        config: {
          systemInstruction: `
You are Gemini AI inside OrbitChat.

You are a helpful, friendly and intelligent AI assistant.

Answer the user's questions clearly and accurately.

If the user asks about programming, explain code carefully and provide practical examples.

If the user asks for help with studying, act like a tutor and explain concepts step by step.

Do not claim to be a human.

Keep responses reasonably concise unless the user asks for detailed information.
          `,
        },
      });

      console.log(
        `Gemini chat created using model: ${GEMINI_MODEL}`
      );

      // ═════════════════════════════════════════════════
      // SEND TO GEMINI WITH AUTOMATIC RETRY
      // ═════════════════════════════════════════════════

      const geminiResponse =
        await sendGeminiWithRetry(
          geminiChat,
          userText
        );

      const responseText =
        geminiResponse.text ||
        'Sorry, I could not generate a response.';

      console.log(
        'Gemini response generated successfully.'
      );

      // ═════════════════════════════════════════════════
      // SAVE GEMINI RESPONSE
      // ═════════════════════════════════════════════════

      const geminiMessageRef = chatRef
        .collection('messages')
        .doc();

      await geminiMessageRef.set({
        senderId: 'gemini',
        text: responseText,
        type: 'text',
        status: 'sent',
        readBy: [uid],

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        'Gemini response saved to Firestore.'
      );

      // ═════════════════════════════════════════════════
      // UPDATE CHAT
      // ═════════════════════════════════════════════════

      await chatRef.update({
        lastMessage: responseText,
        lastMessageSenderId: 'gemini',

        lastMessageAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        'Gemini chat updated successfully.'
      );

      console.log(
        '════════════════════════════════════════'
      );
      console.log(
        'Gemini request completed successfully.'
      );
      console.log(
        '════════════════════════════════════════'
      );
      console.log('');

      // ═════════════════════════════════════════════════
      // RETURN RESPONSE TO APP
      // ═════════════════════════════════════════════════

      return res.json({
        success: true,
        chatId,
        message: responseText,
        messageId: geminiMessageRef.id,
      });
    } catch (error) {
      console.error('');
      console.error(
        '════════════════════════════════════════'
      );
      console.error('Gemini message error:');
      console.error(error);
      console.error(
        '════════════════════════════════════════'
      );

      const errorText = JSON.stringify(error);

      // Check if Gemini is temporarily unavailable.
      const isUnavailable =
        error?.status === 503 ||
        error?.code === 503 ||
        error?.status === 429 ||
        error?.code === 429 ||
        errorText.includes('"code":503') ||
        errorText.includes('"code":429') ||
        errorText.includes('UNAVAILABLE') ||
        errorText.includes('RESOURCE_EXHAUSTED') ||
        errorText.includes('high demand') ||
        errorText.includes('temporarily');

      if (isUnavailable) {
        console.log(
          'Gemini is temporarily unavailable.'
        );

        return res.status(503).json({
          error:
            'Gemini is temporarily busy. Please try again in a few seconds.',
          code: 503,
          retryable: true,
        });
      }

      return res.status(500).json({
        error:
          error?.message ||
          'Failed to generate Gemini response',
      });
    }
  }
);

// ═══════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log(
    '════════════════════════════════════════'
  );
  console.log(' OrbitChat Gemini Server');
  console.log(
    '════════════════════════════════════════'
  );
  console.log(` Server running on port ${PORT}`);
  console.log(` http://localhost:${PORT}`);
  console.log(
    ` Android emulator: http://10.0.2.2:${PORT}`
  );
  console.log(
    '════════════════════════════════════════'
  );
  console.log('');
});