// VIEW layer — pure rendering, zero API calls.
// All data comes from TicketPresenter via useTickets().
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTickets } from '../../presenters/TicketPresenter';
import { Mascot } from '../../../components/Mascot';
import type { Ticket } from '../../entities/Ticket';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s.statCard, { borderColor: color + '44' }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function RecentRow({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const is4D   = ticket.gameType === '4D';
  const accent = is4D ? '#4a8fff' : '#7b9fff';
  const text   = is4D ? '#4a8fff' : '#7b9fff';
  return (
    <TouchableOpacity style={s.recentRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.recentIcon, { backgroundColor: accent + '22' }]}>
        <Text style={s.recentIconText}>{is4D ? '🎰' : '🎱'}</Text>
      </View>
      <View style={s.recentInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={[s.badge, { backgroundColor: accent + '22', borderColor: accent }]}>
            <Text style={[s.badgeText, { color: text }]}>{ticket.gameType}</Text>
          </View>
          <Text style={s.recentBet}>{ticket.betType}</Text>
        </View>
        <Text style={s.recentNums} numberOfLines={1}>
          {ticket.numbers?.slice(0, 4).join(' · ') || 'No numbers'}
          {(ticket.numbers?.length ?? 0) > 4 ? ` +${(ticket.numbers?.length ?? 0) - 4}` : ''}
        </Text>
      </View>
      <Text style={s.recentTime}>{timeAgo(ticket.uploadedAt ?? null)}</Text>
    </TouchableOpacity>
  );
}

// ── View ─────────────────────────────────────────────────────────────────────

export function HomeView() {
  const { tickets, loading, refreshing, refresh } = useTickets();
  const router = useRouter();

  const recent    = tickets.slice(0, 5);
  const count4D   = tickets.filter(t => t.gameType === '4D').length;
  const countTOTO = tickets.filter(t => t.gameType === 'TOTO').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#4a8fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.logoRow}>
            <View style={s.logoBox}><Text style={s.logoText}>4T</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.appName}>SGLottery</Text>
              <Text style={s.appSub}>Singapore 4D & TOTO Scanner</Text>
            </View>
            <Mascot state="idle" size={58} />
          </View>

          <Text style={s.heroTitle}>
            Scan. Extract.{'\n'}
            <Text style={{ color: '#4a8fff' }}>Know your numbers.</Text>
          </Text>
          <Text style={s.heroDesc}>
            Upload any 4D or TOTO ticket — our AI extracts every detail instantly.
          </Text>

          <View style={s.ctaRow}>
            <TouchableOpacity style={[s.ctaBtn, s.ctaPrimary]} onPress={() => router.push('/tabs/upload' as any)} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>📸  Scan Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaBtn, s.ctaSecondary]} onPress={() => router.push('/tabs/history' as any)} activeOpacity={0.85}>
              <Text style={[s.ctaBtnText, { color: '#f0f6fc' }]}>📋  History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats ─────────────────────────────────────────── */}
        {!loading && tickets.length > 0 && (
          <View style={s.statsRow}>
            <StatCard label="Scanned" value={tickets.length} color="#4a8fff" />
            <StatCard label="4D"      value={count4D}        color="#4a8fff" />
            <StatCard label="TOTO"    value={countTOTO}      color="#7b9fff" />
          </View>
        )}

        {/* ── Games ─────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Supported Games</Text>
        <View style={s.gamesRow}>
          <View style={[s.gameCard, { borderLeftColor: '#4a8fff' }]}>
            <Text style={s.gameEmoji}>🎰</Text>
            <Text style={[s.gameType, { color: '#4a8fff' }]}>4D</Text>
            <Text style={s.gameFeatures}>{'Ordinary & iBet\nRoll entries\nBig / Small bets'}</Text>
          </View>
          <View style={[s.gameCard, { borderLeftColor: '#7b9fff' }]}>
            <Text style={s.gameEmoji}>🎱</Text>
            <Text style={[s.gameType, { color: '#7b9fff' }]}>TOTO</Text>
            <Text style={s.gameFeatures}>{'System 7–12\nQuick Pick\niTOTO format'}</Text>
          </View>
        </View>

        {/* ── Recent Tickets ────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { paddingHorizontal: 0, paddingTop: 0, marginBottom: 0 }]}>Recent Tickets</Text>
          <TouchableOpacity onPress={() => router.push('/tabs/history' as any)}>
            <Text style={s.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.skeletonWrap}>
            {[0, 1, 2].map(i => <View key={i} style={s.skeleton} />)}
          </View>
        ) : recent.length === 0 ? (
          <View style={s.emptyWrap}>
            <Mascot state="sleeping" size={76} />
            <Text style={[s.emptyText, { marginTop: 16 }]}>No tickets yet</Text>
            <TouchableOpacity onPress={() => router.push('/tabs/upload' as any)}>
              <Text style={s.emptyLink}>Scan your first ticket →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.recentList}>
            {recent.map(t => (
              <RecentRow key={t.id} ticket={t} onPress={() => router.push('/tabs/history' as any)} />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f1117' },
  scroll:  { flex: 1 },
  content: { paddingBottom: 40 },

  hero: { padding: 24, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#2a2f45' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4a8fff', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  appName:  { fontSize: 20, fontWeight: '800', color: '#f0f6fc' },
  appSub:   { fontSize: 12, color: '#8b949e' },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#f0f6fc', lineHeight: 36, marginBottom: 10 },
  heroDesc:  { fontSize: 15, color: '#8b949e', lineHeight: 22, marginBottom: 24 },
  ctaRow:    { flexDirection: 'row', gap: 12 },
  ctaBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaPrimary:   { backgroundColor: '#4a8fff' },
  ctaSecondary: { backgroundColor: '#181c2a', borderWidth: 1, borderColor: '#30363d' },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  statCard:  { flex: 1, backgroundColor: '#181c2a', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#8b949e', marginTop: 2, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 28, marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: '800', color: '#f0f6fc', paddingHorizontal: 20, paddingTop: 28, marginBottom: 12 },
  seeAll: { fontSize: 14, color: '#4a8fff', fontWeight: '600' },

  gamesRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: -4 },
  gameCard: { flex: 1, backgroundColor: '#181c2a', borderRadius: 12, padding: 16, borderLeftWidth: 3, borderWidth: 1, borderColor: '#2a2f45' },
  gameEmoji:    { fontSize: 28, marginBottom: 8 },
  gameType:     { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  gameFeatures: { fontSize: 12, color: '#8b949e', lineHeight: 20 },

  recentList: { paddingHorizontal: 20 },
  recentRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#181c2a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2f45' },
  recentIcon:     { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentIconText: { fontSize: 20 },
  recentInfo:     { flex: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  recentBet:  { fontSize: 12, color: '#8b949e' },
  recentNums: { fontSize: 13, color: '#c9d1d9' },
  recentTime: { fontSize: 11, color: '#8b949e' },

  skeletonWrap: { paddingHorizontal: 20 },
  skeleton: { height: 72, borderRadius: 12, marginBottom: 10, backgroundColor: '#181c2a' },
  emptyWrap: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: '#8b949e', marginBottom: 8 },
  emptyLink: { fontSize: 14, color: '#4a8fff', fontWeight: '600' },
});
