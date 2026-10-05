/**
 * firestore.rules.test.js
 *
 * Tests positive (allowed) and negative (denied) authorization
 * scenarios for the /users/{uid} collection.
 *
 * SETUP:
 *   npm install --save-dev @firebase/rules-unit-testing
 *
 * RUN (in one terminal, keep running):
 *   firebase emulators:start --only firestore
 *
 * RUN (in a second terminal):
 *   node firestore.rules.test.js
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
      port: 8080, // default Firestore emulator port
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
  const outsider = testEnv.authenticatedContext('uid_c', { email: 'someone@gmail.com' });
  const anon = testEnv.unauthenticatedContext();

  // Seed userA's profile document directly (bypassing rules) so we
  // have something real to test reads/writes against.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .collection('users')
      .doc('uid_a')
      .set({ email: 'usera@ssgi.gov.et', displayName: 'User A' });
  });

  console.log('\n=== POSITIVE AUTHORIZATION (should be ALLOWED) ===\n');

  // 1. A logged-in user can read their OWN profile
  await assertSucceeds(
    userA.firestore().collection('users').doc('uid_a').get()
  );
  console.log('PASS: user can read their own profile');

  // 2. A logged-in user (correct domain) can CREATE their own profile
  await assertSucceeds(
    userB.firestore().collection('users').doc('uid_b').set({
      email: 'userb@ssgi.gov.et',
      displayName: 'User B',
    })
  );
  console.log('PASS: user can create their own profile with correct domain');

  // 3. A logged-in user can UPDATE their own profile (non-restricted field)
  await assertSucceeds(
    userA.firestore().collection('users').doc('uid_a').update({
      displayName: 'User A Updated',
    })
  );
  console.log('PASS: user can update their own profile');

  console.log('\n=== NEGATIVE AUTHORIZATION (should be DENIED) ===\n');

  // 4. A logged-in user CANNOT write to someone else's profile
  await assertFails(
    userB.firestore().collection('users').doc('uid_a').set({
      displayName: 'Hacked!',
    })
  );
  console.log('PASS: user blocked from writing another user\'s profile');

  // 5. A user CANNOT create a profile using someone else's uid as the doc id
  await assertFails(
    userA.firestore().collection('users').doc('uid_b').set({
      email: 'usera@ssgi.gov.et',
    })
  );
  console.log('PASS: user blocked from creating a profile under someone else\'s uid');

  // 6. A user with a non-@ssgi.gov.et email CANNOT create a profile
  await assertFails(
    outsider.firestore().collection('users').doc('uid_c').set({
      email: 'someone@gmail.com',
    })
  );
  console.log('PASS: user blocked from creating profile with wrong email domain');

  // 7. An unauthenticated (not logged in) request CANNOT read any profile
  await assertFails(
    anon.firestore().collection('users').doc('uid_a').get()
  );
  console.log('PASS: unauthenticated request blocked from reading profiles');

  // 8. A user CANNOT change their own protected fields (email/uid)
  await assertFails(
    userA.firestore().collection('users').doc('uid_a').update({
      email: 'newemail@ssgi.gov.et',
    })
  );
  console.log('PASS: user blocked from changing their own email field');

  console.log('\nAll tests completed.\n');

  await testEnv.cleanup();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
