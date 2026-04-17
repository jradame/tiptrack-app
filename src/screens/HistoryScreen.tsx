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
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';

type TipOutRole = {
  name: string;
  percentage: number;
  applies_to: 'total' | 'credit';
};

type Venue = {
  id: string;
  name: string;
  tip_out_roles: TipOutRole[];
  base_hourly: number | null;
  cc_fee_percent: number | null;
};

type Shift = {
  id: string;
  shift_date: string;
  venue_name: string;
  venue_id: string;
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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filter, setFilter] = useState<Filter>('month');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editCash, setEditCash] = useState('');
  const [editCredit, setEditCredit] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    const [shiftsRes, venuesRes] = await Promise.all([
      supabase.from('shifts').select('*').order('shift_date', { ascending: false }),
      supabase.from('venues').select('*').order('name'),
    ]);
    if (!shiftsRes.error && shiftsRes.data) setShifts(shiftsRes.data);
    if (!venuesRes.error && venuesRes.data) setVenues(venuesRes.data);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  async function exportCSV() {
    if (shifts.length === 0) {
      Alert.alert('No shifts', 'Log some shifts before exporting.');
      return;
    }
    setExporting(true);
    try {
      const headers = [
        'Date',
        'Venue',
        'Hours',
        'Cash Tips',
        'Credit Tips',
        'Total Tip Out',
        'Take Home',
        'Effective Hourly',
      ];

      const rows = shifts.map((s) => {
        const effectiveHourly = s.hours > 0 ? (s.take_home / s.hours).toFixed(2) : '0.00';
        return [
          s.shift_date,
          `"${s.venue_name}"`,
          s.hours,
          s.cash_tips.toFixed(2),
          s.credit_tips.toFixed(2),
          s.total_tip_out.toFixed(2),
          s.take_home.toFixed(2),
          effectiveHourly,
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const filename = `TipTrack_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: 'utf8' as any,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export TipTrack Data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Exported', `Saved to ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
    setExporting(false);
  }

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
          setExpanded(null);
        },
      },
    ]);
  }

  function openEdit(shift: Shift) {
    const venue = venues.find((v) => v.id === shift.venue_id) || venues[0] || null;
    setEditShift(shift);
    setEditVenue(venue);
    setEditDate(shift.shift_date);
    setEditHours(String(shift.hours));
    setEditCash(String(shift.cash_tips));
    setEditCredit(String(shift.credit_tips));
  }

  function calcEditTipOuts(): { role: string; amount: number }[] {
    if (!editVenue) return [];
    const cash = parseFloat(editCash) || 0;
    const credit = parseFloat(editCredit) || 0;
    const total = cash + credit;
    return editVenue.tip_out_roles.map((role) => {
      const base = role.applies_to === 'credit' ? credit : total;
      return { role: role.name, amount: parseFloat(((base * role.percentage) / 100).toFixed(2)) };
    });
  }

  function calcEditCcFee() {
    if (!editVenue?.cc_fee_percent) return 0;
    const credit = parseFloat(editCredit) || 0;
    return parseFloat(((credit * editVenue.cc_fee_percent) / 100).toFixed(2));
  }

  function calcEditWage() {
    if (!editVenue?.base_hourly) return 0;
    const hrs = parseFloat(editHours) || 0;
    return parseFloat((hrs * editVenue.base_hourly).toFixed(2));
  }

  function calcEditTakeHome() {
    const cash = parseFloat(editCash) || 0;
    const credit = parseFloat(editCredit) || 0;
    const tipOut = calcEditTipOuts().reduce((sum, t) => sum + t.amount, 0);
    const ccFee = calcEditCcFee();
    const wage = calcEditWage();
    return cash + (credit - ccFee) - tipOut + wage;
  }

  async function saveEdit() {
    if (!editShift || !editDate || !editHours || !editVenue) {
      Alert.alert('Missing info', 'Date, hours, and venue are required.');
      return;
    }
    setSaving(true);
    const tipOuts = calcEditTipOuts();
    const totalTipOut = tipOuts.reduce((sum, t) => sum + t.amount, 0);
    const takeHome = calcEditTakeHome();
    const { error } = await supabase
      .from('shifts')
      .update({
        venue_id: editVenue.id,
        venue_name: editVenue.name,
        shift_date: editDate,
        hours: parseFloat(editHours),
        cash_tips: parseFloat(editCash) || 0,
        credit_tips: parseFloat(editCredit) || 0,
        tip_outs: tipOuts,
        total_tip_out: totalTipOut,
        take_home: takeHome,
      })
      .eq('id', editShift.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditShift(null);
      fetchData();
    }
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
  const editTakeHome = calcEditTakeHome();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f59e0b" />
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
        <TouchableOpacity style={styles.exportBtn} onPress={exportCSV} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color="#f59e0b" size="small" />
          ) : (
            <Text style={styles.exportBtnText}>CSV</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#f59e0b"
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
                    <Text style={[styles.expandedValue, { color: '#f59e0b' }]}>${effectiveHourly(shift)}/hr</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(shift)}>
                      <Text style={styles.editBtnText}>Edit shift</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteShift(shift.id)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal
        visible={editShift !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditShift(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditShift(null)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Shift</Text>
            <TouchableOpacity onPress={saveEdit} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#f59e0b" size="small" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.editLabel}>VENUE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueRow}>
              {venues.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.venueChip, editVenue?.id === v.id && styles.venueChipActive]}
                  onPress={() => setEditVenue(v)}
                >
                  <Text style={[styles.venueChipText, editVenue?.id === v.id && styles.venueChipTextActive]}>
                    {v.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.editLabel}>DATE</Text>
            <TextInput
              style={styles.editInput}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
            />

            <Text style={styles.editLabel}>HOURS WORKED</Text>
            <TextInput
              style={styles.editInput}
              value={editHours}
              onChangeText={setEditHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 6.5"
              placeholderTextColor="#555"
            />

            <Text style={styles.editLabel}>CASH TIPS</Text>
            <TextInput
              style={styles.editInput}
              value={editCash}
              onChangeText={setEditCash}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor="#555"
            />

            <Text style={styles.editLabel}>CREDIT TIPS</Text>
            <TextInput
              style={styles.editInput}
              value={editCredit}
              onChangeText={setEditCredit}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor="#555"
            />

            <View style={styles.editTakeHomeBox}>
              <Text style={styles.editTakeHomeLabel}>UPDATED TAKE-HOME</Text>
              <Text style={styles.editTakeHomeAmount}>${editTakeHome.toFixed(2)}</Text>
            </View>

            <View style={{ height: 48 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: '#111111',
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#1e1e1e',
  },
  filterChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  filterText: { color: '#666', fontSize: 11, letterSpacing: 1 },
  filterTextActive: { color: '#0a0a0a', fontWeight: '700' },
  filterTotal: { marginLeft: 'auto', color: '#fff', fontWeight: '700', fontSize: 16 },
  exportBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#3a2e10', backgroundColor: '#1a1a0a',
  },
  exportBtnText: { color: '#f59e0b', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 15 },
  shiftCard: {
    backgroundColor: '#111111', marginHorizontal: 16, marginTop: 10,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e1e1e',
  },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shiftLeft: { flex: 1 },
  shiftVenue: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  shiftDate: { fontSize: 12, color: '#666' },
  shiftRight: { alignItems: 'flex-end' },
  shiftAmount: { fontSize: 20, fontWeight: '700', color: '#fff' },
  shiftHours: { fontSize: 12, color: '#666', marginTop: 2 },
  expanded: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#1e1e1e', paddingTop: 14 },
  expandedRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  expandedLabel: { color: '#888', fontSize: 13 },
  expandedValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: {
    flex: 2, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
    backgroundColor: '#1a1a0a', borderWidth: 1, borderColor: '#3a2e10',
  },
  editBtnText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
    backgroundColor: '#1f1010', borderWidth: 1, borderColor: '#3f1010',
  },
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#111111',
  },
  modalCancel: { color: '#666', fontSize: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalSave: { color: '#f59e0b', fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1, paddingHorizontal: 20 },
  editLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 20, marginBottom: 8 },
  venueRow: { flexDirection: 'row', marginBottom: 4 },
  venueChip: {
    borderWidth: 1, borderColor: '#1e1e1e', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: '#111111',
  },
  venueChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  venueChipText: { color: '#666', fontSize: 14 },
  venueChipTextActive: { color: '#0a0a0a', fontWeight: '700' },
  editInput: {
    backgroundColor: '#111111', color: '#fff', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  editTakeHomeBox: { alignItems: 'center', paddingVertical: 32, marginTop: 16 },
  editTakeHomeLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 10 },
  editTakeHomeAmount: { fontSize: 48, fontWeight: '700', color: '#f59e0b' },
});