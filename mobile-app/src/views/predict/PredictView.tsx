// VIEW layer — predictive analysis screen.
// Two game categories (4D / TOTO) × three statistical models each.
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePredictInteractor } from '../../interactors/usePredictInteractor';
import { Mascot } from '../../../components/Mascot';
import type { Prediction } from '../../entities/Prediction';

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:      '#0f1117',
  surface: '#181c2a',
  border:  '#2a2f45',
  border2: '#30363d',
  blue:    '#4a8fff',
  gold:    '#4a8fff',
  purple:  '#7b9fff',
  violet:  '#7b9fff',
  red:     '#4a8fff',
  text:    '#f0f6fc',
  text2:   '#c9d1d9',
  muted:   '#8b9bbf',
  white:   '#ffffff',
};

type GameTab   = '4d' | 'toto';

const MODEL_ICONS:  Record<string, string> = { frequency: '🔢', hot_cold: '🔥', odd_even: '⚖️' };
const MODEL_NAMES:  string[] = ['Digit Frequency', 'Hot & Cold', 'Odd & Even'];
const FOURD_COLORS: string[] = [C.red,    C.gold, C.purple];
const TOTO_COLORS:  string[] = [C.violet, C.gold, C.blue];

// ── Documentation Accordion ───────────────────────────────────────────────────

function ModelDocs({ pred }: { pred: Prediction }) {
  const [open, setOpen] = useState(false);
  const docs: [string, string | undefined][] = [
    ['Why This Model',      pred.why],
    ['Core Assumptions',    pred.assumptions],
    ['Methodology',         pred.methodology],
    ['Evaluation',          pred.evaluation],
    ['Confidence',          pred.confidence],
  ];

  return (
    <>
      <TouchableOpacity style={s.docToggle} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={s.docToggleTxt}>{open ? '▲ Hide Documentation' : '▼ Model Documentation'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.docBody}>
          {docs.map(([label, value]) => (
            <View key={label} style={s.docItem}>
              <Text style={s.docLabel}>{label}</Text>
              <Text style={s.docValue}>{value ?? '—'}</Text>
            </View>
          ))}
          <View style={s.docDisclaimer}>
            <Text style={s.docLabel}>⚠️ Disclaimer</Text>
            <Text style={s.docValue}>{pred.disclaimer ?? '—'}</Text>
          </View>
        </View>
      )}
    </>
  );
}

// ── 4D Model Card ─────────────────────────────────────────────────────────────

