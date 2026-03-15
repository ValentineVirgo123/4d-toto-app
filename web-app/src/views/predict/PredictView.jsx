// VIEW layer — predictive analysis.
import { useState, useEffect } from 'react';
import { usePredictInteractor } from '../../interactors/usePredictInteractor';
import { Mascot } from '../../components/Mascot';

// ── SVG icons ─────────────────────────────────────────────────────────────────

const IconFrequency = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const IconHotCold = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);

const IconOddEven = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <path d="M3 9l9-7 9 7"/><path d="M3 15l9 7 9-7"/>
  </svg>
);

const IconRefresh = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const MODEL_ICONS   = { frequency: IconFrequency, hot_cold: IconHotCold, odd_even: IconOddEven };
const MODEL_NAMES   = ['Digit Frequency', 'Hot & Cold', 'Odd & Even'];
const MODEL_HINTS   = {
  frequency: { fourd: 'Highest-frequency digit chosen per position from historical draws.', toto: 'Primary: 6 most frequently drawn numbers. Supplementary: next 6 by frequency.' },
  hot_cold:  { fourd: 'Most repeated prize number from recent draws.',                     toto: 'Primary: 6 hottest (most recent). Supplementary: 6 coldest (longest absent).' },
  odd_even:  { fourd: 'Digit per position matching the most common odd/even pattern.',     toto: 'Numbers matching the most common odd/even and low/high profile of past wins.' },
};

const FOURD_ACCENTS = ['#4a8fff', '#7b9fff', '#a0b8ff'];
const TOTO_ACCENTS  = ['#7b9fff', '#4a8fff', '#a0b8ff'];

// ── 4D Digit Display ──────────────────────────────────────────────────────────

function FourDDigits({ number, accent }) {
  const digits = String(number ?? '????').split('');
  return (
    <div className="predict-digits-row">
      {digits.map((d, i) => (
        <div key={i} className="predict-digit-box" style={{ borderColor: accent, background: `${accent}10`, color: accent }}>
          {d}
        </div>
      ))}
    </div>
  );
}

// ── TOTO Ball ─────────────────────────────────────────────────────────────────

function PredictBall({ n, variant }) {
  const styles = {
    primary:       { background: 'rgba(74,143,255,0.15)',  border: '1.5px solid rgba(74,143,255,0.45)',  color: '#7b9fff' },
    supplementary: { background: 'rgba(123,159,255,0.12)', border: '1.5px solid rgba(123,159,255,0.4)',  color: '#a0b8ff' },
  };
  return (
    <span className="predict-ball" style={styles[variant] ?? styles.primary}>{n}</span>
  );
}

// ── Model Card ────────────────────────────────────────────────────────────────

function ModelCard({ model, index, gameTab }) {
  const accent  = gameTab === '4d' ? FOURD_ACCENTS[index] : TOTO_ACCENTS[index];
  const ModelIcon = MODEL_ICONS[model.modelId] ?? IconFrequency;
  const hint    = MODEL_HINTS[model.modelId]?.[gameTab] ?? '';
  const primary = (model.predictedTOTO ?? []).slice(0, 6);
  const supp    = (model.predictedTOTO ?? []).slice(6, 12);

  return (
    <div className="predict-card" style={{ borderLeftColor: accent }}>
      {/* Header */}
      <div className="predict-card-header">
        <div className="predict-card-title">
          <span className="predict-card-icon" style={{ color: accent }}><ModelIcon size={17} /></span>
          <span style={{ color: accent, fontWeight: 800, fontSize: 15 }}>{model.model}</span>
        </div>
        <span className="predict-card-badge" style={{ background: `${accent}14`, color: accent, borderColor: `${accent}40` }}>
          {gameTab === '4d' ? 'STAT ONLY' : 'SYSTEM 12'}
        </span>
      </div>

      {/* Body */}
      <div className="predict-card-body">
        {gameTab === '4d' ? (
          <>
            <p className="predict-section-label">Predicted 4D Number</p>
            <FourDDigits number={model.predicted4D} accent={accent} />
          </>
        ) : (
          <>
            {/* Primary */}
            <div className="predict-balls-group">
              <div className="predict-balls-label">
                <span className="predict-balls-dot" style={{ background: '#4a8fff' }} />
                <span style={{ color: '#4a8fff' }}>Primary Numbers</span>
                <span className="predict-balls-count">{primary.length}</span>
              </div>
              <div className="predict-balls-row">
                {primary.map((n, i) => <PredictBall key={i} n={n} variant="primary" />)}
              </div>
            </div>
            {/* Supplementary */}
            <div className="predict-balls-group">
              <div className="predict-balls-label">
                <span className="predict-balls-dot" style={{ background: '#7b9fff' }} />
                <span style={{ color: '#7b9fff' }}>Supplementary</span>
                <span className="predict-balls-count">{supp.length}</span>
              </div>
              <div className="predict-balls-row">
                {supp.map((n, i) => <PredictBall key={i} n={n} variant="supplementary" />)}
              </div>
            </div>
          </>
        )}
        <p className="predict-hint">{hint}</p>
      </div>
    </div>
  );
}

// ── Comparison Strip ──────────────────────────────────────────────────────────

