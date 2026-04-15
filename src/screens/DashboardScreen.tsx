import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type Shift = {
  id: string;
  shift_date: string;
  venue_name: string;
  hours: number;
  take_home: number;
  cash_tips: number;
  credit_tips: number;
  total_tip_out: number;
};

export default function DashboardScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('shift_date', { ascending: false })
      .limit(50);
    if (!error && data) setShifts(data);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchShifts();
    }, [])
  );

  function getWeeklyTotal() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return shifts
      .filter((s) => new Date(s.shift_date) >= weekAgo)
      .reduce((sum, s) => sum + s.take_home, 0);
  }

  function getAllTimeTotal() {
    return shifts.reduce((sum, s) => sum + s.take_home, 0);
  }

  function getAvgPerShift() {
    if (!shifts.length) return 0;
    return getAllTimeTotal() / shifts.length;
  }

  function getEffectiveHourly(shift: Shift) {
    if (!shift.hours) return 0;
    return shift.take_home / shift.hours;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const recentShifts = shifts.slice(0, 5);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchShifts(); }} tintColor="#3b82f6" />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>THIS WEEK</Text>
        <Text style={styles.heroAmount}>${getWeeklyTotal().toFixed(2)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>ALL TIME</Text>
          <Text style={styles.statValue}>${getAllTimeTotal().toFixed(0)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>AVG/SHIFT</Text>
          <Text style={styles.statValue}>${getAvgPerShift().toFixed(0)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SHIFTS</Text>
          <Text style={styles.statValue}>{shifts.length}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Shifts</Text>

      {recentShifts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No shifts yet. Log your first shift.</Text>
        </View>
      ) : (
        recentShifts.map((shift) => (
          <View key={shift.id} style={styles.shiftCard}>
            <View style={styles.shiftLeft}>
              <Text style={styles.shiftVenue}>{shift.venue_name}</Text>
              <Text style={styles.shiftDate}>{formatDate(shift.shift_date)} - {shift.hours}hr</Text>
              <Text style={styles.shiftHourly}>${getEffectiveHourly(shift).toFixed(2)}/hr effective</Text>
            </View>
            <View style={styles.shiftRight}>
              <Text style={styles.shiftAmount}>${shift.take_home.toFixed(2)}</Text>
              <Text style={styles.shiftTipOut}>-${shift.total_tip_out.toFixed(2)} tip out</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  statLabel: {
    fontSize: 10,
    color: '#555',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#555',
    letterSpacing: 1.5,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#444',
    fontSize: 15,
  },
  shiftCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  shiftLeft: { flex: 1 },
  shiftVenue: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  shiftDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  shiftHourly: { fontSize: 12, color: '#3b82f6' },
  shiftRight: { alignItems: 'flex-end' },
  shiftAmount: { fontSize: 20, fontWeight: '700', color: '#fff' },
  shiftTipOut: { fontSize: 12, color: '#ef4444', marginTop: 2 },
});