import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
} from 'react-native';

import {registerUser} from '../firebase/auth';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const handleRegister = async () => {
    try {
      await registerUser(
        email,
        password,
      );

      Alert.alert(
        'Success',
        'Check your email to verify your account',
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.message,
      );
    }
  };

  return (
    <View>
      <Text>Create Account</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button
        title="Register"
        onPress={handleRegister}
      />
    </View>
  );
}