function CompareStrip({ predictions, gameTab }) {
  const accents = gameTab === '4d' ? FOURD_ACCENTS : TOTO_ACCENTS;
  return (
    <div className="predict-compare-wrap">
      <p className="predict-section-label" style={{ marginBottom: 12 }}>All Models — Side by Side</p>
      <div className="predict-compare-grid">
        {predictions.map((m, i) => {
          const accent  = accents[i];
          const ModelIcon = MODEL_ICONS[m.modelId] ?? IconFrequency;
          const primary = (m.predictedTOTO ?? []).slice(0, 6);
          return (
            <div key={m.modelId} className="predict-compare-col" style={{ borderColor: `${accent}30` }}>
              {/* Col header */}
              <div className="predict-compare-col-head" style={{ borderBottomColor: `${accent}25`, background: `${accent}0a` }}>
                <span style={{ color: accent }}><ModelIcon size={14} /></span>
                <span style={{ color: accent, fontWeight: 700, fontSize: 12 }}>{MODEL_NAMES[i]}</span>
              </div>
              {/* Col value */}
              <div className="predict-compare-val">
                {gameTab === '4d' ? (
                  <span className="predict-compare-num" style={{ color: accent }}>{m.predicted4D ?? '????'}</span>
                ) : (
                  <div className="predict-compare-balls">
                    {primary.map((n, j) => (
                      <span key={j} className="predict-compare-ball" style={{ background: `${accent}18`, borderColor: accent, color: accent }}>{n}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="predict-card skeleton-row">
      <div className="predict-card-header">
        <div className="skel-box" style={{ width: 140, height: 18, borderRadius: 6 }} />
        <div className="skel-box" style={{ width: 72, height: 20, borderRadius: 6 }} />
      </div>
      <div className="predict-card-body">
        <div className="skel-box" style={{ width: 100, height: 12, borderRadius: 4, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          {[0,1,2,3].map(i => <div key={i} className="skel-box" style={{ flex: 1, height: 80, borderRadius: 10 }} />)}
        </div>
      </div>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

export function PredictView() {
  const { predictions, meta, loading, error, fetchPredictions } = usePredictInteractor();
  const [gameTab,     setGameTab]     = useState('4d');
  const [activeModel, setActiveModel] = useState(0);

  useEffect(() => { fetchPredictions(); }, []);

  const switchGame = (tab) => { setGameTab(tab); setActiveModel(0); };
  const selected   = predictions[activeModel] ?? null;
  const accents    = gameTab === '4d' ? FOURD_ACCENTS : TOTO_ACCENTS;

  return (
    <div className="page">

      {/* Header */}
      <div className="predict-page-header">
        <div>
          <h1 className="page-title">Predictive Analysis</h1>
          <p className="page-sub">3 statistical models · Singapore Pools historical data</p>
        </div>
        <button className="predict-regen-btn" onClick={fetchPredictions} disabled={loading}>
          <IconRefresh />
          {loading ? 'Loading…' : 'Regenerate'}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="predict-disclaimer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a83c" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span><strong style={{ color: '#c9a83c' }}>Educational only.</strong> Predictions are NOT for gambling. Lottery draws are independent random events.</span>
      </div>

      {/* Stats bar */}
      {meta && (
        <div className="predict-stats-row">
          <div className="predict-stat-chip">
            <span className="predict-stat-num" style={{ color: '#4a8fff' }}>{meta.dataPoints?.fourd ?? 0}</span>
            <span className="predict-stat-lbl">4D Records</span>
          </div>
          <div className="predict-stat-div" />
          <div className="predict-stat-chip">
            <span className="predict-stat-num" style={{ color: '#7b9fff' }}>{meta.dataPoints?.toto ?? 0}</span>
            <span className="predict-stat-lbl">TOTO Records</span>
          </div>
          <div className="predict-stat-div" />
          <div className="predict-stat-chip">
            <span className="predict-stat-num">3</span>
            <span className="predict-stat-lbl">Models</span>
          </div>
        </div>
      )}

      {/* Game tabs */}
      <div className="predict-game-tabs">
        {[
          { key: '4d',   label: '4D Predictions',  color: '#4a8fff' },
          { key: 'toto', label: 'TOTO Predictions', color: '#7b9fff' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            className="predict-game-tab"
            onClick={() => switchGame(key)}
            style={gameTab === key
              ? { background: color, color: '#fff', borderColor: color }
              : { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-2)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <><SkeletonCard /><SkeletonCard /></>}

      {/* Error */}
      {error && !loading && (
        <div className="results-error-box" style={{ flexDirection: 'column', alignItems: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <Mascot state="sad" size={80} />
          <p style={{ color: '#f87171', fontWeight: 700, fontSize: 15, marginTop: 16 }}>Could not load predictions</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>{error}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={fetchPredictions}>Try Again</button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && predictions.length > 0 && (
        <>
          {/* Model selector */}
          <div className="predict-model-tabs">
            {predictions.map((m, i) => {
              const accent   = accents[i];
              const ModelIcon = MODEL_ICONS[m.modelId] ?? IconFrequency;
              const isActive = activeModel === i;
              return (
                <button
                  key={m.modelId}
                  onClick={() => setActiveModel(i)}
                  className="predict-model-tab"
                  style={isActive
                    ? { background: accent, borderColor: accent, color: '#fff' }
                    : { background: 'transparent', borderColor: `${accent}45`, color: accent }
                  }
                >
                  <ModelIcon size={14} />
                  {MODEL_NAMES[i]}
                </button>
              );
            })}
          </div>

          {/* Active model card */}
          {selected && (
            <ModelCard model={selected} index={activeModel} gameTab={gameTab} />
          )}

          {/* Comparison strip */}
          <CompareStrip predictions={predictions} gameTab={gameTab} />

          {/* Footer */}
          {meta?.generatedAt && (
            <p className="predict-footer">
              Generated {new Date(meta.generatedAt).toLocaleString('en-SG')} · Source: Singapore Pools via Firestore
            </p>
          )}
        </>
      )}
    </div>
  );
}
