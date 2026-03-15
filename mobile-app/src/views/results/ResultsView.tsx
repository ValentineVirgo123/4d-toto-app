// VIEW layer — SP-style search form + past draw cards.
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, FlatList,
  StyleSheet, RefreshControl, StatusBar, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResults } from '../../presenters/ResultsPresenter';
import type { FourDResult, TOTOResult } from '../../entities/DrawResult';

const C = {
  bg:      '#0d1117',
  surface: '#161b22',
  surface2:'#0d1117',
  border:  '#21262d',
  border2: '#30363d',
  red:     '#e53935',
  purple:  '#7c3aed',
  gold:    '#f59e0b',
  green:   '#22c55e',
  text:    '#f0f6fc',
  text2:   '#c9d1d9',
  muted:   '#8b949e',
  white:   '#ffffff',
};

// ── 4D Draw Card ──────────────────────────────────────────────────────────────

function FourDCard({ item, highlightNums = [] }: { item: FourDResult; highlightNums?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = (item.starters?.length ?? 0) > 0 || (item.consolation?.length ?? 0) > 0;
  const isMatch = (n?: string) => !!n && highlightNums.includes(n);

  const prizes: [string, string | undefined][] = [
    ['1st Prize', item.first],
    ['2nd Prize', item.second],
    ['3rd Prize', item.third],
  ];

  // chunk starters + consolation into rows of 2
  const chunk2 = (arr: string[] = []) => {
    const rows: string[][] = [];
    for (let i = 0; i < arr.length; i += 2) rows.push(arr.slice(i, i + 2));
    return rows;
  };
  const sPairs = chunk2(item.starters);
  const cPairs = chunk2(item.consolation);

  return (
    <View style={cs.card}>
      {/* Header */}
      <View style={cs.cardHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[cs.badge, { backgroundColor: '#e5393520', borderColor: C.red }]}>
            <Text style={[cs.badgeTxt, { color: C.red }]}>4D</Text>
          </View>
          <Text style={cs.drawDate}>{item.drawDate}</Text>
        </View>
        {item.drawNumber && <Text style={cs.drawNum}>#{item.drawNumber}</Text>}
      </View>

      {/* Top 3 prizes */}
      <View style={cs.cardBody}>
        {prizes.map(([label, num]) => (
          <View key={label} style={[cs.prizeRow, isMatch(num) && cs.prizeRowMatch]}>
            <Text style={cs.prizeLabel}>{label}</Text>
            <Text style={[cs.prizeNum, isMatch(num) && { color: C.green }]}>{num || '—'}</Text>
            {isMatch(num) && <Text style={cs.matchTag}>✓</Text>}
          </View>
        ))}
      </View>

      {/* More / starters / consolation */}
      {hasMore && (
        <TouchableOpacity style={cs.moreBtn} onPress={() => setExpanded(e => !e)}>
          <Text style={cs.moreBtnTxt}>{expanded ? 'Hide Results ▲' : 'More Results ▼'}</Text>
        </TouchableOpacity>
      )}

      {expanded && (
        <View style={cs.expanded}>
          <View style={[cs.sectionHead, { flexDirection: 'row', justifyContent: 'space-around' }]}>
            <Text style={cs.sectionHeadTxt}>Starter Prizes</Text>
            <Text style={cs.sectionHeadTxt}>Consolation Prizes</Text>
          </View>
          {Array.from({ length: Math.max(sPairs.length, cPairs.length) }).map((_, ri) => (
            <View key={ri} style={cs.twoColRow}>
              <View style={cs.colCell}>
                {(sPairs[ri] || []).map((n, ci) => (
                  <Text key={ci} style={[cs.chip, isMatch(n) && cs.chipMatch]}>{n}</Text>
                ))}
              </View>
              <View style={cs.colCell}>
                {(cPairs[ri] || []).map((n, ci) => (
                  <Text key={ci} style={[cs.chip, cs.chipConsol, isMatch(n) && cs.chipMatch]}>{n}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── TOTO Draw Card ─────────────────────────────────────────────────────────────

function TOTOCard({ item, highlightNums = [] }: { item: TOTOResult; highlightNums?: number[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasGroups = (item.prizeGroups?.length ?? 0) > 0;
  const isMatch = (n: number) => highlightNums.includes(n);

  return (
    <View style={cs.card}>
      {/* 2-col header */}
      <View style={cs.totoHead}>
        <Text style={cs.totoDate}>{item.drawDate}</Text>
        <Text style={cs.totoDrawNo}>Draw No. {item.drawNumber || '—'}</Text>
      </View>

      {/* Winning Numbers */}
      <View style={cs.grayBar}><Text style={cs.grayBarTxt}>Winning Numbers</Text></View>
      <View style={cs.ballsRow}>
        {(item.winningNums || []).map((n, i) => (
          <View key={i} style={[cs.ball, isMatch(n) && cs.ballMatch]}>
            <Text style={[cs.ballTxt, isMatch(n) && { color: C.green }]}>{n}</Text>
          </View>
        ))}
      </View>

      {/* Additional Number */}
      <View style={cs.grayBar}><Text style={cs.grayBarTxt}>Additional Number</Text></View>
      <View style={[cs.ballsRow, { justifyContent: 'center' }]}>
        {item.addlNum != null && (
          <View style={[cs.ball, cs.ballAddl, isMatch(item.addlNum) && cs.ballMatch]}>
            <Text style={[cs.ballTxt, { color: C.gold }, isMatch(item.addlNum) && { color: C.green }]}>{item.addlNum}</Text>
          </View>
        )}
      </View>

      {/* Group 1 Prize */}
      {item.group1Prize && (
        <>
          <View style={cs.grayBar}><Text style={cs.grayBarTxt}>Group 1 Prize</Text></View>
          <View style={cs.group1Row}><Text style={cs.group1Txt}>{item.group1Prize}</Text></View>
        </>
      )}

      {/* Winning Shares toggle */}
      {hasGroups && (
        <TouchableOpacity style={cs.moreBtn} onPress={() => setExpanded(e => !e)}>
          <Text style={cs.moreBtnTxt}>{expanded ? 'Hide Results ▲' : 'More Results ▼'}</Text>
        </TouchableOpacity>
      )}

      {expanded && hasGroups && (
        <View style={cs.expanded}>
          <View style={cs.grayBar}><Text style={cs.grayBarTxt}>Winning Shares</Text></View>
          {/* Table header */}
          <View style={cs.sharesRow}>
            <Text style={[cs.sharesTxt, { flex: 1.2, fontWeight: '700', color: C.muted }]}>Prize Group</Text>
            <Text style={[cs.sharesTxt, { flex: 1.5, fontWeight: '700', color: C.muted }]}>Amount</Text>
            <Text style={[cs.sharesTxt, { flex: 1, fontWeight: '700', color: C.muted }]}>Shares</Text>
          </View>
          {(item.prizeGroups || []).map((g: any, i: number) => (
            <View key={i} style={[cs.sharesRow, { borderTopColor: C.border, borderTopWidth: 1 }]}>
              <Text style={[cs.sharesTxt, { flex: 1.2 }]}>{g.group}</Text>
              <Text style={[cs.sharesTxt, { flex: 1.5, color: C.gold }]}>{g.shareAmount || '—'}</Text>
              <Text style={[cs.sharesTxt, { flex: 1 }]}>{Number(g.winningShares || 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── SP-style 4D Search Form ────────────────────────────────────────────────────

function FourDSearchForm({ lookupNumber }: { lookupNumber: any }) {
  const [date,     setDate]     = useState('');
  const [entries,  setEntries]  = useState([{ num: '', ibet: false }]);
  const [result,   setResult]   = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  const addRow    = () => { if (entries.length < 8) setEntries(e => [...e, { num: '', ibet: false }]); };
  const removeRow = (i: number) => setEntries(e => e.length > 1 ? e.filter((_, idx) => idx !== i) : e);
  const updateNum = (i: number, v: string) => setEntries(e => e.map((r, idx) => idx === i ? { ...r, num: v.replace(/\D/g, '').slice(0, 4) } : r));
  const toggleIbet = (i: number) => setEntries(e => e.map((r, idx) => idx === i ? { ...r, ibet: !r.ibet } : r));

  const check = async () => {
    const valid = entries.filter(e => /^\d{4}$/.test(e.num));
    if (!valid.length) { setErr('Enter at least one valid 4-digit number.'); return; }
    if (!date.trim())  { setErr('Enter a draw date.'); return; }
    setChecking(true); setResult(null); setErr(null);
    try {
      const results = await Promise.all(valid.map(e => lookupNumber('4d', { number: e.num, date: date.trim() })));
      setResult({ entries: valid.map((e, i) => ({ ...e, ...results[i] })), drawResult: results[0]?.result });
    } catch (ex: any) { setErr(ex.message); }
    finally { setChecking(false); }
  };

  const reset = () => { setResult(null); setErr(null); setDate(''); setEntries([{ num: '', ibet: false }]); };

  return (
    <View style={ss.formCard}>
      {/* Date */}
      <View style={ss.dateRow}>
        <Text style={ss.dateLabel}>Draw Date</Text>
        <TextInput
          style={ss.dateInput}
          placeholder="DD/MM/YY"
          placeholderTextColor={C.muted}
          value={date}
          onChangeText={setDate}
          keyboardType="numeric"
        />
      </View>

      {/* Entry rows */}
      <View style={{ gap: 8, marginBottom: 14 }}>
        {entries.map((entry, i) => (
          <View key={i} style={ss.numRow}>
            <Text style={ss.rowIdx}>{i + 1}</Text>
            <TextInput
              style={ss.numInput}
              value={entry.num}
              onChangeText={v => updateNum(i, v)}
              placeholder="_ _ _ _"
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              maxLength={4}
            />
            <TouchableOpacity style={ss.ibetBtn} onPress={() => toggleIbet(i)}>
              <View style={[ss.ibetBox, entry.ibet && ss.ibetBoxOn]}>
                {entry.ibet && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={ss.ibetLabel}>iBet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ss.iconBtn} onPress={() => updateNum(i, '')}>
              <Text style={{ color: C.muted, fontSize: 14 }}>↺</Text>
            </TouchableOpacity>
            {entries.length > 1 && (
              <TouchableOpacity style={ss.iconBtn} onPress={() => removeRow(i)}>
                <Text style={{ color: '#f87171', fontSize: 16 }}>−</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {entries.length < 8 && (
          <TouchableOpacity style={ss.addRowBtn} onPress={addRow}>
            <Text style={{ color: C.muted, fontSize: 14 }}>+ Add Number</Text>
          </TouchableOpacity>
        )}
      </View>

      {err && <Text style={ss.errTxt}>{err}</Text>}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[ss.checkBtn, checking && { opacity: 0.5 }]} onPress={check} disabled={checking}>
          <Text style={ss.checkBtnTxt}>{checking ? 'Checking…' : 'Check Result'}</Text>
        </TouchableOpacity>
        {result && (
          <TouchableOpacity style={ss.resetBtn} onPress={reset}>
            <Text style={{ color: C.muted, fontSize: 14 }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {result && (
        <View style={ss.checkResults}>
          {result.entries.map((e: any, i: number) => (
            <View key={i} style={[ss.checkEntry, e.won ? ss.checkEntryWon : ss.checkEntryLost]}>
              <Text style={ss.checkNum}>{e.num}</Text>
              {e.ibet && <View style={ss.checkTag}><Text style={ss.checkTagTxt}>iBet</Text></View>}
              <Text style={[ss.checkStatus, { color: e.won ? C.green : C.muted }]}>
                {e.won ? `🏆 ${e.prize}` : '✗ Not won'}
              </Text>
            </View>
          ))}
          {result.drawResult && (
            <View style={{ marginTop: 12 }}>
              <Text style={ss.drawLabel}>Draw Result</Text>
              <FourDCard item={result.drawResult} highlightNums={result.entries.map((e: any) => e.num)} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── SP-style TOTO Search Form ──────────────────────────────────────────────────

function TOTOSearchForm({ lookupNumber }: { lookupNumber: any }) {
  const [date,     setDate]     = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [result,   setResult]   = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  const toggle = (n: number) => {
    setSelected(s =>
      s.includes(n) ? s.filter(x => x !== n) : s.length < 6 ? [...s, n].sort((a, b) => a - b) : s,
    );
  };

  const check = async () => {
    if (selected.length !== 6) { setErr('Select exactly 6 numbers.'); return; }
    if (!date.trim())           { setErr('Enter a draw date.'); return; }
    setChecking(true); setResult(null); setErr(null);
    try {
      const data = await lookupNumber('toto', { numbers: selected.join(','), date: date.trim() });
      setResult(data);
    } catch (ex: any) { setErr(ex.message); }
    finally { setChecking(false); }
  };

  const reset = () => { setResult(null); setErr(null); setDate(''); setSelected([]); };

  return (
    <View style={ss.formCard}>
      {/* Date */}
      <View style={ss.dateRow}>
        <Text style={ss.dateLabel}>Draw Date</Text>
        <TextInput
          style={ss.dateInput}
          placeholder="DD/MM/YY"
          placeholderTextColor={C.muted}
          value={date}
          onChangeText={setDate}
          keyboardType="numeric"
        />
      </View>

      {/* Selected balls */}
      <View style={ss.pickedRow}>
        {selected.map(n => (
          <TouchableOpacity key={n} style={ss.pickedBall} onPress={() => toggle(n)}>
            <Text style={ss.pickedBallTxt}>{n}</Text>
          </TouchableOpacity>
        ))}
        {Array.from({ length: Math.max(0, 6 - selected.length) }).map((_, i) => (
          <View key={i} style={ss.emptyBall}>
            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700' }}>?</Text>
          </View>
        ))}
        {selected.length > 0 && (
          <TouchableOpacity style={[ss.iconBtn, { marginLeft: 4 }]} onPress={() => setSelected([])}>
            <Text style={{ color: C.muted, fontSize: 14 }}>↺</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={ss.pickerHint}>Tap numbers below to select 6 · {selected.length}/6</Text>

      {/* 1–49 picker grid */}
      <View style={ss.pickerGrid}>
        {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
          <TouchableOpacity
            key={n}
            style={[ss.pickerBtn, selected.includes(n) && ss.pickerBtnActive]}
            onPress={() => toggle(n)}
          >
            <Text style={[ss.pickerBtnTxt, selected.includes(n) && { color: C.white }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {err && <Text style={ss.errTxt}>{err}</Text>}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[ss.checkBtn, (checking || selected.length !== 6) && { opacity: 0.5 }]}
          onPress={check}
          disabled={checking || selected.length !== 6}
        >
          <Text style={ss.checkBtnTxt}>{checking ? 'Checking…' : 'Check Result'}</Text>
        </TouchableOpacity>
        {result && (
          <TouchableOpacity style={ss.resetBtn} onPress={reset}>
            <Text style={{ color: C.muted, fontSize: 14 }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {result && (
        <View style={ss.checkResults}>
          <View style={[ss.checkEntry, result.won ? ss.checkEntryWon : ss.checkEntryLost]}>
            <Text style={[ss.checkStatus, { color: result.won ? C.green : C.muted, fontSize: 14 }]}>
              {result.won ? `🏆 Won — ${result.prize}` : '✗ Not a winning combination for this draw'}
            </Text>
          </View>
          {result.result && (
            <View style={{ marginTop: 12 }}>
              <Text style={ss.drawLabel}>Draw Result</Text>
              <TOTOCard item={result.result} highlightNums={selected} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Date Search Bar ───────────────────────────────────────────────────────────

function DateSearchBar({ tab, onSearch, onClear, searching, hasSearch }: {
  tab: '4d' | 'toto'; onSearch: (g: '4d'|'toto', d: string) => void;
  onClear: () => void; searching: boolean; hasSearch: boolean;
}) {
  const [date, setDate] = useState('');
  const [err,  setErr]  = useState('');

  const submit = () => {
    const v = date.trim();
    if (!v) { setErr('Enter a draw date.'); return; }
    if (!/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)) {
      setErr('Use format DD/MM/YY'); return;
    }
    setErr(''); onSearch(tab, v);
  };

  const clear = () => { setDate(''); setErr(''); onClear(); };

  return (
    <View style={ds.searchCard}>
      <Text style={ds.searchLabel}>Search by Draw Date</Text>
      <View style={ds.searchRow}>
        <TextInput
          style={[ds.searchInput, err ? { borderColor: '#f87171' } : {}]}
          placeholder="DD/MM/YY  e.g. 15/03/26"
          placeholderTextColor={C.muted}
          value={date}
          onChangeText={t => { setDate(t); setErr(''); }}
          keyboardType="numeric"
        />
        <TouchableOpacity style={[ds.searchBtn, searching && { opacity: 0.6 }]} onPress={submit} disabled={searching}>
          <Text style={ds.searchBtnTxt}>{searching ? '…' : '🔍'}</Text>
        </TouchableOpacity>
        {hasSearch && (
          <TouchableOpacity style={ds.clearBtn} onPress={clear}>
            <Text style={ds.clearBtnTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {err ? (
        <Text style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{err}</Text>
      ) : !hasSearch ? (
        <Text style={ds.searchHint}>Showing last 7 days · Search any date for a specific draw</Text>
      ) : null}
    </View>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function ResultsView() {
  const { fourdResults, totoResults, loading, searching, refreshing, error,
          fetch4D, fetchTOTO, searchByDate, scrapeLatest } = useResults();
  const [tab,       setTab]       = useState<'4d' | 'toto'>('4d');
  const [hasSearch, setHasSearch] = useState(false);

  useEffect(() => {
    setHasSearch(false);
    if (tab === '4d') fetch4D(false, 7); else fetchTOTO(false, 7);
  }, [tab]);

  const handleSearch = async (game: '4d' | 'toto', date: string) => {
    const found = await searchByDate(game, date);
    setHasSearch(found);
  };

  const handleClear = () => {
    setHasSearch(false);
    if (tab === '4d') fetch4D(false, 7); else fetchTOTO(false, 7);
  };

  const data      = tab === '4d' ? fourdResults : totoResults;
  const onRefresh = async () => {
    await scrapeLatest();
    if (tab === '4d') fetch4D(true, 7); else fetchTOTO(true, 7);
  };

  return (
    <SafeAreaView style={cs.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FlatList
        data={data as any[]}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.red} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <View style={cs.header}>
              <Text style={cs.title}>Past Results</Text>
            </View>
            <Text style={cs.subtitle}>Official Singapore Pools winning numbers</Text>

            {/* Game tabs */}
            <View style={cs.tabRow}>
              <TouchableOpacity style={[cs.tab, tab === '4d' && cs.tab4D]} onPress={() => setTab('4d')}>
                <Text style={[cs.tabTxt, tab === '4d' && { color: C.red }]}>4D</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cs.tab, tab === 'toto' && cs.tabTOTO]} onPress={() => setTab('toto')}>
                <Text style={[cs.tabTxt, tab === 'toto' && { color: '#a78bfa' }]}>TOTO</Text>
              </TouchableOpacity>
            </View>

            {/* Date search */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <DateSearchBar tab={tab} onSearch={handleSearch} onClear={handleClear}
                             searching={searching} hasSearch={hasSearch} />
            </View>

            {/* Section label */}
            <View style={cs.pastHeader}>
              <Text style={cs.pastTitle}>{hasSearch ? 'Search Result' : 'Last 7 Days'}</Text>
            </View>

            {(loading || searching) && (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={C.red} />
                <Text style={{ color: C.muted, marginTop: 10 }}>
                  {searching ? 'Searching…' : 'Loading results…'}
                </Text>
              </View>
            )}

            {error && !loading && !searching && (
              <View style={{ margin: 16, padding: 16, backgroundColor: '#1a0000', borderRadius: 10, borderWidth: 1, borderColor: '#4a0000' }}>
                <Text style={{ color: '#f87171', fontWeight: '700', marginBottom: 4 }}>Could not load results</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>{error}</Text>
              </View>
            )}

            {!loading && !searching && !error && data.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>📊</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 }}>
                  {hasSearch ? 'No result found' : 'No results yet'}
                </Text>
                <Text style={{ color: C.muted, textAlign: 'center' }}>
                  {hasSearch ? 'Try a different date.' : 'Pull down to refresh.'}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) =>
          tab === '4d'
            ? <View style={{ paddingHorizontal: 16 }}><FourDCard item={item as FourDResult} /></View>
            : <View style={{ paddingHorizontal: 16 }}><TOTOCard  item={item as TOTOResult}  /></View>
        }
      />
    </SafeAreaView>
  );
}

// ── Date Search styles ────────────────────────────────────────────────────────

const ds = StyleSheet.create({
  searchCard:   { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  searchLabel:  { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  searchRow:    { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput:  { flex: 1, backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 9, color: C.text, fontSize: 14 },
  searchBtn:    { backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnTxt: { color: '#fff', fontSize: 16 },
  clearBtn:     { backgroundColor: 'rgba(139,148,158,.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  clearBtnTxt:  { color: C.muted, fontSize: 14, fontWeight: '700' },
  searchHint:   { fontSize: 11, color: C.muted, marginTop: 6 },
});

// ── Card styles ───────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title:    { fontSize: 24, fontWeight: '900', color: C.text },
  subtitle: { fontSize: 13, color: C.muted, paddingHorizontal: 20, marginBottom: 16 },

  tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  tab:    { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border2, alignItems: 'center' },
  tab4D:  { borderColor: C.red,    backgroundColor: '#e5393520' },
  tabTOTO:{ borderColor: '#7c3aed', backgroundColor: '#7c3aed20' },
  tabTxt: { fontWeight: '700', color: C.muted, fontSize: 15 },

  pastHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  pastTitle:  { fontSize: 16, fontWeight: '700', color: C.text },

  card:     { backgroundColor: C.surface, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  badge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  drawDate: { fontSize: 15, fontWeight: '800', color: C.text },
  drawNum:  { fontSize: 12, color: C.muted },

  cardBody:     { padding: 14 },
  prizeRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 2, borderRadius: 6 },
  prizeRowMatch:{ backgroundColor: 'rgba(34,197,94,0.07)' },
  prizeLabel:   { fontSize: 12, color: C.muted, width: 80 },
  prizeNum:     { fontSize: 22, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2, color: C.text },
  matchTag:     { fontSize: 12, fontWeight: '800', color: C.green, marginLeft: 8 },

  moreBtn:    { padding: 12, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center' },
  moreBtnTxt: { fontSize: 13, color: C.muted, fontWeight: '600' },

  expanded:    { borderTopWidth: 1, borderTopColor: C.border },
  sectionHead: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.border },
  sectionHeadTxt: { fontSize: 11, fontWeight: '700', color: C.muted, flex: 1, textAlign: 'center' },
  twoColRow:   { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 5 },
  colCell:     { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:        { backgroundColor: C.border, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, fontSize: 12, fontWeight: '700', color: C.text2 },
  chipConsol:  { color: C.muted },
  chipMatch:   { backgroundColor: 'rgba(34,197,94,0.15)', color: C.green },

  // TOTO card
  totoHead:     { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  totoDate:     { flex: 1, fontSize: 15, fontWeight: '800', color: C.text },
  totoDrawNo:   { fontSize: 13, color: C.muted, fontWeight: '600' },
  grayBar:      { backgroundColor: C.border, paddingHorizontal: 14, paddingVertical: 7 },
  grayBarTxt:   { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  ballsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  ball:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed22', borderWidth: 2, borderColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  ballAddl:     { backgroundColor: '#f59e0b22', borderColor: C.gold },
  ballMatch:    { borderColor: C.green, backgroundColor: 'rgba(34,197,94,0.15)' },
  ballTxt:      { fontSize: 12, fontWeight: '800', color: '#a78bfa' },
  group1Row:    { padding: 14 },
  group1Txt:    { fontSize: 20, fontWeight: '900', color: C.gold, textAlign: 'center' },
  sharesRow:    { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8 },
  sharesTxt:    { fontSize: 12, color: C.text2 },
});

// ── Search form styles ────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  formCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 8,
  },
  dateRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  dateLabel: { fontSize: 13, fontWeight: '700', color: C.muted, minWidth: 70 },
  dateInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.bg,
    color: C.text,
    fontSize: 14,
  },

  numRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowIdx:   { fontSize: 12, fontWeight: '700', color: C.muted, minWidth: 16, textAlign: 'center' },
  numInput: {
    flex: 1,
    height: 40,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 8,
    color: C.text,
    textAlign: 'center',
  },
  ibetBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ibetBox:  { width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
  ibetBoxOn:{ backgroundColor: C.red, borderColor: C.red },
  ibetLabel:{ fontSize: 12, color: C.muted },
  iconBtn:  { padding: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', minWidth: 30 },

  addRowBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border2, alignItems: 'center' },

  errTxt: { fontSize: 13, color: '#f87171', marginBottom: 10 },

  checkBtn:    { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: C.red, alignItems: 'center' },
  checkBtnTxt: { color: C.white, fontWeight: '700', fontSize: 14 },
  resetBtn:    { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border2, alignItems: 'center' },

  checkResults: { marginTop: 16, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, gap: 8 },
  checkEntry:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  checkEntryWon:  { backgroundColor: 'rgba(34,197,94,0.07)', borderColor: 'rgba(34,197,94,0.3)' },
  checkEntryLost: { backgroundColor: 'rgba(107,142,181,0.06)', borderColor: 'rgba(107,142,181,0.2)' },
  checkNum:    { fontSize: 18, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: C.text, minWidth: 50 },
  checkTag:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  checkTagTxt: { fontSize: 10, fontWeight: '700', color: C.gold },
  checkStatus: { fontSize: 13, fontWeight: '600', flex: 1 },
  drawLabel:   { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },

  // TOTO picker
  pickedRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6, alignItems: 'center' },
  pickedBall: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  pickedBallTxt: { color: C.white, fontSize: 13, fontWeight: '800' },
  emptyBall:  { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
  pickerHint: { fontSize: 12, color: C.muted, marginBottom: 12 },

  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pickerBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: C.border2,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerBtnActive: { backgroundColor: C.red, borderColor: C.red },
  pickerBtnTxt: { fontSize: 13, fontWeight: '600', color: C.text2 },
});
