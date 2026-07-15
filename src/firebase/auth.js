import auth from '@react-native-firebase/auth';

export const registerUser = async (email, password) => {
  const userCredential =
    await auth().createUserWithEmailAndPassword(
      email,
      password,
    );

  await userCredential.user.sendEmailVerification();

  return userCredential;
};

export const loginUser = async (email, password) => {
  return await auth().signInWithEmailAndPassword(
    email,
    password,
  );
};