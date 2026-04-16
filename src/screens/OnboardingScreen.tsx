import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

type TipOutRole = {
  name: string;
  percentage: number;
  applies_to: 'total' | 'credit';
};

type Props = {
  onComplete: () => void;
};

const PRESET_ROLES = [
  { name: 'Barback', percentage: 10, applies_to: 'total' as const },
  { name: 'Busser', percentage: 5, applies_to: 'total' as const },
  { name: 'Door', percentage: 5, applies_to: 'total' as const },
  { name: 'Kitchen', percentage: 5, applies_to: 'total' as const },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [venueName, setVenueName] = useState('');
  const [baseHourly, setBaseHourly] = useState('');
  const [roles, setRoles] = useState<TipOutRole[]>([]);
  const [saving, setSaving] = useState(false);

  function addPreset(preset: TipOutRole) {
    if (roles.find((r) => r.name === preset.name)) return;
    setRoles([...roles, { ...preset }]);
  }

  function addBlankRole() {
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

  async function handleSave() {
    if (!venueName.trim()) {
      Alert.alert('Add a venue', 'Enter the name of the bar you work at.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('venues').insert({
      user_id: user?.id,
      name: venueName.trim(),
      tip_out_roles: roles,
      base_hourly: baseHourly ? parseFloat(baseHourly) : null,
      cc_fee_percent: null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      onComplete();
    }
  }

  async function handleSkip() {
    onComplete();
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>TipTrack</Text>
        <Text style={styles.tagline}>Know what you actually made.</Text>
      </View>

      {/* What it does */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Built for bartenders.</Text>
        <Text style={styles.cardBody}>
          Log a full shift in under 30 seconds. TipTrack calculates your real take-home after tip-outs automatically -- no more mental math at the end of a long night.
        </Text>
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>$</Text>
            <Text style={styles.featureText}>Cash + credit tips tracked separately</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>%</Text>
            <Text style={styles.featureText}>Automatic tip-out calculations</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>hr</Text>
            <Text style={styles.featureText}>Effective hourly rate per venue</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>↗</Text>
            <Text style={styles.featureText}>Analytics to spot your best shifts</Text>
          </View>
        </View>
      </View>

      {/* Tip-out explainer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How tip-outs work.</Text>
        <Text style={styles.cardBody}>
          At the end of your shift you tip out support staff -- barbacks, bussers, door staff. TipTrack does that math for you based on the percentages your bar uses, so your take-home number is always accurate.
        </Text>
      </View>

      {/* Venue setup */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Set up your first venue.</Text>
        <Text style={styles.cardBody}>You can add more later and edit everything anytime.</Text>

        <Text style={styles.fieldLabel}>BAR NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Jackalope"
          placeholderTextColor="#555"
          value={venueName}
          onChangeText={setVenueName}
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>YOUR BASE HOURLY WAGE</Text>
        <Text style={styles.fieldHint}>Your tipped minimum (e.g. $2.13 or $5.00). Optional.</Text>
        <TextInput
          style={styles.input}
          placeholder="$0.00 (optional)"
          placeholderTextColor="#555"
          keyboardType="decimal-pad"
          value={baseHourly}
          onChangeText={setBaseHourly}
        />

        <Text style={styles.fieldLabel}>TIP-OUT ROLES</Text>
        <Text style={styles.fieldHint}>Tap to add common roles or add your own.</Text>

        <View style={styles.presetRow}>
          {PRESET_ROLES.map((preset) => {
            const added = roles.find((r) => r.name === preset.name);
            return (
              <TouchableOpacity
                key={preset.name}
                style={[styles.presetChip, added && styles.presetChipActive]}
                onPress={() => addPreset(preset)}
              >
                <Text style={[styles.presetChipText, added && styles.presetChipTextActive]}>
                  {preset.name} {preset.percentage}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {roles.map((role, i) => (
          <View key={i} style={styles.roleForm}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Role"
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

        <TouchableOpacity style={styles.addRoleBtn} onPress={addBlankRole}>
          <Text style={styles.addRoleText}>+ Custom role</Text>
        </TouchableOpacity>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.saveButtonText}>Let's go</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 20 },
  header: { paddingTop: 80, paddingBottom: 32, alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: '700', color: '#f59e0b', letterSpacing: -1, marginBottom: 8 },
  tagline: { fontSize: 15, color: '#555' },
  card: {
    backgroundColor: '#111111', borderRadius: 14, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#1e1e1e',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 10 },
  cardBody: { fontSize: 14, color: '#888', lineHeight: 22, marginBottom: 4 },
  featureList: { marginTop: 14, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { fontSize: 13, color: '#f59e0b', fontWeight: '700', width: 20, textAlign: 'center' },
  featureText: { fontSize: 14, color: '#aaa' },
  fieldLabel: { fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 18, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#444', marginBottom: 8, lineHeight: 18 },
  input: {
    backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 8,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetChip: {
    borderWidth: 1, borderColor: '#1e1e1e', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0a0a0a',
  },
  presetChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  presetChipText: { color: '#666', fontSize: 13 },
  presetChipTextActive: { color: '#0a0a0a', fontWeight: '700' },
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
  saveButton: {
    backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveButtonText: { color: '#0a0a0a', fontSize: 17, fontWeight: '700' },
  skipButton: { paddingVertical: 16, alignItems: 'center' },
  skipText: { color: '#444', fontSize: 14 },
});