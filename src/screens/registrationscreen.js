import React, {useState} from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet
} from 'react-native';

import auth from '@react-native-firebase/auth';


export default function RegisterScreen() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  const createAccount = async () => {

    try {

      const userCredential =
        await auth().createUserWithEmailAndPassword(
          email,
          password
        );


      await userCredential.user.sendEmailVerification();


      Alert.alert(
        "Success",
        "Account created! Check your email for verification."
      );


    } catch (error) {

      Alert.alert(
        "Firebase Error",
        error.message
      );

    }

  };


  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        OrbitChat Create Account
      </Text>


      <TextInput
        style={styles.input}
        placeholder="Enter Email"
        value={email}
        onChangeText={setEmail}
      />


      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />


      <Button
        title="Create Account"
        onPress={createAccount}
      />


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