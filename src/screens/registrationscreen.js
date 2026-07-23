import React, {useState} from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';


function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one capital letter' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/;']/.test(password)) {
    return { valid: false, message: 'Password must include at least one special character' };
  }
  return { valid: true };
}


export default function RegisterScreen({ navigation }) {

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const createAccount = async () => {

    if (!fullName.trim()) {
      Alert.alert("Missing Info", "Please enter your full name.");
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      Alert.alert("Weak Password", passwordCheck.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords match.");
      return;
    }

    setLoading(true);

    try {

      const userCredential =
        await auth().createUserWithEmailAndPassword(
          email,
          password
        );

      const user = userCredential.user;


      // Set the display name on the Firebase Auth account itself
      await user.updateProfile({
        displayName: fullName.trim(),
      });


      await user.sendEmailVerification();


      // Create the user's Firestore profile — required by your
      // security rules, and used by the rest of the app.
      await firestore().collection('users').doc(user.uid).set({
        uid: user.uid,
        fullName: fullName.trim(),
        email: user.email,
        photoURL: null, // default avatar shown client-side until they upload one
        emailVerified: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });


      Alert.alert(
        "Success",
        "Account created! Check your email for verification."
      );

      navigation.navigate('VerifyEmail');


    } catch (error) {

      Alert.alert(
        "Firebase Error",
        error.message
      );

    } finally {
      setLoading(false);
    }

  };


  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        OrbitChat Create Account
      </Text>


      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        editable={!loading}
      />


      <TextInput
        style={styles.input}
        placeholder="Enter Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />


      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />


      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!loading}
      />


      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <Button
          title="Create Account"
          onPress={createAccount}
        />
      )}


    </View>

  );

}


const styles = StyleSheet.create({

  container:{
    flex:1,
    justifyContent:'center',
    padding:20
  },

  title:{
    fontSize:24,
    textAlign:'center',
    marginBottom:30
  },

  input:{
    borderWidth:1,
    padding:10,
    marginBottom:15,
    borderRadius:5
  }

});