import React, { useState } from 'react';
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg:      '#0f1117',
  surface: '#181c2a',
  border:  '#2a2f45',
  blue:    '#4a8fff',
  gold:    '#4a8fff',
  text:    '#f0f6fc',
  sub:     '#8b9bbf',
  white:   '#ffffff',
  green:   '#22c55e',
  red:     '#f87171',
};

const REMIND_OPTIONS = [
  { value: '60',   label: '1 hour before draw'    },
  { value: '30',   label: '30 minutes before draw' },
  { value: '1440', label: 'Day before draw'         },
];

// ── Toggle component matching SP style ────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function Divider() {
  return <View style={s.divider} />;
}

function SettingRow({ label, sub, right }: { label: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// ── Main settings screen ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [enabled,    setEnabled]    = useState(true);
  const [games4D,    setGames4D]    = useState(true);
  const [gamesToto,  setGamesToto]  = useState(true);
  const [remindIdx,  setRemindIdx]  = useState(0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* ── Lottery Reminder ───────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Lottery Reminder</Text>
          <Divider />

          {/* Enable toggle */}
          <SettingRow
            label="Enable reminders"
            right={
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#2a2f45', true: C.blue }}
                thumbColor={C.white}
                ios_backgroundColor="#2a2f45"
              />
            }
          />

          {enabled && (
            <>
              <Divider />

              {/* Games */}
              <Text style={s.groupLabel}>Games</Text>
              <View style={s.checkRow}>
                <TouchableOpacity style={s.checkItem} onPress={() => setGames4D(v => !v)}>
                  <View style={[s.checkbox, games4D && s.checkboxChecked]}>
                    {games4D && <Text style={s.checkmark}>✓</Text>}
                  </View>
                  <Text style={s.checkLabel}>4D</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.checkItem} onPress={() => setGamesToto(v => !v)}>
                  <View style={[s.checkbox, gamesToto && s.checkboxChecked]}>
                    {gamesToto && <Text style={s.checkmark}>✓</Text>}
                  </View>
                  <Text style={s.checkLabel}>Toto</Text>
                </TouchableOpacity>
              </View>

              <Divider />

              {/* Remind me */}
              <Text style={s.groupLabel}>Remind me</Text>
              {REMIND_OPTIONS.map((opt, i) => (
                <TouchableOpacity key={opt.value} style={s.remindOption} onPress={() => setRemindIdx(i)}>
                  <Text style={[s.remindLabel, remindIdx === i && s.remindLabelActive]}>
                    {opt.label}
                  </Text>
                  {i < REMIND_OPTIONS.length - 1 && <View style={s.remindDivider} />}
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* ── Draw Result Notifications ──────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Draw Result Notifications</Text>
          <Divider />

          <View style={s.infoBox}>
            <Text style={s.infoIcon}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>Automatic result checking</Text>
              <Text style={s.infoText}>
                When you upload a ticket for an upcoming draw, we automatically check the result
                once it&apos;s released. If you won, you&apos;ll receive an instant notification
                to claim your prize.
              </Text>
            </View>
          </View>

          <Divider />
          <SettingRow
            label="Draw result alerts"
            sub="Notify when 4D &amp; TOTO results are released"
            right={
              <Switch
                value={enabled && (games4D || gamesToto)}
                onValueChange={() => {}}
                trackColor={{ false: '#2a2f45', true: C.blue }}
                thumbColor={C.white}
                ios_backgroundColor="#2a2f45"
                disabled
              />
            }
          />
          <SettingRow
            label="Win notification"
            sub="Instant alert if your ticket wins"
            right={
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#2a2f45', true: C.blue }}
                thumbColor={C.white}
                ios_backgroundColor="#2a2f45"
                disabled
              />
            }
          />
        </View>

        {/* ── About ─────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>About</Text>
          <Divider />
          <SettingRow label="SGLottery Tracker" sub="v2.0.0" />
          <SettingRow label="Draw schedules" sub="4D: Wed, Sat, Sun  ·  TOTO: Mon, Thu" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 17, fontWeight: '700', color: C.blue,
    padding: 16, paddingBottom: 12,
  },

  divider: { height: 1, backgroundColor: C.border },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowLabel: { fontSize: 15, color: C.text, fontWeight: '500' },
  rowSub:   { fontSize: 12, color: C.sub, marginTop: 2 },

  groupLabel: {
    fontSize: 13, fontWeight: '700', color: C.text,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },

  checkRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 10, gap: 28,
  },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: C.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.blue },
  checkmark: { color: C.white, fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 15, color: C.text },

  remindOption: { paddingHorizontal: 16, paddingVertical: 14 },
  remindLabel:  { fontSize: 15, color: C.sub },
  remindLabelActive: { color: C.text, fontWeight: '600' },
  remindDivider: { height: 1, backgroundColor: C.border, marginTop: 14 },

  infoBox: {
    flexDirection: 'row', gap: 12,
    padding: 16, backgroundColor: 'rgba(74,143,255,0.08)',
  },
  infoIcon:  { fontSize: 22, marginTop: 2 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  infoText:  { fontSize: 13, color: C.sub, lineHeight: 19 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12 },
});
