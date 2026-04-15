import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LogShiftScreen from '../screens/LogShiftScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import VenuesScreen from '../screens/VenuesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '◉',
    Log: '+',
    History: '≡',
    Analytics: '▲',
    Venues: '⌂',
  };
  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.icon, focused && tabIconStyles.focused]}>
        {icons[label] || '•'}
      </Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  icon: { fontSize: 18, color: '#444' },
  focused: { color: '#f59e0b' },
});

function MainTabs({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#111111',
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#444',
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        headerRight: () => (
          <TouchableOpacity onPress={onSignOut} style={{ marginRight: 16 }}>
            <Text style={{ color: '#555', fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Log" component={LogShiftScreen} options={{ title: 'Log Shift' }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Venues" component={VenuesScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main">
            {() => <MainTabs onSignOut={handleSignOut} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}