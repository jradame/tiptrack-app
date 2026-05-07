import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <StatusBar style="light" />
      <AppNavigator />
    </KeyboardProvider>
  );
}