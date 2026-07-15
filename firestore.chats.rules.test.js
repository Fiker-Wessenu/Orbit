/**
 * firestore.chats.rules.test.js
 *
 * Tests positive (allowed) and negative (denied) authorization
 * scenarios for /chats/{chatId} and /chats/{chatId}/messages/{messageId}.
 *
 * SETUP:
 *   npm install --save-dev @firebase/rules-unit-testing
 *
 * RUN (in one terminal, keep running):
 *   firebase emulators:start --only firestore
 *
 * RUN (in a second terminal):
 *   node firestore.chats.rules.test.js
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');

const PROJECT_ID = 'orbit2-e551b'; // <-- your Firebase project id

let testEnv;

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
}

async function runTests() {
  await setup();

  // ─────────────────────────────────────────────
  // Test users
  // ─────────────────────────────────────────────
  const userA = testEnv.authenticatedContext('uid_a', { email: 'usera@ssgi.gov.et' });
  const userB = testEnv.authenticatedContext('uid_b', { email: 'userb@ssgi.gov.et' });
  const outsider = testEnv.authenticatedContext('uid_c', { email: 'userc@ssgi.gov.et' });
  const anon = testEnv.unauthenticatedContext();

  const CHAT_ID = 'chat_ab';
  const MESSAGE_ID = 'msg_1';

  // Seed a direct chat between userA and userB, and one message sent by userA.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .collection('chats')
      .doc(CHAT_ID)
      .set({
        type: 'direct',
        participants: ['uid_a', 'uid_b'],
        createdBy: 'uid_a',
        createdAt: new Date(),
        lastMessage: null,
        lastMessageAt: new Date(),
      });

    await context
      .firestore()
      .collection('chats')
      .doc(CHAT_ID)
      .collection('messages')
      .doc(MESSAGE_ID)
      .set({
        senderId: 'uid_a',
        text: 'Hello there',
        type: 'text',
        createdAt: new Date(),
        status: 'sent',
        readBy: {},
      });
  });

  console.log('\n=== POSITIVE AUTHORIZATION: chats (should be ALLOWED) ===\n');

  // 1. A participant can read the chat
  await assertSucceeds(
    userA.firestore().collection('chats').doc(CHAT_ID).get()
  );
  console.log('PASS: participant can read the chat');

  // 2. A user can create a new chat that includes themselves
  await assertSucceeds(
    userA.firestore().collection('chats').doc('chat_new').set({
      type: 'direct',
      participants: ['uid_a', 'uid_c'],
      createdBy: 'uid_a',
      createdAt: new Date(),
      lastMessageAt: new Date(),
    })
  );
  console.log('PASS: user can create a chat including themselves');

  // 3. A participant can update lastMessage/lastMessageAt
  await assertSucceeds(
    userB.firestore().collection('chats').doc(CHAT_ID).update({
      lastMessage: { text: 'hi', senderId: 'uid_b', timestamp: new Date() },
      lastMessageAt: new Date(),
    })
  );
  console.log('PASS: participant can update lastMessage fields');

  console.log('\n=== NEGATIVE AUTHORIZATION: chats (should be DENIED) ===\n');

  // 4. A non-participant cannot read the chat
  await assertFails(
    outsider.firestore().collection('chats').doc(CHAT_ID).get()
  );
  console.log('PASS: non-participant blocked from reading the chat');

  // 5. A user cannot create a chat that does NOT include themselves
  await assertFails(
    userA.firestore().collection('chats').doc('chat_bad').set({
      type: 'direct',
      participants: ['uid_b', 'uid_c'],
      createdBy: 'uid_a',
      createdAt: new Date(),
      lastMessageAt: new Date(),
    })
  );
  console.log('PASS: user blocked from creating a chat without themselves as participant');

  // 6. A user cannot spoof createdBy as someone else
  await assertFails(
    userA.firestore().collection('chats').doc('chat_spoof').set({
      type: 'direct',
      participants: ['uid_a', 'uid_b'],
      createdBy: 'uid_b', // lying about who created it
      createdAt: new Date(),
      lastMessageAt: new Date(),
    })
  );
  console.log('PASS: user blocked from spoofing createdBy');

  // 7. An unauthenticated request cannot read the chat
  await assertFails(
    anon.firestore().collection('chats').doc(CHAT_ID).get()
  );
  console.log('PASS: unauthenticated request blocked from reading the chat');

  console.log('\n=== POSITIVE AUTHORIZATION: messages (should be ALLOWED) ===\n');

  // 8. A participant can read messages
  await assertSucceeds(
    userB.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc(MESSAGE_ID).get()
  );
  console.log('PASS: participant can read messages');

  // 9. A participant can send a message as themselves
  await assertSucceeds(
    userB.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc('msg_2').set({
        senderId: 'uid_b',
        text: 'Hey!',
        type: 'text',
        createdAt: new Date(),
        status: 'sent',
        readBy: {},
      })
  );
  console.log('PASS: participant can send a message as themselves');

  // 10. Any participant can update readBy/status (read receipts) on someone else's message
  await assertSucceeds(
    userB.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc(MESSAGE_ID).update({
        'readBy.uid_b': new Date(),
        status: 'read',
      })
  );
  console.log('PASS: participant can mark another user\'s message as read');

  // 11. The sender can edit their own message content
  await assertSucceeds(
    userA.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc(MESSAGE_ID).update({
        text: 'Hello there (edited)',
      })
  );
  console.log('PASS: sender can edit their own message content');

  console.log('\n=== NEGATIVE AUTHORIZATION: messages (should be DENIED) ===\n');

  // 12. A non-participant cannot read messages
  await assertFails(
    outsider.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc(MESSAGE_ID).get()
  );
  console.log('PASS: non-participant blocked from reading messages');

  // 13. A non-participant cannot send a message into the chat
  await assertFails(
    outsider.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc('msg_bad').set({
        senderId: 'uid_c',
        text: 'I should not be here',
        type: 'text',
        createdAt: new Date(),
        status: 'sent',
        readBy: {},
      })
  );
  console.log('PASS: non-participant blocked from sending a message');

  // 14. A participant cannot send a message spoofing someone else's senderId
  await assertFails(
    userB.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc('msg_spoof').set({
        senderId: 'uid_a', // lying about who sent it
        text: 'Fake message',
        type: 'text',
        createdAt: new Date(),
        status: 'sent',
        readBy: {},
      })
  );
  console.log('PASS: participant blocked from spoofing senderId');

  // 15. A non-sender participant cannot edit the message's text content
  await assertFails(
    userB.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc(MESSAGE_ID).update({
        text: 'I am editing someone else\'s message',
      })
  );
  console.log('PASS: non-sender blocked from editing message content');

  // 16. A non-sender participant cannot delete the message
  await assertFails(
    userB.firestore().collection('chats').doc(CHAT_ID)
      .collection('messages').doc(MESSAGE_ID).delete()
  );
  console.log('PASS: non-sender blocked from deleting message');

  console.log('\nAll tests completed.\n');

  await testEnv.cleanup();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
