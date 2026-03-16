// VIEW layer — upload + OCR screen.
// Business logic (ImagePicker, API call) lives in TicketPresenter / useTicketInteractor.
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTickets } from '../../presenters/TicketPresenter';
import { Mascot } from '../../../components/Mascot';
import type { OcrResult } from '../../entities/Ticket';

// ── Sub-component ─────────────────────────────────────────────────────────────

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={[s.fieldValue, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

// ── View ─────────────────────────────────────────────────────────────────────

export function UploadView() {
  const { uploadTicket, takePhoto, pickImage, refresh } = useTickets();

  const [preview, setPreview] = useState<string | null>(null);
  const [result,  setResult]  = useState<OcrResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [gameTab, setGameTab] = useState<'4D' | 'TOTO'>('4D');

  const handleUri = async (uri: string) => {
    setPreview(uri); setLoading(true); setResult(null); setError(null);
    try {
      const data = await uploadTicket(uri);
      setResult(data);
      refresh(); // sync global ticket list in TicketPresenter
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg === 'Aborted'
        ? 'Request timed out. Check your backend connection.'
        : (msg || 'Upload failed.'));
    } finally {
      setLoading(false);
    }
  };

  const onTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) handleUri(uri);
  };

  const onPickImage = async () => {
    const uri = await pickImage();
    if (uri) handleUri(uri);
  };

  const reset = () => { setPreview(null); setResult(null); setError(null); };

  const is4D = (result?.gameType ?? gameTab) === '4D';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Scan Ticket</Text>
            <Text style={s.headerSub}>
              Choose game type, then capture or upload your ticket for OCR.
            </Text>
          </View>
          <Mascot
            state={loading ? 'thinking' : result ? (is4D ? 'celebrating' : 'idle') : 'idle'}
            size={56}
          />
        </View>

        {/* Game tabs */}
        <View style={s.gameTabs}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.gameTab, gameTab === '4D' ? s.gameTabActive4D : null]}
            onPress={() => setGameTab('4D')}
          >
            <Text style={s.gameTabLabel}>4D</Text>
            <Text style={s.gameTabSub}>Number roll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.gameTab, gameTab === 'TOTO' ? s.gameTabActiveToto : null]}
            onPress={() => setGameTab('TOTO')}
          >
            <Text style={s.gameTabLabel}>TOTO</Text>
            <Text style={s.gameTabSub}>System bets</Text>
          </TouchableOpacity>
        </View>

        {(preview || result) && (
          <TouchableOpacity onPress={reset} style={s.resetWrap}>
            <Text style={s.resetLink}>↩ Start Over</Text>
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        {!loading && (
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[
                s.actionBtn,
                is4D ? s.actionPrimary4D : s.actionPrimaryToto,
              ]}
              onPress={onTakePhoto}
              activeOpacity={0.85}
            >
              <Text style={s.actionIcon}>📷</Text>
              <Text style={s.actionText}>Take Photo</Text>
              <Text style={s.actionSub}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.actionSecondary]}
              onPress={onPickImage}
              activeOpacity={0.85}
            >
              <Text style={s.actionIcon}>🖼️</Text>
              <Text style={s.actionText}>Gallery</Text>
              <Text style={s.actionSub}>Browse files</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        {!preview && !loading && (
          <View style={s.tipBox}>
            <Text style={s.tipTitle}>💡 Tips for best results</Text>
            {[
              'Ensure good lighting — avoid shadows',
              'Keep the ticket flat and fully in frame',
              'Numbers must be clear and in focus',
              gameTab === '4D'
                ? 'Works with 4D Ordinary, iBet, and 4D Roll tickets'
                : 'Works with all TOTO System bets, including System 12',
            ].map((t, i) => (
              <Text key={i} style={s.tipText}>
                • {t}
              </Text>
            ))}
          </View>
        )}

        {/* Preview */}
        {preview && (
          <View style={s.previewWrap}>
            <Image source={{ uri: preview }} style={s.preview} resizeMode="contain" />
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingBox}>
            <Mascot state="thinking" size={80} />
            <Text style={s.loadingTitle}>Analysing Ticket...</Text>
            <Text style={s.loadingDesc}>OCR is running — this may take up to 30 seconds.</Text>
            <View style={s.steps}>
              {['Reading image', 'Running OCR engine', 'Extracting numbers', 'Saving to cloud'].map((step, i) => (
                <View key={i} style={s.step}>
                  <View style={s.stepDot} />
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={s.errorBox}>
            <Mascot state="sad" size={64} />
            <Text style={s.errorTitle}>Upload Failed</Text>
            <Text style={s.errorMsg}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => preview && handleUri(preview)}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result */}
        {result && !loading && (
          <View style={s.resultCard}>
            <View style={[s.resultHeader, { borderLeftColor: is4D ? '#4a8fff' : '#7b9fff' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{is4D ? '🎰' : '🎱'}</Text>
                <View>
                  <View style={[s.badge, {
                    backgroundColor: is4D ? '#4a8fff22' : '#7b9fff22',
                    borderColor:     is4D ? '#4a8fff'   : '#7b9fff',
                  }]}>
                    <Text style={[s.badgeText, { color: is4D ? '#4a8fff' : '#7b9fff' }]}>{result.gameType}</Text>
                  </View>
                  <Text style={s.resultSubhead}>OCR Results</Text>
                </View>
              </View>
              {(result as any).duplicate
                ? <View style={s.dupeBadge}><Text style={s.dupeText}>⚠ Already saved</Text></View>
                : <View style={s.savedBadge}><Text style={s.savedText}>✓ Saved</Text></View>
              }
            </View>

            <View style={s.resultBody}>
              <View style={s.grid}>
                <Field label="Game Type"    value={is4D ? '4D' : 'TOTO'}                      accent={is4D ? '#4a8fff' : '#7b9fff'} />
                <Field label="Bet Type"     value={result.betType || '—'} />
                <Field label="Draw Date"    value={result.drawDate || '—'} />
                <Field label="Combinations" value={String(result.combinationCount ?? result.numbers?.length ?? '—')} />
                {result.systemSize ? <Field label="System Size" value={`System ${result.systemSize}`} accent="#7b9fff" /> : null}
                {result.amount     ? <Field label="Amount Paid"  value={`$${result.amount.toFixed(2)}`} accent="#4a8fff" /> : null}
              </View>

              {result.numbers && result.numbers.length > 0 && (
                <View style={s.numSection}>
                  <Text style={s.numLabel}>EXTRACTED NUMBERS</Text>
                  <View style={s.numWrap}>
                    {result.numbers.map((n, i) => (
                      <View key={i} style={[s.numChip, {
                        backgroundColor: is4D ? '#4a8fff20' : '#7b9fff20',
                        borderColor:     is4D ? '#4a8fffaa' : '#7b9fffaa',
                      }]}>
                        <Text style={[s.numChipText, { color: is4D ? '#4a8fff' : '#7b9fff' }]}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {result.serialNumber && (
                <View style={s.serialRow}>
                  <Text style={s.numLabel}>SERIAL  </Text>
                  <Text style={s.serialVal}>{result.serialNumber}</Text>
                </View>
              )}
              <Text style={s.idText}>ID: {result.ticketId}</Text>
            </View>

            {/* System Bet Expansion Banner */}
            {!is4D && result.systemSize && (result.expandedCombinationCount ?? 0) > 0 && (
              <View style={s.sysBanner}>
                <Text style={s.sysBannerIcon}>🔢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.sysBannerTitle}>System {result.systemSize} Bet Detected</Text>
                  <Text style={s.sysBannerSub}>
                    {result.expandedCombinationCount} combinations will be checked against the draw result
                    (C({result.systemSize},6) = {result.expandedCombinationCount} combos)
                  </Text>
                </View>
              </View>
            )}

            {/* Past Draw: Comparison Result */}
            {result.drawType === 'past' && result.comparison && (
              <View style={[s.compPanel, result.comparison.won ? s.compPanelWon : s.compPanelLost]}>
                <Text style={[s.compTitle, { color: result.comparison.won ? '#22c55e' : '#8b949e' }]}>
                  {result.comparison.won ? '🏆 Congratulations! You Won!' : '✗ No Match This Draw'}
                </Text>

                {result.comparison.won && result.comparison.prizeTier && (
                  <Text style={s.compPrize}>{result.comparison.prizeTier}</Text>
                )}

                {/* System bet breakdown */}
                {result.comparison.isSystemBet && (
                  <View style={s.sysBreakdown}>
                    <View style={s.sysStatRow}>
                      <View style={s.sysStat}>
                        <Text style={s.sysStatNum}>{result.comparison.totalCombosChecked ?? result.expandedCombinationCount ?? 0}</Text>
                        <Text style={s.sysStatLbl}>Checked</Text>
                      </View>
                      <View style={s.sysStat}>
                        <Text style={[s.sysStatNum, { color: result.comparison.won ? '#22c55e' : '#8b949e' }]}>
                          {result.comparison.totalWinningCombos ?? 0}
                        </Text>
                        <Text style={s.sysStatLbl}>Winning</Text>
                      </View>
                    </View>

                    {result.comparison.prizeBreakdown &&
                      Object.entries(result.comparison.prizeBreakdown).map(([prize, count]) => (
                        <View key={prize} style={s.breakdownRow}>
                          <Text style={s.breakdownPrize}>{prize}</Text>
                          <Text style={s.breakdownCount}>×{count as number}</Text>
                        </View>
                      ))
                    }
                  </View>
                )}

                {!result.comparison.isSystemBet && (result.comparison.matches?.length ?? 0) > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {(result.comparison.matches ?? []).map((m: any, i: number) => (
                      <Text key={i} style={s.matchLine}>
                        {m.number || (m.combination || []).join(',')} → {m.prize}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Future Draw Notice */}
            {result.drawType === 'future' && (
              <View style={s.futureBanner}>
                <Text style={s.futureBannerIcon}>🔔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.futureBannerTitle}>Draw Not Yet Held</Text>
                  <Text style={s.futureBannerSub}>
                    {result.systemSize
                      ? `System ${result.systemSize} — ${result.expandedCombinationCount} combinations will be auto-checked when results are published.`
                      : `We'll notify you automatically when the draw result is available.`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f1117' },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },

  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerTitle:{ fontSize: 26, fontWeight: '900', color: '#f0f6fc' },
  headerSub:  { fontSize: 13, color: '#8b949e', marginTop: 4, lineHeight: 18 },

  gameTabs: {
    flexDirection: 'row',
    backgroundColor: '#181c2a',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a2f45',
    padding: 4,
    marginTop: 14,
    marginBottom: 18,
  },
  gameTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTabActive4D: {
    backgroundColor: '#4a8fff',
  },
  gameTabActiveToto: {
    backgroundColor: '#7b9fff',
  },
  gameTabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f0f6fc',
  },
  gameTabSub: {
    fontSize: 11,
    color: '#8b949e',
    marginTop: 2,
  },
  resetWrap:  { marginBottom: 18 },
  resetLink:  { fontSize: 14, color: '#4a8fff', fontWeight: '600' },

  btnRow:        { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn:     { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
  actionPrimary4D: { backgroundColor: '#4a8fff', borderColor: '#4a8fff' },
  actionPrimaryToto: { backgroundColor: '#7b9fff', borderColor: '#7b9fff' },
  actionSecondary:{ backgroundColor: '#181c2a', borderColor: '#2a2f45' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  actionSub:  { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },

  tipBox:   { backgroundColor: '#181c2a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2f45', marginBottom: 16 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#4a8fff', marginBottom: 10 },
  tipText:  { fontSize: 13, color: '#8b949e', marginBottom: 6, lineHeight: 18 },

  previewWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#2a2f45' },
  preview:     { width: '100%', height: 260, backgroundColor: '#181c2a' },

  loadingBox:   { backgroundColor: '#181c2a', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#2a2f45', marginBottom: 16 },
  loadingTitle: { fontSize: 18, fontWeight: '800', color: '#f0f6fc', marginTop: 14, marginBottom: 6 },
  loadingDesc:  { fontSize: 13, color: '#8b949e', textAlign: 'center', marginBottom: 20 },
  steps:        { width: '100%' },
  step:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stepDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4a8fff' },
  stepText:     { fontSize: 13, color: '#8b949e' },

  errorBox:   { backgroundColor: '#1c1215', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#4a8fff44', marginBottom: 16 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#4a8fff', marginBottom: 6, marginTop: 12 },
  errorMsg:   { fontSize: 13, color: '#8b949e', textAlign: 'center', marginBottom: 16 },
  retryBtn:   { backgroundColor: '#4a8fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:  { color: '#fff', fontWeight: '700' },

  resultCard:    { backgroundColor: '#181c2a', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2f45', marginBottom: 16 },
  resultHeader:  { padding: 16, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e2235' },
  badge:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, marginBottom: 2, alignSelf: 'flex-start' },
  badgeText:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  resultSubhead: { fontSize: 13, color: '#8b949e' },
  savedBadge:    { backgroundColor: '#22c55e22', borderRadius: 999, borderWidth: 1, borderColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4 },
  savedText:     { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  dupeBadge:     { backgroundColor: 'rgba(139,148,158,.12)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(139,148,158,.3)', paddingHorizontal: 10, paddingVertical: 4 },
  dupeText:      { fontSize: 12, fontWeight: '700', color: '#8b949e' },

  resultBody: { padding: 16 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  field:      { flex: 1, minWidth: '45%', marginBottom: 14 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#8b949e', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  fieldValue: { fontSize: 16, fontWeight: '700', color: '#f0f6fc' },

  numSection: { marginTop: 16 },
  numLabel:   { fontSize: 10, fontWeight: '700', color: '#8b949e', letterSpacing: 0.8, marginBottom: 8 },
  numWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  numChipText:{ fontSize: 14, fontWeight: '800' },

  serialRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  serialVal: { fontSize: 13, color: '#c9d1d9', fontFamily: 'monospace' },
  idText:    { marginTop: 14, fontSize: 11, color: '#8b949e', fontFamily: 'monospace' },

  // System Bet Banner
  sysBanner:      { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: 'rgba(123,159,255,0.07)', borderTopWidth: 1, borderTopColor: 'rgba(123,159,255,0.2)' },
  sysBannerIcon:  { fontSize: 20 },
  sysBannerTitle: { fontSize: 14, fontWeight: '700', color: '#7b9fff', marginBottom: 4 },
  sysBannerSub:   { fontSize: 12, color: '#8b9bbf', lineHeight: 18 },

  // Comparison Panel
  compPanel:     { margin: 16, marginTop: 0, borderRadius: 10, padding: 14, borderWidth: 1 },
  compPanelWon:  { backgroundColor: 'rgba(34,197,94,0.07)',  borderColor: 'rgba(34,197,94,0.3)' },
  compPanelLost: { backgroundColor: 'rgba(107,142,181,0.06)', borderColor: 'rgba(107,142,181,0.2)' },
  compTitle:     { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  compPrize:     { fontSize: 22, fontWeight: '900', color: '#4a8fff', marginBottom: 10 },

  // System Bet Breakdown
  sysBreakdown: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(107,142,181,0.2)', paddingTop: 10 },
  sysStatRow:   { flexDirection: 'row', gap: 24, marginBottom: 10 },
  sysStat:      { alignItems: 'center' },
  sysStatNum:   { fontSize: 24, fontWeight: '900', color: '#f0f6fc' },
  sysStatLbl:   { fontSize: 11, color: '#8b949e', marginTop: 2 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(107,142,181,0.1)' },
  breakdownPrize: { fontSize: 13, color: '#c9d1d9' },
  breakdownCount: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  matchLine:    { fontSize: 12, color: '#c9d1d9', fontFamily: 'monospace', paddingVertical: 3 },

  // Future Draw Banner
  futureBanner:      { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: 'rgba(74,143,255,0.07)', borderTopWidth: 1, borderTopColor: 'rgba(74,143,255,0.2)' },
  futureBannerIcon:  { fontSize: 20 },
  futureBannerTitle: { fontSize: 14, fontWeight: '700', color: '#4a8fff', marginBottom: 4 },
  futureBannerSub:   { fontSize: 12, color: '#8b9bbf', lineHeight: 18 },
});
