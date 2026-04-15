import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

export default function LogShiftScreen() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [shiftDate, setShiftDate] = useState(todayStr());
  const [hours, setHours] = useState('');
  const [cashTips, setCashTips] = useState('');
  const [creditTips, setCreditTips] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchVenues();
    }, [])
  );

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('name');
    if (data) {
      setVenues(data);
      if (data.length > 0 && !selectedVenue) setSelectedVenue(data[0]);
    }
  }

  function calcTipOuts(): { role: string; amount: number }[] {
    if (!selectedVenue) return [];
    const cash = parseFloat(cashTips) || 0;
    const credit = parseFloat(creditTips) || 0;
    const total = cash + credit;
    return selectedVenue.tip_out_roles.map((role) => {
      const base = role.applies_to === 'credit' ? credit : total;
      return { role: role.name, amount: parseFloat(((base * role.percentage) / 100).toFixed(2)) };
    });
  }

  function calcCcFee() {
    if (!selectedVenue?.cc_fee_percent) return 0;
    const credit = parseFloat(creditTips) || 0;
    return parseFloat(((credit * selectedVenue.cc_fee_percent) / 100).toFixed(2));
  }

  function calcWageEarnings() {
    if (!selectedVenue?.base_hourly) return 0;
    const hrs = parseFloat(hours) || 0;
    return parseFloat((hrs * selectedVenue.base_hourly).toFixed(2));
  }

  function totalTipOut() {
    return calcTipOuts().reduce((sum, t) => sum + t.amount, 0);
  }

  function calcTakeHome() {
    const cash = parseFloat(cashTips) || 0;
    const credit = parseFloat(creditTips) || 0;
    const ccFee = calcCcFee();
    const tipOut = totalTipOut();
    const wage = calcWageEarnings();
    return cash + (credit - ccFee) - tipOut + wage;
  }

  async function handleSave() {
    if (!selectedVenue) {
      Alert.alert('No venue', 'Add a venue first in the Venues tab.');
      return;
    }
    if (!hours || !shiftDate) {
      Alert.alert('Missing info', 'Enter hours and date.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const tipOuts = calcTipOuts();
    const { error } = await supabase.from('shifts').insert({
      user_id: user?.id,
      venue_id: selectedVenue.id,
      venue_name: selectedVenue.name,
      shift_date: shiftDate,
      hours: parseFloat(hours),
      cash_tips: parseFloat(cashTips) || 0,
      credit_tips: parseFloat(creditTips) || 0,
      tip_outs: tipOuts,
      total_tip_out: totalTipOut(),
      take_home: calcTakeHome(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Saved', 'Shift logged.');
      setHours('');
      setCashTips('');
      setCreditTips('');
      setShiftDate(todayStr());
    }
  }

  const takeHome = calcTakeHome();
  const tipOuts = calcTipOuts();
  const ccFee = calcCcFee();
  const wageEarnings = calcWageEarnings();
  const hasCcFee = ccFee > 0;
  const hasWage = wageEarnings > 0;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>VENUE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueRow}>
        {venues.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[styles.venueChip, selectedVenue?.id === v.id && styles.venueChipActive]}
            onPress={() => setSelectedVenue(v)}
          >
            <Text style={[styles.venueChipText, selectedVenue?.id === v.id && styles.venueChipTextActive]}>
              {v.name}
            </Text>
          </TouchableOpacity>
        ))}
        {venues.length === 0 && (
          <Text style={styles.noVenue}>Add a venue in the Venues tab first.</Text>
        )}
      </ScrollView>

      <Text style={styles.sectionLabel}>DATE</Text>
      <TextInput
        style={styles.input}
        value={shiftDate}
        onChangeText={setShiftDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#555"
      />

      <Text style={styles.sectionLabel}>HOURS WORKED</Text>
      <TextInput
        style={styles.input}
        value={hours}
        onChangeText={setHours}
        keyboardType="decimal-pad"
        placeholder="e.g. 6.5"
        placeholderTextColor="#555"
      />

      <Text style={styles.sectionLabel}>CASH TIPS</Text>
      <Text style={styles.fieldHint}>What you walked out with tonight.</Text>
      <TextInput
        style={styles.input}
        value={cashTips}
        onChangeText={setCashTips}
        keyboardType="decimal-pad"
        placeholder="$0.00"
        placeholderTextColor="#555"
      />

      <Text style={styles.sectionLabel}>CREDIT TIPS</Text>
      <Text style={styles.fieldHint}>Only if your bar pays credit tips the same night. Most don't -- leave blank.</Text>
      <TextInput
        style={styles.input}
        value={creditTips}
        onChangeText={setCreditTips}
        keyboardType="decimal-pad"
        placeholder="$0.00 (optional)"
        placeholderTextColor="#555"
      />

      {(tipOuts.length > 0 || hasCcFee || hasWage) && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>BREAKDOWN</Text>
          {hasWage && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Base wage ({selectedVenue?.base_hourly?.toFixed(2)}/hr x {hours}hr)</Text>
              <Text style={styles.breakdownGreen}>+${wageEarnings.toFixed(2)}</Text>
            </View>
          )}
          {hasCcFee && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>CC processing fee ({selectedVenue?.cc_fee_percent}%)</Text>
              <Text style={styles.breakdownRed}>-${ccFee.toFixed(2)}</Text>
            </View>
          )}
          {tipOuts.map((t) => (
            <View key={t.role} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{t.role} tip out</Text>
              <Text style={styles.breakdownRed}>-${t.amount.toFixed(2)}</Text>
            </View>
          ))}
          {tipOuts.length > 0 && (
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownLabel}>Total tip out</Text>
              <Text style={styles.breakdownRed}>-${totalTipOut().toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.takeHomeBox}>
        <Text style={styles.takeHomeLabel}>YOUR TAKE-HOME</Text>
        <Text style={styles.takeHomeAmount}>${takeHome.toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.saveButtonText}>Log Shift</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 24, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#444', marginBottom: 8, lineHeight: 18 },
  venueRow: { flexDirection: 'row', marginBottom: 4 },
  venueChip: {
    borderWidth: 1, borderColor: '#1e1e1e', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: '#111111',
  },
  venueChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  venueChipText: { color: '#666', fontSize: 14 },
  venueChipTextActive: { color: '#0a0a0a', fontWeight: '700' },
  noVenue: { color: '#555', fontSize: 13, paddingVertical: 8 },
  input: {
    backgroundColor: '#111111', color: '#fff', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  breakdown: {
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    marginTop: 24, borderWidth: 1, borderColor: '#1e1e1e',
  },
  breakdownTitle: { fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: '#1e1e1e', paddingTop: 10, marginTop: 4 },
  breakdownLabel: { color: '#aaa', fontSize: 13, flex: 1, paddingRight: 8 },
  breakdownGreen: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  breakdownRed: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  takeHomeBox: { alignItems: 'center', paddingVertical: 32, marginTop: 16 },
  takeHomeLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 10 },
  takeHomeAmount: { fontSize: 52, fontWeight: '700', color: '#f59e0b' },
  saveButton: {
    backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 48,
  },
  saveButtonText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
});