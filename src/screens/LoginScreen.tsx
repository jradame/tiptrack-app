import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Login failed', error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('Sign up failed', error.message);
      else Alert.alert('Check your email', 'Confirm your account then log in.');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>TipTrack</Text>
      <Text style={styles.sub}>Know what you actually made.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#555"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#555"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={styles.toggle}>
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -1,
  },
  sub: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 48,
  },
  input: {
    backgroundColor: '#111111',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeIcon: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
  },
  toggle: {
    color: '#f59e0b',
    textAlign: 'center',
    fontSize: 14,
  },
});