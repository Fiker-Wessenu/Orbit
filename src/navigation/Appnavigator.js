import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import {
  NavigationContainer
}
from '@react-navigation/native';

import {
  createNativeStackNavigator
}
from '@react-navigation/native-stack';

import auth from '@react-native-firebase/auth';

import LoginScreen from '../screens/loginscreen';
import RegisterScreen from '../screens/registrationscreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import HomeScreen from '../screens/homescreen';


const Stack =
createNativeStackNavigator();


export default function AppNavigator() {

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return(

    <NavigationContainer>

      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !user.emailVerified ? (
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} />
        )}

      </Stack.Navigator>

    </NavigationContainer>

  );

}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});