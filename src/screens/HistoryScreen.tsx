import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
  tip_outs: { role: string; amount: number }[];
  notes?: string;
};

type Filter = 'week' | 'month' | 'all';

export default function HistoryScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filter, setFilter] = useState<Filter>('month');
  const [expanded, setExpanded] = useState<string | null>(null);
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

  function filterShifts() {
    const now = new Date();
    if (filter === 'week') {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
      return shifts.filter((s) => new Date(s.shift_date) >= cutoff);
    }
    if (filter === 'month') {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
      return shifts.filter((s) => new Date(s.shift_date) >= cutoff);
    }
    return shifts;
  }

  async function deleteShift(id: string) {
    Alert.alert('Delete shift', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('shifts').delete().eq('id', id);
          setShifts((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function effectiveHourly(shift: Shift) {
    if (!shift.hours) return '0.00';
    return (shift.take_home / shift.hours).toFixed(2);
  }

  const filtered = filterShifts();
  const total = filtered.reduce((sum, s) => sum + s.take_home, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {(['week', 'month', 'all'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.filterTotal}>${total.toFixed(2)}</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchShifts(); }}
            tintColor="#3b82f6"
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No shifts in this period.</Text>
          </View>
        ) : (
          filtered.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              style={styles.shiftCard}
              onPress={() => setExpanded(expanded === shift.id ? null : shift.id)}
              activeOpacity={0.8}
            >
              <View style={styles.shiftRow}>
                <View style={styles.shiftLeft}>
                  <Text style={styles.shiftVenue}>{shift.venue_name}</Text>
                  <Text style={styles.shiftDate}>{formatDate(shift.shift_date)}</Text>
                </View>
                <View style={styles.shiftRight}>
                  <Text style={styles.shiftAmount}>${shift.take_home.toFixed(2)}</Text>
                  <Text style={styles.shiftHours}>{shift.hours}hr</Text>
                </View>
              </View>

              {expanded === shift.id && (
                <View style={styles.expanded}>
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Cash tips</Text>
                    <Text style={styles.expandedValue}>${shift.cash_tips.toFixed(2)}</Text>
                  </View>
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Credit tips</Text>
                    <Text style={styles.expandedValue}>${shift.credit_tips.toFixed(2)}</Text>
                  </View>
                  {shift.tip_outs?.map((t) => (
                    <View key={t.role} style={styles.expandedRow}>
                      <Text style={styles.expandedLabel}>{t.role} tip out</Text>
                      <Text style={[styles.expandedValue, { color: '#ef4444' }]}>-${t.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Effective hourly</Text>
                    <Text style={[styles.expandedValue, { color: '#3b82f6' }]}>${effectiveHourly(shift)}/hr</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteShift(shift.id)}>
                    <Text style={styles.deleteBtnText}>Delete shift</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { color: '#666', fontSize: 11, letterSpacing: 1 },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  filterTotal: { marginLeft: 'auto', color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 15 },
  shiftCard: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shiftLeft: { flex: 1 },
  shiftVenue: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  shiftDate: { fontSize: 12, color: '#666' },
  shiftRight: { alignItems: 'flex-end' },
  shiftAmount: { fontSize: 20, fontWeight: '700', color: '#fff' },
  shiftHours: { fontSize: 12, color: '#666', marginTop: 2 },
  expanded: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 14,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expandedLabel: { color: '#888', fontSize: 13 },
  expandedValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1f1010',
    borderWidth: 1,
    borderColor: '#3f1010',
  },
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});