import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
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

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DashboardScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('shift_date', { ascending: false })
      .limit(100);
    if (!error && data) setShifts(data);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchShifts();
    }, [])
  );

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your shift data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Are you sure?',
              'All your shifts, venues, and account data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    // Delete all user data
await supabase.from('shifts').delete().eq('user_id', user.id);
await supabase.from('venues').delete().eq('user_id', user.id);

// Get session token
const { data: { session } } = await supabase.auth.getSession();

// Call admin API directly to delete user
const response = await fetch(
  `https://sskduyhflkgnlawzwdsv.supabase.co/auth/v1/admin/users/${user.id}`,
  {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SERVICE_ROLE_KEY}`,
      apikey: `${process.env.EXPO_PUBLIC_SERVICE_ROLE_KEY}`,
    },
  }
);
console.log('Delete user response:', response.status);

setDeleting(false);
await supabase.auth.signOut();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function getWeeklyTotal() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return shifts
      .filter((s) => new Date(s.shift_date) >= cutoff)
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

  function getVenueStats() {
    const map: Record<string, { totalTakeHome: number; totalHours: number; shiftCount: number }> = {};
    shifts.forEach((s) => {
      if (!map[s.venue_name]) map[s.venue_name] = { totalTakeHome: 0, totalHours: 0, shiftCount: 0 };
      map[s.venue_name].totalTakeHome += s.take_home;
      map[s.venue_name].totalHours += s.hours;
      map[s.venue_name].shiftCount += 1;
    });
    return Object.entries(map)
      .map(([name, stats]) => ({
        name,
        effectiveHourly: stats.totalHours > 0 ? stats.totalTakeHome / stats.totalHours : 0,
        avgPerShift: stats.shiftCount > 0 ? stats.totalTakeHome / stats.shiftCount : 0,
        shiftCount: stats.shiftCount,
      }))
      .sort((a, b) => b.effectiveHourly - a.effectiveHourly);
  }

  const venueStats = getVenueStats();
  const maxHourly = Math.max(...venueStats.map((v) => v.effectiveHourly), 1);
  const recentShifts = shifts.slice(0, 5);
  const chartWidth = SCREEN_WIDTH - 96;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchShifts(); }}
          tintColor="#f59e0b"
        />
      }
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

      {venueStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VENUE COMPARISON</Text>
          <Text style={styles.sectionSub}>Effective hourly rate across all venues</Text>
          <View style={styles.chartCard}>
            {venueStats.map((venue, index) => {
              const barWidth = (venue.effectiveHourly / maxHourly) * chartWidth;
              const isTop = index === 0 && venueStats.length > 1;
              return (
                <View key={venue.name} style={styles.barRow}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barVenueName} numberOfLines={1}>
                      {venue.name}
                      {isTop && <Text style={styles.topBadge}> BEST</Text>}
                    </Text>
                    <Text style={[styles.barValue, isTop && styles.barValueTop]}>
                      ${venue.effectiveHourly.toFixed(2)}/hr
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: barWidth }, isTop && styles.barFillTop]} />
                  </View>
                  <Text style={styles.barMeta}>
                    {venue.shiftCount} shift{venue.shiftCount !== 1 ? 's' : ''} · avg ${venue.avgPerShift.toFixed(0)}/shift
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { paddingHorizontal: 24, marginBottom: 12 }]}>RECENT SHIFTS</Text>

      {recentShifts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No shifts yet. Log your first shift.</Text>
        </View>
      ) : (
        recentShifts.map((shift) => (
          <View key={shift.id} style={styles.shiftCard}>
            <View style={styles.shiftLeft}>
              <Text style={styles.shiftVenue}>{shift.venue_name}</Text>
              <Text style={styles.shiftDate}>{formatDate(shift.shift_date)} · {shift.hours}hr</Text>
              <Text style={styles.shiftHourly}>${getEffectiveHourly(shift).toFixed(2)}/hr effective</Text>
            </View>
            <View style={styles.shiftRight}>
              <Text style={styles.shiftAmount}>${shift.take_home.toFixed(2)}</Text>
              <Text style={styles.shiftTipOut}>-${shift.total_tip_out.toFixed(2)} tip out</Text>
            </View>
          </View>
        ))
      )}

      {/* Delete Account */}
      <View style={styles.dangerZone}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.deleteHint}>Permanently deletes your account and all shift data.</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  hero: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  heroLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 8 },
  heroAmount: { fontSize: 56, fontWeight: '700', color: '#f59e0b' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 32 },
  statBox: {
    flex: 1, backgroundColor: '#111111', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e',
  },
  statLabel: { fontSize: 10, color: '#555', letterSpacing: 1.5, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '600', color: '#fff' },
  section: { paddingHorizontal: 16, marginBottom: 32 },
  sectionTitle: { fontSize: 11, color: '#555', letterSpacing: 1.5, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#444', marginBottom: 14 },
  chartCard: {
    backgroundColor: '#111111', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1e1e1e', gap: 20,
  },
  barRow: { gap: 6 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barVenueName: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },
  topBadge: { fontSize: 10, color: '#f59e0b', letterSpacing: 1 },
  barValue: { fontSize: 13, color: '#aaa', fontWeight: '500' },
  barValueTop: { color: '#f59e0b', fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: '#1e1e1e', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#3a2e10', borderRadius: 999 },
  barFillTop: { backgroundColor: '#f59e0b' },
  barMeta: { fontSize: 11, color: '#555' },
  emptyState: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 15 },
  shiftCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111111', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e1e1e',
  },
  shiftLeft: { flex: 1 },
  shiftVenue: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  shiftDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  shiftHourly: { fontSize: 12, color: '#f59e0b' },
  shiftRight: { alignItems: 'flex-end' },
  shiftAmount: { fontSize: 20, fontWeight: '700', color: '#fff' },
  shiftTipOut: { fontSize: 12, color: '#ef4444', marginTop: 2 },
  dangerZone: {
    marginHorizontal: 16, marginTop: 40, paddingTop: 24,
    borderTopWidth: 1, borderTopColor: '#1e1e1e', alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderWidth: 1, borderColor: '#ef4444', borderRadius: 10,
    marginBottom: 8,
  },
  deleteButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  deleteHint: { fontSize: 12, color: '#444', textAlign: 'center' },
});