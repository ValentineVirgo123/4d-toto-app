// VIEW layer — full ticket history with image thumbnails, sorting, filtering, detail sheet.
import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  RefreshControl, StatusBar, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTickets } from '../../presenters/TicketPresenter';
import { Mascot } from '../../../components/Mascot';
import type { Ticket } from '../../entities/Ticket';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#0f1117',
  surface: '#181c2a',
  surface2:'#1e2235',
  border:  '#2a2f45',
  red:     '#4a8fff',
  purple:  '#4a8fff',
  gold:    '#4a8fff',
  green:   '#22c55e',
  text:    '#f0f6fc',
  text2:   '#c9d1d9',
  muted:   '#8b9bbf',
  white:   '#ffffff',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(raw?: string): Date | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3]); if (y < 100) y += 2000;
  return new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
}

function fmtDate(raw?: string): string {
  if (!raw) return '—';
  const d = parseDate(raw);
  return d ? d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : raw;
}

function sortScore(t: Ticket): number {
  if (t.ticketPurchaseDate) { const d = parseDate(t.ticketPurchaseDate); if (d) return d.getTime(); }
  return t.uploadedAt ? new Date(t.uploadedAt).getTime() : 0;
}

function isSystem(t: Ticket): boolean {
  return (t.betType || '').startsWith('System') || t.betType === 'System Roll' || t.betType === 'System Bet';
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusPill({ status, prizeTier }: { status?: string; prizeTier?: string }) {
  if (status === 'won') return (
    <View style={[pill.base, pill.won]}>
      <Text style={[pill.text, { color: C.green }]}>🏆 Won{prizeTier ? ` · ${prizeTier}` : ''}</Text>
    </View>
  );
  if (status === 'not_won') return (
    <View style={[pill.base, pill.lost]}>
      <Text style={[pill.text, { color: C.muted }]}>✗ Not Won</Text>
    </View>
  );
  return (
    <View style={[pill.base, pill.pending]}>
      <Text style={[pill.text, { color: C.gold }]}>⏳ Pending</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  base:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  won:     { backgroundColor: 'rgba(34,197,94,.12)', borderColor: 'rgba(34,197,94,.4)' },
  lost:    { backgroundColor: 'rgba(107,142,181,.08)', borderColor: 'rgba(107,142,181,.2)' },
  pending: { backgroundColor: 'rgba(251,198,60,.1)', borderColor: 'rgba(251,198,60,.3)' },
  text:    { fontSize: 11, fontWeight: '700' },
});

// ── Detail Sheet ───────────────────────────────────────────────────────────────

function DetailSheet({ ticket, onClose, onCheckResult }: { ticket: Ticket; onClose: () => void; onCheckResult: (id: string) => void }) {
  const is4D = ticket.gameType === '4D';
  const accent = is4D ? C.red : C.purple;

  const rows: [string, string][] = [
    ['Game Type',     ticket.gameType || '—'],
    ['Bet Type',      ticket.betType || 'Ordinary'],
    ['Draw Date',     fmtDate(ticket.drawDate)],
    ['Purchase Date', fmtDate(ticket.ticketPurchaseDate)],
    ['Draw Status',   ticket.drawType === 'future' ? 'Upcoming' : 'Past'],
    ['Combinations',  String(ticket.combinationCount || ticket.numbers?.length || '—')],
    ['System Size',   ticket.systemSize ? `System ${ticket.systemSize}` : '—'],
    ['Amount Paid',   ticket.amount ? `$${parseFloat(String(ticket.amount)).toFixed(2)}` : '—'],
    ['Serial No.',    ticket.serialNumber || '—'],
  ];

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <View style={ds.backdrop}>
        <TouchableOpacity style={ds.dimArea} onPress={onClose} activeOpacity={1} />
        <View style={ds.sheet}>
          {/* Handle bar */}
          <View style={ds.handle} />

          {/* Header */}
          <View style={ds.sheetHeader}>
            <View style={[ds.gameBadge, { backgroundColor: accent + '22', borderColor: accent }]}>
              <Text style={[ds.gameBadgeText, { color: accent }]}>{ticket.gameType}</Text>
            </View>
            <Text style={ds.sheetTitle}>Ticket Detail</Text>
            <TouchableOpacity onPress={onClose} style={ds.closeBtn}>
              <Text style={ds.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ds.scroll} showsVerticalScrollIndicator={false}>
            {/* Image */}
            {ticket.imageUrl ? (
              <Image source={{ uri: ticket.imageUrl }} style={ds.ticketImg} resizeMode="contain" />
            ) : (
              <View style={ds.imgPlaceholder}><Text style={{ fontSize: 56 }}>🎫</Text></View>
            )}

            {/* Status */}
            <View style={ds.statusRow}>
              <StatusPill status={ticket.resultStatus} prizeTier={ticket.prizeTier} />
              {ticket.resultStatus === 'pending' && (
                <TouchableOpacity style={ds.checkBtn} onPress={() => { onCheckResult(ticket.id); onClose(); }}>
                  <Text style={ds.checkBtnText}>Check Now</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info rows */}
            <View style={ds.infoCard}>
              {rows.map(([k, v]) => (
                <View key={k} style={ds.infoRow}>
                  <Text style={ds.infoKey}>{k}</Text>
                  <Text style={ds.infoVal}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Numbers */}
            {ticket.numbers && ticket.numbers.length > 0 && (
              <View style={ds.section}>
                <Text style={ds.sectionTitle}>Extracted Numbers</Text>
                <View style={ds.numsWrap}>
                  {ticket.numbers.map((n, i) => (
                    <View key={i} style={[ds.numChip, { backgroundColor: accent + '22', borderColor: accent + '66' }]}>
                      <Text style={[ds.numText, { color: accent }]}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* System Bet summary */}
            {ticket.systemSize && (
              <View style={ds.section}>
                <Text style={ds.sectionTitle}>System {ticket.systemSize} Bet</Text>
                <View style={ds.sysSummary}>
                  <View style={ds.sysStat}>
                    <Text style={ds.sysStatNum}>{ticket.expandedCombinationCount ?? ticket.combinationCount ?? 0}</Text>
                    <Text style={ds.sysStatLbl}>Combinations</Text>
                  </View>
                  {ticket.resultStatus !== 'pending' && (
                    <View style={ds.sysStat}>
                      <Text style={[ds.sysStatNum, { color: (ticket.winMatches?.length ?? 0) > 0 ? C.green : C.muted }]}>
                        {ticket.winMatches?.length ?? 0}
                      </Text>
                      <Text style={ds.sysStatLbl}>Winning</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Winning matches */}
            {ticket.winMatches && ticket.winMatches.length > 0 && (
              <View style={ds.section}>
                <Text style={ds.sectionTitle}>Winning Combinations</Text>
                <View style={ds.infoCard}>
                  {ticket.winMatches.slice(0, 10).map((m: any, i: number) => (
                    <View key={i} style={ds.infoRow}>
                      <Text style={ds.infoKey}>{m.number || (m.combination || []).join(', ')}</Text>
                      <Text style={[ds.infoVal, { color: C.green, fontWeight: '700' }]}>{m.prize}</Text>
                    </View>
                  ))}
                  {ticket.winMatches.length > 10 && (
                    <Text style={{ fontSize: 12, color: C.muted, padding: 8 }}>
                      +{ticket.winMatches.length - 10} more winning combinations
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Text style={ds.idText}>ID: {ticket.id}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const ds = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,.6)', justifyContent: 'flex-end' },
  dimArea:     { flex: 1 },
  sheet:       { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 32 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  gameBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  gameBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  sheetTitle:  { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  closeBtn:    { padding: 6 },
  closeText:   { fontSize: 18, color: C.muted },
  scroll:      { paddingHorizontal: 20 },
  ticketImg:   { width: '100%', height: 220, borderRadius: 12, marginVertical: 16, backgroundColor: C.surface2 },
  imgPlaceholder: { alignItems: 'center', paddingVertical: 32, marginVertical: 12, backgroundColor: C.surface2, borderRadius: 12 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  checkBtn:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.red },
  checkBtnText: { fontSize: 13, color: C.red, fontWeight: '600' },
  infoCard:    { backgroundColor: C.surface2, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  infoKey:     { fontSize: 13, color: C.muted, fontWeight: '600' },
  infoVal:     { fontSize: 13, color: C.text2, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  section:     { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  numsWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  numText:     { fontSize: 14, fontWeight: '800' },
  idText:      { fontSize: 11, color: C.muted, fontFamily: 'monospace', marginBottom: 8, marginTop: 4 },
  sysSummary:  { flexDirection: 'row', gap: 24, paddingTop: 8 },
  sysStat:     { alignItems: 'center' },
  sysStatNum:  { fontSize: 26, fontWeight: '900', color: C.text },
  sysStatLbl:  { fontSize: 11, color: C.muted, marginTop: 2 },
});

// ── Ticket Card ────────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onPress,
  onCheck,
  onLongPress,
}: {
  ticket: Ticket;
  onPress: () => void;
  onCheck: () => void;
  onLongPress: () => void;
}) {
  const is4D   = ticket.gameType === '4D';
  const accent = is4D ? C.red : C.purple;
  const accentText = is4D ? '#7aa4e0' : C.gold;

  return (
    <TouchableOpacity
      style={[tc.card, { borderLeftColor: accent }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      activeOpacity={0.82}
    >
      {/* Thumbnail */}
      <View style={tc.thumb}>
        {ticket.imageUrl
          ? <Image source={{ uri: ticket.imageUrl }} style={tc.thumbImg} resizeMode="cover" />
          : <Text style={tc.thumbIcon}>{is4D ? '🎰' : '🎱'}</Text>
        }
      </View>

      {/* Content */}
      <View style={tc.content}>
        {/* Top row */}
        <View style={tc.topRow}>
          <View style={tc.topLeft}>
            <View style={[tc.badge, { backgroundColor: accent + '22', borderColor: accent }]}>
              <Text style={[tc.badgeText, { color: accentText }]}>{ticket.gameType}</Text>
            </View>
            <Text style={tc.betType}>{ticket.betType || 'Ordinary'}</Text>
            {ticket.systemSize ? (
              <View style={tc.sysTag}>
                <Text style={tc.sysTagText}>Sys {ticket.systemSize}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusPill status={ticket.resultStatus} prizeTier={ticket.prizeTier} />
            {ticket.resultStatus === 'pending' && (
              <TouchableOpacity style={tc.checkBtn} onPress={onCheck} activeOpacity={0.8}>
                <Text style={tc.checkTxt}>Check</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Numbers */}
        {ticket.numbers && ticket.numbers.length > 0 && (
          <View style={tc.numsRow}>
            {ticket.numbers.slice(0, 5).map((n, i) => (
              <View key={i} style={[tc.numChip, { backgroundColor: accent + '18', borderColor: accent + '55' }]}>
                <Text style={[tc.numText, { color: accentText }]}>{n}</Text>
              </View>
            ))}
            {ticket.numbers.length > 5 && (
              <Text style={tc.numMore}>+{ticket.numbers.length - 5}</Text>
            )}
          </View>
        )}

        {/* Meta */}
        <View style={tc.metaRow}>
          {ticket.drawDate ? (
            <Text style={tc.metaText}>Draw: <Text style={tc.metaVal}>{fmtDate(ticket.drawDate)}</Text></Text>
          ) : null}
          {ticket.amount ? (
            <Text style={[tc.metaText, { color: C.gold, fontWeight: '700' }]}>${parseFloat(String(ticket.amount)).toFixed(2)}</Text>
          ) : null}
          {(ticket.combinationCount || 0) > 1 ? (
            <Text style={tc.metaText}>{ticket.combinationCount} combos</Text>
          ) : null}
        </View>
      </View>

      <Text style={tc.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const tc = StyleSheet.create({
  card:     { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, marginBottom: 10, overflow: 'hidden', alignItems: 'center' },
  thumb:    { width: 64, height: 80, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbImg: { width: 64, height: 80 },
  thumbIcon:{ fontSize: 28 },
  content:  { flex: 1, padding: 12, gap: 6 },
  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  topLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText:{ fontSize: 10, fontWeight: '800' },
  betType:  { fontSize: 12, color: C.muted, fontWeight: '600' },
  sysTag:   { backgroundColor: 'rgba(251,198,60,.12)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  sysTagText:{ fontSize: 10, color: C.gold, fontWeight: '700' },
  numsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  numChip:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  numText:  { fontSize: 12, fontWeight: '800' },
  numMore:  { fontSize: 11, color: C.muted, alignSelf: 'center' },
  metaRow:  { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: C.muted },
  metaVal:  { color: C.text2, fontWeight: '600' },
  arrow:    { fontSize: 20, color: C.muted, paddingHorizontal: 10 },
  checkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: 'rgba(36,72,141,.15)',
  },
  checkTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: C.red,
  },
});

function TicketRow({
  ticket,
  onPress,
  onDelete,
  onCheck,
  onLongPress,
}: {
  ticket: Ticket;
  onPress: () => void;
  onDelete: () => void;
  onCheck: () => void;
  onLongPress: () => void;
}) {
  const renderRightActions = () => (
    <View style={swipe.actions}>
      <TouchableOpacity style={swipe.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
        <Text style={swipe.deleteIcon}>🗑️</Text>
        <Text style={swipe.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TicketCard ticket={ticket} onPress={onPress} onCheck={onCheck} onLongPress={onLongPress} />
    </Swipeable>
  );
}

const swipe = StyleSheet.create({
  actions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  deleteBtn: {
    width: 88,
    height: '100%',
    backgroundColor: '#4a8fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 2,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});

// ── Filter/Sort bar ────────────────────────────────────────────────────────────

type FilterKey = 'All' | '4D' | 'TOTO' | 'Won' | 'Pending' | 'System';
type SortKey   = 'newest' | 'oldest' | 'winning' | 'amount';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'All',     label: '📋 All'      },
  { key: '4D',      label: '🎰 4D'       },
  { key: 'TOTO',    label: '🎱 TOTO'     },
  { key: 'Won',     label: '🏆 Won'      },
  { key: 'Pending', label: '⏳ Pending'  },
  { key: 'System',  label: '⚙️ System'  },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest',  label: 'Newest ↓' },
  { key: 'oldest',  label: 'Oldest ↑' },
  { key: 'winning', label: 'Wins first' },
  { key: 'amount',  label: 'Amount ↓' },
];

// ── View ───────────────────────────────────────────────────────────────────────

export function HistoryView() {
  const { tickets, loading, refreshing, error, refresh, checkResult, deleteTicket } = useTickets();
  const [filter,   setFilter]   = useState<FilterKey>('All');
  const [sort,     setSort]     = useState<SortKey>('newest');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [sheetTicket, setSheetTicket] = useState<Ticket | null>(null);
  const [showSort, setShowSort] = useState(false);
  const router = useRouter();

  const processed = useMemo(() => {
    let list = tickets.filter((t: Ticket) => {
      if (filter === '4D')      return t.gameType === '4D';
      if (filter === 'TOTO')    return t.gameType === 'TOTO';
      if (filter === 'Won')     return t.resultStatus === 'won';
      if (filter === 'Pending') return t.resultStatus === 'pending';
      if (filter === 'System')  return isSystem(t);
      return true;
    });

    return [...list].sort((a: Ticket, b: Ticket) => {
      if (sort === 'oldest')  return sortScore(a) - sortScore(b);
      if (sort === 'winning') {
        const ws: Record<string, number> = { won: 0, pending: 1, not_won: 2 };
        const diff = (ws[a.resultStatus ?? ''] ?? 1) - (ws[b.resultStatus ?? ''] ?? 1);
        return diff !== 0 ? diff : sortScore(b) - sortScore(a);
      }
      if (sort === 'amount') return (parseFloat(String(b.amount)) || 0) - (parseFloat(String(a.amount)) || 0);
      return sortScore(b) - sortScore(a);
    });
  }, [tickets, filter, sort]);

  const wonCount     = tickets.filter((t: Ticket) => t.resultStatus === 'won').length;
  const pendingCount = tickets.filter((t: Ticket) => t.resultStatus === 'pending').length;
  const totalSpend   = tickets.reduce((s: number, t: Ticket) => s + (parseFloat(String(t.amount)) || 0), 0);

  return (
    <SafeAreaView style={v.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={v.header}>
        <Text style={v.title}>Ticket History</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={v.sortBtn} onPress={() => setShowSort(s => !s)}>
            <Text style={v.sortBtnText}>⇅ {SORTS.find(s => s.key === sort)?.label}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={v.scanBtn} onPress={() => router.push('/tabs/upload' as any)}>
            <Text style={v.scanBtnText}>+ Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={v.sortDropdown}>
          {SORTS.map(s => (
            <TouchableOpacity key={s.key} style={[v.sortOption, sort === s.key && v.sortOptionActive]}
              onPress={() => { setSort(s.key); setShowSort(false); }}>
              <Text style={[v.sortOptionText, sort === s.key && v.sortOptionTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stats */}
      {!loading && tickets.length > 0 && (
        <View style={v.stats}>
          <View style={v.statItem}><Text style={[v.statNum, { color: C.gold }]}>{tickets.length}</Text><Text style={v.statLbl}>Total</Text></View>
          <View style={v.statDiv} />
          <View style={v.statItem}><Text style={[v.statNum, { color: '#7aa4e0' }]}>{tickets.filter((t: Ticket) => t.gameType === '4D').length}</Text><Text style={v.statLbl}>4D</Text></View>
          <View style={v.statDiv} />
          <View style={v.statItem}><Text style={[v.statNum, { color: C.gold }]}>{tickets.filter((t: Ticket) => t.gameType === 'TOTO').length}</Text><Text style={v.statLbl}>TOTO</Text></View>
          {wonCount > 0 && <><View style={v.statDiv} /><View style={v.statItem}><Text style={[v.statNum, { color: C.green }]}>{wonCount}</Text><Text style={v.statLbl}>Won</Text></View></>}
          {pendingCount > 0 && <><View style={v.statDiv} /><View style={v.statItem}><Text style={[v.statNum, { color: C.gold }]}>{pendingCount}</Text><Text style={v.statLbl}>Pending</Text></View></>}
          {totalSpend > 0 && <><View style={v.statDiv} /><View style={v.statItem}><Text style={[v.statNum, { color: C.gold, fontSize: 14 }]}>${totalSpend.toFixed(0)}</Text><Text style={v.statLbl}>Spent</Text></View></>}
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={v.filterScroll} contentContainerStyle={v.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[v.filterTab, filter === f.key && v.filterTabActive]} onPress={() => setFilter(f.key)}>
            <Text style={[v.filterText, filter === f.key && v.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      {!loading && !error && tickets.length > 0 && (
        <Text style={v.countText}>Showing {processed.length} of {tickets.length}</Text>
      )}

      {/* Content */}
      {loading ? (
        <View style={v.center}><ActivityIndicator size="large" color={C.red} /><Text style={v.loadText}>Loading tickets…</Text></View>
      ) : error ? (
        <View style={v.center}>
          <Text style={v.stateIcon}>⚠️</Text>
          <Text style={v.stateTitle}>Could not load tickets</Text>
          <Text style={v.stateMsg}>{error}</Text>
          <TouchableOpacity style={v.retryBtn} onPress={refresh}><Text style={v.retryText}>Try Again</Text></TouchableOpacity>
        </View>
      ) : processed.length === 0 ? (
        <View style={v.center}>
          <Mascot state="sleeping" size={80} />
          <Text style={[v.stateTitle, { marginTop: 16 }]}>{filter === 'All' ? 'No tickets yet' : `No ${filter} tickets`}</Text>
          <Text style={v.stateMsg}>{filter === 'All' ? 'Scan your first 4D or TOTO ticket to get started.' : 'Try a different filter.'}</Text>
          {filter === 'All' && (
            <TouchableOpacity style={v.scanLarge} onPress={() => router.push('/tabs/upload' as any)}>
              <Text style={v.scanLargeText}>📸  Scan a Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
          <FlatList
            data={processed}
            keyExtractor={(t: Ticket) => t.id}
            renderItem={({ item }) => (
              <TicketRow
                ticket={item}
                onPress={() => setSelected(item)}
                onDelete={() => deleteTicket(item.id)}
                onCheck={() => checkResult(item.id)}
                onLongPress={() => setSheetTicket(item)}
              />
            )}
            contentContainerStyle={v.list}
            refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={refresh} tintColor={C.red} />}
            showsVerticalScrollIndicator={false}
          />
      )}

      {/* Detail sheet */}
      {selected && (
        <DetailSheet
          ticket={selected}
          onClose={() => setSelected(null)}
          onCheckResult={checkResult}
        />
      )}

      {/* Long-press bottom sheet */}
      {sheetTicket && (
        <Modal
          animationType="slide"
          transparent
          onRequestClose={() => setSheetTicket(null)}
        >
          <View style={bs.backdrop}>
            <TouchableOpacity style={bs.dimArea} activeOpacity={1} onPress={() => setSheetTicket(null)} />
            <View style={bs.sheet}>
              <View style={bs.handle} />
              <View style={bs.headerRow}>
                <Text style={bs.title}>Ticket Quick View</Text>
                <TouchableOpacity onPress={() => setSheetTicket(null)}>
                  <Text style={bs.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={bs.row}>
                <Text style={bs.label}>Draw Date</Text>
                <Text style={bs.value}>{fmtDate(sheetTicket.drawDate)}</Text>
              </View>
              <View style={bs.row}>
                <Text style={bs.label}>Bet Type</Text>
                <Text style={bs.value}>{sheetTicket.betType || 'Ordinary'}</Text>
              </View>
              {sheetTicket.amount != null && (
                <View style={bs.row}>
                  <Text style={bs.label}>Amount Paid</Text>
                  <Text style={[bs.value, { color: C.gold }]}>
                    ${parseFloat(String(sheetTicket.amount)).toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={bs.row}>
                <Text style={bs.label}>Result</Text>
                <View style={bs.statusWrap}>
                  <StatusPill status={sheetTicket.resultStatus} prizeTier={sheetTicket.prizeTier} />
                </View>
              </View>

              {sheetTicket.numbers && sheetTicket.numbers.length > 0 && (
                <View style={bs.section}>
                  <Text style={bs.label}>Numbers</Text>
                  <View style={bs.numsWrap}>
                    {sheetTicket.numbers.map((n, i) => (
                      <View key={i} style={bs.numChip}>
                        <Text style={bs.numTxt}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={bs.deleteBtn}
                onPress={() => {
                  deleteTicket(sheetTicket.id);
                  setSheetTicket(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={bs.deleteTxt}>Delete Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const v = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  title:  { fontSize: 22, fontWeight: '800', color: C.text },
  scanBtn:     { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  scanBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },
  sortBtn:     { borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  sortBtnText: { color: C.muted, fontSize: 12, fontWeight: '600' },

  sortDropdown:    { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginHorizontal: 20, marginTop: 4, borderRadius: 10, overflow: 'hidden', zIndex: 10 },
  sortOption:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sortOptionActive:{ backgroundColor: 'rgba(36,72,141,.12)' },
  sortOptionText:  { fontSize: 14, color: C.muted },
  sortOptionTextActive: { color: C.text, fontWeight: '700' },

  stats:   { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 20, marginVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  statItem:{ flex: 1, alignItems: 'center', paddingVertical: 12 },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },
  statDiv: { width: 1, backgroundColor: C.border },

  filterScroll:  { flexGrow: 0 },
  filterContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  filterTab:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  filterTabActive:     { borderColor: C.red, backgroundColor: 'rgba(36,72,141,.15)' },
  filterText:    { fontSize: 12, fontWeight: '600', color: C.muted },
  filterTextActive:    { color: C.text },

  countText: { fontSize: 11, color: C.muted, paddingHorizontal: 20, marginBottom: 4 },
  list:      { paddingHorizontal: 20, paddingBottom: 32 },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadText:   { color: C.muted, marginTop: 12, fontSize: 14 },
  stateIcon:  { fontSize: 44, marginBottom: 12 },
  stateTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' },
  stateMsg:   { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryBtn:   { backgroundColor: C.red, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText:  { color: C.white, fontWeight: '700' },
  scanLarge:  { backgroundColor: C.red, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  scanLargeText: { color: C.white, fontWeight: '700', fontSize: 15 },
});

const bs = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dimArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  closeTxt: {
    fontSize: 18,
    color: C.muted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: C.text2,
    fontWeight: '600',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginTop: 10,
  },
  numsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  numChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  numTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text2,
  },
  deleteBtn: {
    marginTop: 18,
    backgroundColor: '#4a8fff',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
