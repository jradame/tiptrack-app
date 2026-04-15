import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
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

export default function VenuesScreen() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [baseHourly, setBaseHourly] = useState('');
  const [ccFee, setCcFee] = useState('');
  const [roles, setRoles] = useState<TipOutRole[]>([]);
  const [saving, setSaving] = useState(false);

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('name');
    if (data) setVenues(data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchVenues();
    }, [])
  );

  function addRole() {
    setRoles([...roles, { name: '', percentage: 0, applies_to: 'total' }]);
  }

  function updateRole(index: number, field: keyof TipOutRole, value: string | number) {
    const updated = [...roles];
    (updated[index] as any)[field] = value;
    setRoles(updated);
  }

  function removeRole(index: number) {
    setRoles(roles.filter((_, i) => i !== index));
  }

  async function saveVenue() {
    if (!venueName.trim()) {
      Alert.alert('Error', 'Enter a venue name.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('venues').insert({
      user_id: user?.id,
      name: venueName.trim(),
      tip_out_roles: roles,
      base_hourly: baseHourly ? parseFloat(baseHourly) : null,
      cc_fee_percent: ccFee ? parseFloat(ccFee) : null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setVenueName('');
      setBaseHourly('');
      setCcFee('');
      setRoles([]);
      setShowForm(false);
      fetchVenues();
    }
  }

  async function deleteVenue(id: string) {
    Alert.alert('Delete venue', 'This will not delete your logged shifts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('venues').delete().eq('id', id);
          setVenues((prev) => prev.filter((v) => v.id !== id));
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {venues.map((venue) => (
        <View key={venue.id} style={styles.venueCard}>
          <View style={styles.venueHeader}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <TouchableOpacity onPress={() => deleteVenue(venue.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>

          {venue.base_hourly != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Base hourly</Text>
              <Text style={styles.metaValue}>${venue.base_hourly.toFixed(2)}/hr</Text>
            </View>
          )}

          {venue.cc_fee_percent != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>CC processing fee</Text>
              <Text style={styles.metaValue}>{venue.cc_fee_percent}%</Text>
            </View>
          )}

          {venue.tip_out_roles.length === 0 ? (
            <Text style={styles.noRoles}>No tip-out roles</Text>
          ) : (
            venue.tip_out_roles.map((role, i) => (
              <View key={i} style={styles.roleRow}>
                <Text style={styles.roleText}>{role.name}</Text>
                <Text style={styles.rolePercent}>{role.percentage}% of {role.applies_to}</Text>
              </View>
            ))
          )}
        </View>
      ))}

      {!showForm ? (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Text style={styles.addButtonText}>+ Add Venue</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>NEW VENUE</Text>

          <TextInput
            style={styles.input}
            placeholder="Venue name"
            placeholderTextColor="#555"
            value={venueName}
            onChangeText={setVenueName}
          />

          <Text style={styles.fieldLabel}>BASE HOURLY WAGE</Text>
          <Text style={styles.fieldHint}>Your tipped minimum wage at this bar (e.g. $2.13 or $5.00)</Text>
          <TextInput
            style={styles.input}
            placeholder="$0.00 (optional)"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
            value={baseHourly}
            onChangeText={setBaseHourly}
          />

          <Text style={styles.fieldLabel}>CC PROCESSING FEE %</Text>
          <Text style={styles.fieldHint}>
            Some bars deduct a small fee from credit tips before paying out. Check your pay stub or ask your manager. Most bartenders leave this blank.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2.5 (optional)"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
            value={ccFee}
            onChangeText={setCcFee}
          />

          <Text style={styles.rolesLabel}>TIP-OUT ROLES</Text>
          {roles.map((role, i) => (
            <View key={i} style={styles.roleForm}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Role (e.g. Barback)"
                placeholderTextColor="#555"
                value={role.name}
                onChangeText={(v) => updateRole(i, 'name', v)}
              />
              <TextInput
                style={[styles.input, { width: 60, marginRight: 8 }]}
                placeholder="%"
                placeholderTextColor="#555"
                keyboardType="decimal-pad"
                value={role.percentage > 0 ? String(role.percentage) : ''}
                onChangeText={(v) => updateRole(i, 'percentage', parseFloat(v) || 0)}
              />
              <TouchableOpacity
                style={styles.appliesToggle}
                onPress={() =>
                  updateRole(i, 'applies_to', role.applies_to === 'total' ? 'credit' : 'total')
                }
              >
                <Text style={styles.appliesText}>{role.applies_to}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeRole(i)} style={styles.removeBtn}>
                <Text style={styles.removeText}>x</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addRoleBtn} onPress={addRole}>
            <Text style={styles.addRoleText}>+ Add tip-out role</Text>
          </TouchableOpacity>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowForm(false); setVenueName(''); setBaseHourly(''); setCcFee(''); setRoles([]); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveVenue} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Venue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 16 },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  venueCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  venueHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  venueName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteText: { color: '#ef4444', fontSize: 13 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaLabel: { color: '#666', fontSize: 13 },
  metaValue: { color: '#aaa', fontSize: 13 },
  noRoles: { color: '#555', fontSize: 13 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  roleText: { color: '#aaa', fontSize: 13 },
  rolePercent: { color: '#666', fontSize: 13 },
  addButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  addButtonText: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },
  form: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 40,
  },
  formTitle: { fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 16, marginBottom: 4 },
  fieldHint: { fontSize: 12, color: '#444', marginBottom: 8, lineHeight: 18 },
  input: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  rolesLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  roleForm: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  appliesToggle: {
    backgroundColor: '#1f1f1f',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  appliesText: { color: '#aaa', fontSize: 12 },
  removeBtn: { padding: 8 },
  removeText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  addRoleBtn: { paddingVertical: 10 },
  addRoleText: { color: '#3b82f6', fontSize: 14 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cancelText: { color: '#666', fontSize: 15 },
  saveBtn: {
    flex: 2,
    backgroundColor: '#3b82f6',
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});