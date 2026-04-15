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
  Modal,
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
  const [saving, setSaving] = useState(false);

  // add form
  const [venueName, setVenueName] = useState('');
  const [baseHourly, setBaseHourly] = useState('');
  const [ccFee, setCcFee] = useState('');
  const [roles, setRoles] = useState<TipOutRole[]>([]);

  // edit modal
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [editName, setEditName] = useState('');
  const [editBaseHourly, setEditBaseHourly] = useState('');
  const [editCcFee, setEditCcFee] = useState('');
  const [editRoles, setEditRoles] = useState<TipOutRole[]>([]);
  const [editSaving, setEditSaving] = useState(false);

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

  // add form helpers
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

  // edit modal helpers
  function openEdit(venue: Venue) {
    setEditVenue(venue);
    setEditName(venue.name);
    setEditBaseHourly(venue.base_hourly != null ? String(venue.base_hourly) : '');
    setEditCcFee(venue.cc_fee_percent != null ? String(venue.cc_fee_percent) : '');
    setEditRoles(venue.tip_out_roles.map((r) => ({ ...r })));
  }

  function addEditRole() {
    setEditRoles([...editRoles, { name: '', percentage: 0, applies_to: 'total' }]);
  }

  function updateEditRole(index: number, field: keyof TipOutRole, value: string | number) {
    const updated = [...editRoles];
    (updated[index] as any)[field] = value;
    setEditRoles(updated);
  }

  function removeEditRole(index: number) {
    setEditRoles(editRoles.filter((_, i) => i !== index));
  }

  async function saveEdit() {
    if (!editName.trim()) {
      Alert.alert('Error', 'Enter a venue name.');
      return;
    }
    setEditSaving(true);
    const { error } = await supabase
      .from('venues')
      .update({
        name: editName.trim(),
        tip_out_roles: editRoles,
        base_hourly: editBaseHourly ? parseFloat(editBaseHourly) : null,
        cc_fee_percent: editCcFee ? parseFloat(editCcFee) : null,
      })
      .eq('id', editVenue!.id);
    setEditSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditVenue(null);
      fetchVenues();
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {venues.map((venue) => (
          <View key={venue.id} style={styles.venueCard}>
            <View style={styles.venueHeader}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <View style={styles.venueActions}>
                <TouchableOpacity onPress={() => openEdit(venue)} style={styles.editAction}>
                  <Text style={styles.editActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteVenue(venue.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
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
              Some bars deduct a small fee from credit tips before paying out. Most bartenders leave this blank.
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
                  onPress={() => updateRole(i, 'applies_to', role.applies_to === 'total' ? 'credit' : 'total')}
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
                {saving ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.saveBtnText}>Save Venue</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit venue modal */}
      <Modal
        visible={editVenue !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVenue(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVenue(null)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Venue</Text>
            <TouchableOpacity onPress={saveEdit} disabled={editSaving}>
              {editSaving ? (
                <ActivityIndicator color="#f59e0b" size="small" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.editLabel}>VENUE NAME</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Venue name"
              placeholderTextColor="#555"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.editLabel}>BASE HOURLY WAGE</Text>
            <Text style={styles.fieldHint}>Your tipped minimum wage at this bar</Text>
            <TextInput
              style={styles.editInput}
              placeholder="$0.00 (optional)"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={editBaseHourly}
              onChangeText={setEditBaseHourly}
            />

            <Text style={styles.editLabel}>CC PROCESSING FEE %</Text>
            <Text style={styles.fieldHint}>Most bartenders leave this blank.</Text>
            <TextInput
              style={styles.editInput}
              placeholder="e.g. 2.5 (optional)"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={editCcFee}
              onChangeText={setEditCcFee}
            />

            <Text style={styles.editLabel}>TIP-OUT ROLES</Text>
            {editRoles.map((role, i) => (
              <View key={i} style={styles.roleForm}>
                <TextInput
                  style={[styles.editInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Role (e.g. Barback)"
                  placeholderTextColor="#555"
                  value={role.name}
                  onChangeText={(v) => updateEditRole(i, 'name', v)}
                />
                <TextInput
                  style={[styles.editInput, { width: 60, marginRight: 8 }]}
                  placeholder="%"
                  placeholderTextColor="#555"
                  keyboardType="decimal-pad"
                  value={role.percentage > 0 ? String(role.percentage) : ''}
                  onChangeText={(v) => updateEditRole(i, 'percentage', parseFloat(v) || 0)}
                />
                <TouchableOpacity
                  style={styles.appliesToggle}
                  onPress={() => updateEditRole(i, 'applies_to', role.applies_to === 'total' ? 'credit' : 'total')}
                >
                  <Text style={styles.appliesText}>{role.applies_to}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeEditRole(i)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addRoleBtn} onPress={addEditRole}>
              <Text style={styles.addRoleText}>+ Add tip-out role</Text>
            </TouchableOpacity>

            <View style={{ height: 48 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 16 },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  venueCard: {
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    marginTop: 14, borderWidth: 1, borderColor: '#1e1e1e',
  },
  venueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  venueName: { fontSize: 16, fontWeight: '600', color: '#fff', flex: 1 },
  venueActions: { flexDirection: 'row', gap: 16 },
  editAction: {},
  editActionText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  deleteText: { color: '#ef4444', fontSize: 13 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaLabel: { color: '#666', fontSize: 13 },
  metaValue: { color: '#aaa', fontSize: 13 },
  noRoles: { color: '#555', fontSize: 13 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  roleText: { color: '#aaa', fontSize: 13 },
  rolePercent: { color: '#666', fontSize: 13 },
  addButton: {
    marginTop: 20, borderWidth: 1, borderColor: '#1e1e1e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 40,
  },
  addButtonText: { color: '#f59e0b', fontSize: 15, fontWeight: '600' },
  form: {
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    marginTop: 14, borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 40,
  },
  formTitle: { fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 16, marginBottom: 4 },
  fieldHint: { fontSize: 12, color: '#444', marginBottom: 8, lineHeight: 18 },
  input: {
    backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 8,
  },
  rolesLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  roleForm: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  appliesToggle: {
    backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 10,
    paddingVertical: 12, marginRight: 8, borderWidth: 1, borderColor: '#1e1e1e',
  },
  appliesText: { color: '#aaa', fontSize: 12 },
  removeBtn: { padding: 8 },
  removeText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  addRoleBtn: { paddingVertical: 10 },
  addRoleText: { color: '#f59e0b', fontSize: 14 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: '#1e1e1e',
  },
  cancelText: { color: '#666', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: '#f59e0b', paddingVertical: 13, alignItems: 'center', borderRadius: 10 },
  saveBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: '700' },
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
  editInput: {
    backgroundColor: '#111111', color: '#fff', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 8,
  },
});