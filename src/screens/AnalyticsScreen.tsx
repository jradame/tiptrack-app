import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
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
const CHART_WIDTH = SCREEN_WIDTH - 64;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('shift_date', { ascending: false });
    if (!error && data) setShifts(data);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchShifts();
    }, [])
  );

  // earnings by day of week
  function getDayOfWeekData() {
    const totals = Array(7).fill(0);
    const counts = Array(7).fill(0);
    shifts.forEach((s) => {
      const day = new Date(s.shift_date + 'T00:00:00').getDay();
      totals[day] += s.take_home;
      counts[day]++;
    });
    return DAYS.map((label, i) => ({
      label,
      avg: counts[i] > 0 ? totals[i] / counts[i] : 0,
      count: counts[i],
    }));
  }

  // monthly totals for last 6 months
  function getMonthlyData() {
    const now = new Date();
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
    }
    return months.map(({ label, year, month }) => {
      const total = shifts
        .filter((s) => {
          const d = new Date(s.shift_date + 'T00:00:00');
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, s) => sum + s.take_home, 0);
      return { label, total };
    });
  }

  // venue breakdown
  function getVenueData() {
    const map: Record<string, number> = {};
    shifts.forEach((s) => {
      map[s.venue_name] = (map[s.venue_name] || 0) + s.take_home;
    });
    const total = Object.values(map).reduce((sum, v) => sum + v, 0);
    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  const dayData = getDayOfWeekData();
  const monthlyData = getMonthlyData();
  const venueData = getVenueData();
  const maxDayAvg = Math.max(...dayData.map((d) => d.avg), 1);
  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  const VENUE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (shifts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Log some shifts to see analytics.</Text>
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
          tintColor="#3b82f6"
        />
      }
    >
      {/* Day of week */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EARNINGS BY DAY</Text>
        <Text style={styles.sectionSub}>Average take-home per day of week</Text>
        <View style={styles.card}>
          <View style={styles.barChart}>
            {dayData.map((day, i) => {
              const barHeight = maxDayAvg > 0 ? (day.avg / maxDayAvg) * 120 : 0;
              const isTop = day.avg === Math.max(...dayData.map((d) => d.avg)) && day.avg > 0;
              return (
                <View key={day.label} style={styles.barColumn}>
                  <Text style={[styles.barTopLabel, isTop && styles.barTopLabelActive]}>
                    {day.avg > 0 ? `$${day.avg.toFixed(0)}` : ''}
                  </Text>
                  <View style={styles.barColumnTrack}>
                    <View
                      style={[
                        styles.verticalBar,
                        { height: barHeight },
                        isTop && styles.verticalBarTop,
                        day.avg === 0 && styles.verticalBarEmpty,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDayLabel, isTop && styles.barDayLabelActive]}>
                    {day.label}
                  </Text>
                  {day.count > 0 && (
                    <Text style={styles.barCountLabel}>{day.count}</Text>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.chartNote}>Numbers below bars = shifts logged</Text>
        </View>
      </View>

      {/* Monthly totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MONTHLY TOTALS</Text>
        <Text style={styles.sectionSub}>Take-home over the last 6 months</Text>
        <View style={styles.card}>
          {monthlyData.map((month, i) => {
            const barWidth = maxMonthly > 0 ? (month.total / maxMonthly) * CHART_WIDTH : 0;
            const isTop = month.total === Math.max(...monthlyData.map((m) => m.total)) && month.total > 0;
            return (
              <View key={`${month.label}-${i}`} style={styles.hBarRow}>
                <Text style={styles.hBarLabel}>{month.label}</Text>
                <View style={styles.hBarTrack}>
                  <View
                    style={[
                      styles.hBarFill,
                      { width: barWidth },
                      isTop && styles.hBarFillTop,
                    ]}
                  />
                </View>
                <Text style={[styles.hBarValue, isTop && styles.hBarValueTop]}>
                  {month.total > 0 ? `$${month.total.toFixed(0)}` : '-'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Venue breakdown */}
      {venueData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VENUE BREAKDOWN</Text>
          <Text style={styles.sectionSub}>Total earnings by venue</Text>
          <View style={styles.card}>
            {venueData.map((venue, i) => (
              <View key={venue.name} style={styles.venueRow}>
                <View style={styles.venueLabelRow}>
                  <View style={[styles.venueDot, { backgroundColor: VENUE_COLORS[i % VENUE_COLORS.length] }]} />
                  <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                  <Text style={styles.venuePercent}>{venue.percent.toFixed(0)}%</Text>
                  <Text style={styles.venueAmount}>${venue.amount.toFixed(0)}</Text>
                </View>
                <View style={styles.venueBarTrack}>
                  <View
                    style={[
                      styles.venueBarFill,
                      {
                        width: (venue.percent / 100) * CHART_WIDTH,
                        backgroundColor: VENUE_COLORS[i % VENUE_COLORS.length],
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 15 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 11, color: '#555', letterSpacing: 1.5, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#444', marginBottom: 12 },
  card: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  chartNote: { fontSize: 11, color: '#444', marginTop: 10, textAlign: 'center' },

  // vertical bar chart (day of week)
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 16,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTopLabel: { fontSize: 9, color: '#555', marginBottom: 4, textAlign: 'center' },
  barTopLabelActive: { color: '#3b82f6', fontWeight: '700' },
  barColumnTrack: {
    width: 24,
    height: 120,
    justifyContent: 'flex-end',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  verticalBar: {
    width: 24,
    backgroundColor: '#2a3f55',
    borderRadius: 4,
  },
  verticalBarTop: { backgroundColor: '#3b82f6' },
  verticalBarEmpty: { height: 2, backgroundColor: '#1f1f1f' },
  barDayLabel: { fontSize: 11, color: '#666', marginTop: 6 },
  barDayLabelActive: { color: '#3b82f6', fontWeight: '600' },
  barCountLabel: { fontSize: 10, color: '#444', marginTop: 2 },

  // horizontal bar chart (monthly)
  hBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  hBarLabel: { fontSize: 12, color: '#888', width: 30 },
  hBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    overflow: 'hidden',
  },
  hBarFill: {
    height: 6,
    backgroundColor: '#2a3f55',
    borderRadius: 999,
  },
  hBarFillTop: { backgroundColor: '#3b82f6' },
  hBarValue: { fontSize: 12, color: '#666', width: 50, textAlign: 'right' },
  hBarValueTop: { color: '#3b82f6', fontWeight: '700' },

  // venue breakdown
  venueRow: { marginBottom: 14 },
  venueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  venueDot: { width: 8, height: 8, borderRadius: 999 },
  venueName: { flex: 1, fontSize: 13, color: '#fff', fontWeight: '500' },
  venuePercent: { fontSize: 12, color: '#666' },
  venueAmount: { fontSize: 13, color: '#fff', fontWeight: '600', marginLeft: 8 },
  venueBarTrack: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    overflow: 'hidden',
  },
  venueBarFill: {
    height: 4,
    borderRadius: 999,
  },
});