function FourDCard({ pred, index }: { pred: Prediction; index: number }) {
  const accent = FOURD_COLORS[index] ?? C.red;
  const icon   = MODEL_ICONS[pred.modelId] ?? '🔢';
  const digits = String(pred.predicted4D ?? '????').split('');
  const rawPct  = pred.confidenceScore ?? 0.1;
  const fillPct = Math.min(rawPct * 5 * 100, 100);

  return (
    <View style={[s.card, { borderLeftColor: accent, borderColor: accent + '44' }]}>
      {/* Card header */}
      <View style={[s.cardHeader, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <View style={s.cardHeaderTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.modelNum}>MODEL {index + 1}</Text>
            <View style={s.modelRow}>
              <Text style={s.modelIcon}>{icon}</Text>
              <Text style={[s.modelName, { color: accent }]}>{pred.model}</Text>
            </View>
          </View>
          <View style={s.confBadge}>
            <Text style={s.confBadgeTxt}>LOW CONFIDENCE</Text>
          </View>
        </View>
        {/* Confidence bar */}
        <View style={s.confMeta}>
          <Text style={s.confLabel}>Confidence Score</Text>
          <Text style={[s.confValue, { color: accent }]}>{Math.round(rawPct * 100)}%</Text>
        </View>
        <View style={s.confTrack}>
          <View style={[s.confFill, { width: `${fillPct}%` as any, backgroundColor: accent }]} />
        </View>
      </View>

      {/* 4D Prediction */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Predicted 4D Number</Text>
        <View style={s.digitRow}>
          {digits.map((d, i) => (
            <View key={i} style={[s.digitBox, { borderColor: accent, backgroundColor: accent + '14' }]}>
              <Text style={[s.digitTxt, { color: accent }]}>{d}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.fullNumber, { color: accent }]}>{pred.predicted4D ?? '????'}</Text>
        <Text style={s.hint}>
          {pred.modelId === 'hot_cold'
            ? 'The hottest complete 4D number — the most repeated prize number in recent draws.'
            : pred.modelId === 'odd_even'
            ? 'Each digit chosen to match the most common odd/even pattern across all four positions.'
            : 'Each digit independently selected as the highest-frequency digit at that position.'}
        </Text>
      </View>

      {/* Docs */}
      <ModelDocs pred={pred} />
    </View>
  );
}

// ── TOTO Ball ─────────────────────────────────────────────────────────────────

function Ball({ n, type }: { n: number; type: 'primary' | 'supplementary' }) {
  const isPrimary = type === 'primary';
  return (
    <View style={isPrimary ? s.ballPrimary : s.ballSupp}>
      <Text style={isPrimary ? s.ballPrimaryTxt : s.ballSuppTxt}>{n}</Text>
    </View>
  );
}

// ── TOTO Model Card ───────────────────────────────────────────────────────────

function TOTOCard({ pred, index }: { pred: Prediction; index: number }) {
  const accent  = TOTO_COLORS[index] ?? C.violet;
  const icon    = MODEL_ICONS[pred.modelId] ?? '🔢';
  const primary = (pred.predictedTOTO ?? []).slice(0, 6);
  const supp    = (pred.predictedTOTO ?? []).slice(6, 12);
  const rawPct  = pred.confidenceScore ?? 0.1;
  const fillPct = Math.min(rawPct * 5 * 100, 100);

  return (
    <View style={[s.card, { borderLeftColor: accent, borderColor: accent + '44' }]}>
      {/* Card header */}
      <View style={[s.cardHeader, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <View style={s.cardHeaderTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.modelNum}>MODEL {index + 1}</Text>
            <View style={s.modelRow}>
              <Text style={s.modelIcon}>{icon}</Text>
              <Text style={[s.modelName, { color: accent }]}>{pred.model}</Text>
            </View>
          </View>
          <View style={[s.sys12Badge, { borderColor: accent + '50', backgroundColor: accent + '18' }]}>
            <Text style={[s.sys12Txt, { color: accent }]}>SYSTEM 12</Text>
          </View>
        </View>
        <View style={s.confMeta}>
          <Text style={s.confLabel}>Confidence Score</Text>
          <Text style={[s.confValue, { color: accent }]}>{Math.round(rawPct * 100)}%</Text>
        </View>
        <View style={s.confTrack}>
          <View style={[s.confFill, { width: `${fillPct}%` as any, backgroundColor: accent }]} />
        </View>
      </View>

      {/* TOTO System 12 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>TOTO Prediction — System 12</Text>

        {/* Primary */}
        <View style={s.ballGroup}>
          <View style={s.ballGroupHeader}>
            <View style={[s.dot, { backgroundColor: C.purple }]} />
            <Text style={[s.ballGroupLabel, { color: C.purple }]}>Primary Numbers (6)</Text>
          </View>
          <View style={s.ballsRow}>
            {primary.map((n, i) => <Ball key={i} n={n} type="primary" />)}
          </View>
        </View>

        {/* Supplementary */}
        <View style={s.ballGroup}>
          <View style={s.ballGroupHeader}>
            <View style={[s.dot, { backgroundColor: C.gold }]} />
            <Text style={[s.ballGroupLabel, { color: C.gold }]}>Supplementary Numbers (6)</Text>
          </View>
          <View style={s.ballsRow}>
            {supp.map((n, i) => <Ball key={i} n={n} type="supplementary" />)}
          </View>
        </View>

        <Text style={s.hint}>
          {pred.modelId === 'hot_cold'
            ? 'Primary: 6 hottest numbers (drawn most recently). Supplementary: 6 coldest (longest absent). System 12 = 924 combinations.'
            : pred.modelId === 'odd_even'
            ? 'Numbers match the most common odd/even balance & low/high split from historical jackpot draws. System 12 = 924 combinations.'
            : 'Primary: 6 highest-frequency numbers. Supplementary: next 6 most frequent. System 12 = C(12,6) = 924 combinations.'}
        </Text>
      </View>

      {/* Docs */}
      <ModelDocs pred={pred} />
    </View>
  );
}

// ── Comparison section ────────────────────────────────────────────────────────

function CompareSection({ predictions, gameTab }: { predictions: Prediction[]; gameTab: GameTab }) {
  const colors = gameTab === '4d' ? FOURD_COLORS : TOTO_COLORS;

  return (
    <View style={s.compareSection}>
      <Text style={s.compareTitle}>All Models Comparison</Text>
      <View style={s.compareTable}>
        {predictions.map((p, i) => {
          const color   = colors[i] ?? C.blue;
          const primary = (p.predictedTOTO ?? []).slice(0, 6);
          return (
            <View key={p.modelId} style={[s.compareRow, i < 2 && s.compareRowBorder]}>
              <View style={[s.compareAccent, { backgroundColor: color }]} />
              <View style={s.compareName}>
                <Text style={s.compareModelNum}>Model {i + 1}</Text>
                <Text style={[s.compareModelName, { color }]}>{MODEL_NAMES[i]}</Text>
              </View>
              {gameTab === '4d' ? (
                <Text style={[s.compare4D, { color }]}>{p.predicted4D ?? '????'}</Text>
              ) : (
                <Text style={s.compareToto}>{primary.join(' · ')}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function PredictView() {
  const { predictions, meta, loading, error, fetchPredictions } = usePredictInteractor();
  const [gameTab,     setGameTab]     = useState<GameTab>('4d');
  const [activeModel, setActiveModel] = useState(0);

  useEffect(() => { fetchPredictions(); }, []);

  const switchGame = (tab: GameTab) => { setGameTab(tab); setActiveModel(0); };
  const selected   = predictions[activeModel] ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerIcon}>⚠️</Text>
          <Text style={s.disclaimerText}>
            <Text style={{ fontWeight: '700', color: C.text }}>Educational only. </Text>
            Predictions are NOT for gambling. Lottery draws are independent random events.
          </Text>
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Predictions</Text>
            <Text style={s.subtitle}>3 statistical models on historical draw data</Text>
          </View>
          <View style={s.headerRight}>
            <Mascot state={loading ? 'thinking' : 'idle'} size={60} />
            <TouchableOpacity style={s.refreshBtn} onPress={fetchPredictions} disabled={loading} activeOpacity={0.7}>
              <Text style={s.refreshTxt}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {meta?.dataPoints && (
          <View style={s.statsRow}>
            <View style={s.statChip}>
              <Text style={[s.statNum, { color: C.red }]}>{meta.dataPoints.fourd}</Text>
              <Text style={s.statLbl}>4D Draws</Text>
            </View>
            <View style={s.statChip}>
              <Text style={[s.statNum, { color: C.purple }]}>{meta.dataPoints.toto}</Text>
              <Text style={s.statLbl}>TOTO Draws</Text>
            </View>
            <View style={s.statChip}>
              <Text style={[s.statNum, { color: C.gold }]}>3</Text>
              <Text style={s.statLbl}>Models</Text>
            </View>
          </View>
        )}

        {/* Game tabs */}
        <View style={s.gameTabs}>
          {([['4d', '4D Predictions', C.red], ['toto', 'TOTO Predictions', C.violet]] as const).map(
            ([key, label, accent]) => (
              <TouchableOpacity
                key={key}
                style={[
                  s.gameTab,
                  gameTab === key
                    ? { backgroundColor: accent, borderColor: accent }
                    : { backgroundColor: 'transparent', borderColor: accent + '40' },
                ]}
                onPress={() => switchGame(key as GameTab)}
                activeOpacity={0.8}
              >
                <Text style={[s.gameTabTxt, { color: gameTab === key ? C.white : accent }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={s.loadingTxt}>Running prediction models...</Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={s.center}>
            <Mascot state="sad" size={72} />
            <Text style={[s.errTitle, { marginTop: 14 }]}>Prediction failed</Text>
            <Text style={s.errMsg}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchPredictions} activeOpacity={0.8}>
              <Text style={s.retryTxt}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {!loading && predictions.length > 0 && (
          <>
            {/* Model selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.modelTabsScroll}
              contentContainerStyle={s.modelTabsContent}
            >
              {predictions.map((m, i) => {
                const tabColor = gameTab === '4d' ? FOURD_COLORS[i] : TOTO_COLORS[i];
                const isActive = activeModel === i;
                return (
                  <TouchableOpacity
                    key={m.modelId}
                    style={[
                      s.modelTab,
                      { borderColor: tabColor ?? C.blue },
                      isActive && { backgroundColor: tabColor ?? C.blue },
                    ]}
                    onPress={() => setActiveModel(i)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.modelTabTxt, { color: isActive ? C.white : (tabColor ?? C.blue) }]}>
                      {MODEL_ICONS[m.modelId] ?? '🔢'} Model {i + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active card */}
            {selected && gameTab === '4d' && <FourDCard pred={selected} index={activeModel} />}
            {selected && gameTab === 'toto' && <TOTOCard pred={selected} index={activeModel} />}

            {/* Comparison */}
            <CompareSection predictions={predictions} gameTab={gameTab} />

            {/* Footer */}
            <View style={s.footerNote}>
              <Text style={s.footerTxt}>
                <Text style={{ color: C.text, fontWeight: '700' }}>Data sources: </Text>
                Singapore Pools official results. Cached in Firestore, refreshed daily at 23:00 SGT.
                {meta?.generatedAt
                  ? ` Generated: ${new Date(meta.generatedAt).toLocaleString('en-SG')}.`
                  : ''}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },

  // Disclaimer
  disclaimer: {
    backgroundColor: 'rgba(251,198,60,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,198,60,0.3)',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  disclaimerIcon: { fontSize: 18 },
  disclaimerText: { flex: 1, fontSize: 12, color: C.text2, lineHeight: 18 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title:      { fontSize: 24, fontWeight: '900', color: C.text },
  subtitle:   { fontSize: 13, color: C.muted, marginTop: 4 },
  headerRight: { alignItems: 'center', gap: 8 },
  refreshBtn: {
    backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.border2,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  refreshTxt: { color: C.gold, fontWeight: '900', fontSize: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statChip: {
    flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLbl: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },

  // Game tabs
  gameTabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  gameTab:  {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1.5, alignItems: 'center',
  },
  gameTabTxt: { fontSize: 13, fontWeight: '800' },

  // Model tabs
  modelTabsScroll:  { marginBottom: 16 },
  modelTabsContent: { gap: 8, paddingRight: 4 },
  modelTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  modelTabTxt: { fontSize: 13, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: 14, marginBottom: 16,
    borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden',
  },
  cardHeader: { padding: 16, borderBottomWidth: 1 },
  cardHeaderTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 14,
  },
  modelNum:  { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 0.8, marginBottom: 6 },
  modelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelIcon: { fontSize: 24 },
  modelName: { fontSize: 16, fontWeight: '800' },
  confBadge: {
    backgroundColor: 'rgba(107,142,181,0.12)', borderRadius: 6,
    borderWidth: 1, borderColor: C.border2, paddingHorizontal: 8, paddingVertical: 4,
  },
  confBadgeTxt: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 0.6 },
  sys12Badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  sys12Txt:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  confMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  confLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
  confValue: { fontSize: 11, fontWeight: '700' },
  confTrack: { height: 6, backgroundColor: C.border, borderRadius: 3 },
  confFill:  { height: 6, borderRadius: 3 },

  // Section
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.muted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14,
  },
  hint: { fontSize: 11, color: C.muted, lineHeight: 16, marginTop: 12 },

  // 4D digits
  digitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  digitBox: { width: 52, height: 64, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  digitTxt: { fontSize: 28, fontWeight: '900' },
  fullNumber: { fontSize: 32, fontWeight: '900', letterSpacing: 6 },

  // TOTO balls
  ballGroup: { marginBottom: 14 },
  ballGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot:             { width: 8, height: 8, borderRadius: 4 },
  ballGroupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  ballsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ballPrimary: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(123,159,255,0.2)', borderWidth: 1.5, borderColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  ballPrimaryTxt: { fontSize: 12, fontWeight: '800', color: C.purple },
  ballSupp: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(251,198,60,0.12)', borderWidth: 1.5, borderColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  ballSuppTxt: { fontSize: 12, fontWeight: '800', color: C.gold },

  // Docs
  docToggle:    { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border },
  docToggleTxt: { fontSize: 13, color: C.muted, fontWeight: '600' },
  docBody:      { padding: 16 },
  docItem:      { marginBottom: 14 },
  docLabel: {
    fontSize: 10, fontWeight: '700', color: C.muted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
  },
  docValue:      { fontSize: 12, color: C.text2, lineHeight: 18 },
  docDisclaimer: {
    backgroundColor: 'rgba(251,198,60,0.07)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(251,198,60,0.25)', padding: 12, marginTop: 4,
  },

  // Comparison
  compareSection: { marginTop: 8, marginBottom: 8 },
  compareTitle:   { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 },
  compareTable:   {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  compareRow:       { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  compareRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  compareAccent:    { width: 3, height: 32, borderRadius: 2 },
  compareName:      { width: 80 },
  compareModelNum:  { fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.6 },
  compareModelName: { fontSize: 11, fontWeight: '700' },
  compare4D:        { fontSize: 20, fontWeight: '900', letterSpacing: 3, minWidth: 60 },
  compareToto:      { flex: 1, fontSize: 11, color: C.text2 },

  // Footer
  footerNote: { marginTop: 16, padding: 14, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  footerTxt:  { fontSize: 12, color: C.muted, lineHeight: 18 },

  // Misc
  center:     { alignItems: 'center', paddingVertical: 40 },
  loadingTxt: { color: C.muted, marginTop: 12 },
  errTitle:   { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  errMsg:     { fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 16 },
  retryBtn:   { backgroundColor: C.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryTxt:   { color: C.white, fontWeight: '700' },
});
