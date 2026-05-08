import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  Dimensions,
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
  track_sales: boolean | null;
};

type ShiftType = 'day' | 'night';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function LogShiftScreen() {
  const dateRef = useRef<TextInput>(null);
  const hoursRef = useRef<TextInput>(null);
  const cashTipsRef = useRef<TextInput>(null);
  const creditTipsRef = useRef<TextInput>(null);
  const salesRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [shiftDate, setShiftDate] = useState(todayStr());
  const [shiftType, setShiftType] = useState<ShiftType>('night');
  const [hours, setHours] = useState('');
  const [cashTips, setCashTips] = useState('');
  const [creditTips, setCreditTips] = useState('');
  const [sales, setSales] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedInputIndex, setFocusedInputIndex] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const showSales = selectedVenue?.track_sales === true;

  const inputRefs = useMemo(() => {
    return showSales
      ? [dateRef, hoursRef, cashTipsRef, creditTipsRef, salesRef, notesRef]
      : [dateRef, hoursRef, cashTipsRef, creditTipsRef, notesRef];
  }, [showSales]);

  useEffect(() => {
    const handleKeyboardShow = (event: any) => {
      const screenHeight = Dimensions.get('window').height;
      const keyboardTopY = event.endCoordinates?.screenY ?? screenHeight;
      const height = Math.max(screenHeight - keyboardTopY, 0);

      setKeyboardHeight(height);
      setKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVenues();
    }, [])
  );

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('name');

    if (data) {
      setVenues(data);

      if (data.length > 0 && !selectedVenue) {
        setSelectedVenue(data[0]);
      }
    }
  }

  function focusPreviousInput() {
    const previousIndex = Math.max(focusedInputIndex - 1, 0);
    setFocusedInputIndex(previousIndex);

    requestAnimationFrame(() => {
      inputRefs[previousIndex]?.current?.focus();
    });
  }

  function focusNextInput() {
    const nextIndex = Math.min(focusedInputIndex + 1, inputRefs.length - 1);
    setFocusedInputIndex(nextIndex);

    requestAnimationFrame(() => {
      inputRefs[nextIndex]?.current?.focus();
    });
  }

  function dismissKeyboard() {
    inputRefs[focusedInputIndex]?.current?.blur();
    Keyboard.dismiss();
  }

  function focusProps(index: number) {
    return {
      onFocus: () => setFocusedInputIndex(index),
      autoCorrect: false,
      spellCheck: false,
      autoComplete: 'off' as const,
      textContentType: 'none' as const,
      importantForAutofill: 'no' as const,
    };
  }

  function calcTipOuts(): { role: string; amount: number }[] {
    if (!selectedVenue) return [];

    const cash = parseFloat(cashTips) || 0;
    const credit = parseFloat(creditTips) || 0;
    const total = cash + credit;

    return selectedVenue.tip_out_roles.map((role) => {
      const base = role.applies_to === 'credit' ? credit : total;

      return {
        role: role.name,
        amount: parseFloat(((base * role.percentage) / 100).toFixed(2)),
      };
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const tipOuts = calcTipOuts();

    const { error } = await supabase.from('shifts').insert({
      user_id: user?.id,
      venue_id: selectedVenue.id,
      venue_name: selectedVenue.name,
      shift_date: shiftDate,
      shift_type: shiftType,
      hours: parseFloat(hours),
      cash_tips: parseFloat(cashTips) || 0,
      credit_tips: parseFloat(creditTips) || 0,
      sales: parseFloat(sales) || null,
      tip_outs: tipOuts,
      total_tip_out: totalTipOut(),
      take_home: calcTakeHome(),
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Saved', 'Shift logged.');
      setHours('');
      setCashTips('');
      setCreditTips('');
      setSales('');
      setNotes('');
      setShiftDate(todayStr());
      setShiftType('night');
    }
  }

  const takeHome = calcTakeHome();
  const tipOuts = calcTipOuts();
  const ccFee = calcCcFee();
  const wageEarnings = calcWageEarnings();
  const hasCcFee = ccFee > 0;
  const hasWage = wageEarnings > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardVisible && styles.scrollContentKeyboardOpen,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets={false}
        automaticallyAdjustContentInsets={false}
      >
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
          ref={dateRef}
          style={styles.input}
          value={shiftDate}
          onChangeText={setShiftDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#555"
          keyboardAppearance="dark"
          {...focusProps(0)}
        />

        <Text style={styles.sectionLabel}>SHIFT TYPE</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, shiftType === 'day' && styles.toggleButtonActive]}
            onPress={() => setShiftType('day')}
          >
            <Text style={[styles.toggleText, shiftType === 'day' && styles.toggleTextActive]}>
              ☀️ Day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, shiftType === 'night' && styles.toggleButtonActive]}
            onPress={() => setShiftType('night')}
          >
            <Text style={[styles.toggleText, shiftType === 'night' && styles.toggleTextActive]}>
              🌙 Night
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>HOURS WORKED</Text>
        <TextInput
          ref={hoursRef}
          style={styles.input}
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="e.g. 6.5"
          placeholderTextColor="#555"
          keyboardAppearance="dark"
          {...focusProps(1)}
        />

        <Text style={styles.sectionLabel}>CASH TIPS</Text>
        <Text style={styles.fieldHint}>What you walked out with tonight.</Text>
        <TextInput
          ref={cashTipsRef}
          style={styles.input}
          value={cashTips}
          onChangeText={setCashTips}
          keyboardType="decimal-pad"
          placeholder="$0.00"
          placeholderTextColor="#555"
          keyboardAppearance="dark"
          {...focusProps(2)}
        />

        <Text style={styles.sectionLabel}>CREDIT TIPS</Text>
        <Text style={styles.fieldHint}>
          Only if your bar pays credit tips the same night. Most don't, leave blank.
        </Text>
        <TextInput
          ref={creditTipsRef}
          style={styles.input}
          value={creditTips}
          onChangeText={setCreditTips}
          keyboardType="decimal-pad"
          placeholder="$0.00 (optional)"
          placeholderTextColor="#555"
          keyboardAppearance="dark"
          {...focusProps(3)}
        />

        {showSales && (
          <>
            <Text style={styles.sectionLabel}>SALES</Text>
            <Text style={styles.fieldHint}>Total sales for the shift optional.</Text>
            <TextInput
              ref={salesRef}
              style={styles.input}
              value={sales}
              onChangeText={setSales}
              keyboardType="decimal-pad"
              placeholder="$0.00 (optional)"
              placeholderTextColor="#555"
              keyboardAppearance="dark"
              {...focusProps(4)}
            />
          </>
        )}

        <Text style={styles.sectionLabel}>NOTES</Text>
        <TextInput
          ref={notesRef}
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering about this shift... (optional)"
          placeholderTextColor="#555"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          keyboardAppearance="dark"
          {...focusProps(showSales ? 5 : 4)}
        />

        {(tipOuts.length > 0 || hasCcFee || hasWage) && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>BREAKDOWN</Text>

            {hasWage && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Base wage (${selectedVenue?.base_hourly?.toFixed(2)}/hr x {hours}hr)
                </Text>
                <Text style={styles.breakdownGreen}>+${wageEarnings.toFixed(2)}</Text>
              </View>
            )}

            {hasCcFee && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  CC processing fee ({selectedVenue?.cc_fee_percent}%)
                </Text>
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
          {saving ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.saveButtonText}>Log Shift</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {keyboardVisible && (
        <View
          pointerEvents="box-none"
          style={[
            styles.keyboardToolbarWrapper,
            {
              bottom: keyboardHeight,
            },
          ]}
        >
          <View style={styles.keyboardToolbar}>
            <TouchableOpacity
              onPress={focusPreviousInput}
              disabled={focusedInputIndex === 0}
              style={styles.toolbarButton}
            >
              <Text
                style={[
                  styles.toolbarButtonText,
                  focusedInputIndex === 0 && styles.toolbarButtonDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={focusNextInput}
              disabled={focusedInputIndex === inputRefs.length - 1}
              style={styles.toolbarButton}
            >
              <Text
                style={[
                  styles.toolbarButtonText,
                  focusedInputIndex === inputRefs.length - 1 && styles.toolbarButtonDisabled,
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>

            <View style={styles.toolbarSpacer} />

            <TouchableOpacity onPress={dismissKeyboard} style={styles.toolbarButton}>
              <Text style={styles.toolbarButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scrollContentKeyboardOpen: {
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: '#444',
    marginBottom: 8,
    lineHeight: 18,
  },
  venueRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  venueChip: {
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#111111',
  },
  venueChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  venueChipText: {
    color: '#666',
    fontSize: 14,
  },
  venueChipTextActive: {
    color: '#0a0a0a',
    fontWeight: '700',
  },
  noVenue: {
    color: '#555',
    fontSize: 13,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: '#111111',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  notesInput: {
    height: 90,
    paddingTop: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#0a0a0a',
    fontWeight: '700',
  },
  breakdown: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  breakdownTitle: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
    paddingTop: 10,
    marginTop: 4,
  },
  breakdownLabel: {
    color: '#aaa',
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  breakdownGreen: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownRed: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  takeHomeBox: {
    alignItems: 'center',
    paddingVertical: 32,
    marginTop: 16,
  },
  takeHomeLabel: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 10,
  },
  takeHomeAmount: {
    fontSize: 52,
    fontWeight: '700',
    color: '#f59e0b',
  },
  saveButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 48,
  },
  saveButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
  },
  keyboardToolbarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  keyboardToolbar: {
    height: 44,
    backgroundColor: '#1a1a1a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  toolbarButton: {
    height: 44,
    justifyContent: 'center',
    paddingRight: 28,
  },
  toolbarButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
  },
  toolbarButtonDisabled: {
    color: '#444',
  },
  toolbarSpacer: {
    flex: 1,
  },
});