import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../services/api';
import { scheduleDrawNotification } from '../services/notifScheduler';

// ── Prize rate tables (Singapore Pools) ──────────────────────────────────────

const PRIZE_RATES_4D = {
  Big: { '1st': 2000, '2nd': 1000, '3rd': 490, Starter: 250, Consolation: 60 },
  Small: { '1st': 3000, '2nd': 2000, '3rd': 800 },
};

function calc4DWinnings(prizeTier, betAmount) {
  const amt = parseFloat(betAmount) || 1;
  // prizeTier like "1st Prize (Big)", "Starter (Big)", "Consolation"
  const bigMatch   = prizeTier?.match(/\(Big\)/i);
  const smallMatch = prizeTier?.match(/\(Small\)/i);
  const tierName   = prizeTier?.replace(/\s*\(Big\)/i, '').replace(/\s*\(Small\)/i, '').trim();
  const table = bigMatch ? PRIZE_RATES_4D.Big : smallMatch ? PRIZE_RATES_4D.Small : PRIZE_RATES_4D.Big;
  const rate = table[tierName] ?? null;
  return rate !== null ? { rate, total: (rate * amt).toFixed(2) } : null;
}

// ── Shared: TOTO balls display ────────────────────────────────────────────────

function TotoBallsDisplay({ winningNums, addlNum }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <div className="caseb-gray-bar">Winning Numbers</div>
      <div className="toto-balls-row sp-padded">
        {(winningNums || []).map((n, i) => <div key={i} className="toto-ball-sp">{n}</div>)}
      </div>
      {addlNum && (
        <>
          <div className="caseb-gray-bar">Additional Number</div>
          <div className="toto-balls-row sp-padded" style={{ justifyContent: 'center' }}>
            <div className="toto-ball-sp addl">{addlNum}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Result: Win details ───────────────────────────────────────────────────────

function WinDetails({ result }) {
  const { comparison, amount, officialResult } = result;
  const winnings = calc4DWinnings(comparison.prizeTier, amount);

  return (
    <div className="rd-section">
      {/* Prize tier + calculation */}
      {result.gameType === '4D' && (
        <>
          <div className="rd-sub-label">Prize Tier</div>
          <div className="prize-tier-badge" style={{ marginBottom: 20 }}>{comparison.prizeTier}</div>
          {winnings && (
            <div className="prize-calc-row">
              <div className="prize-calc-cell">
                <span className="pcc-label">Bet Amount</span>
                <span className="pcc-val">${parseFloat(amount || 1).toFixed(2)}</span>
              </div>
              <div className="prize-calc-sep">×</div>
              <div className="prize-calc-cell">
                <span className="pcc-label">Rate per $1</span>
                <span className="pcc-val">${winnings.rate.toLocaleString()}</span>
              </div>
              <div className="prize-calc-sep">=</div>
              <div className="prize-calc-cell highlight">
                <span className="pcc-label">Total Prize</span>
                <span className="pcc-val win">${winnings.total}</span>
              </div>
            </div>
          )}
          {comparison.matches?.length > 0 && (
            <div className="rd-matched-row">
              <span className="rd-sub-label">Matched Number{comparison.matches.length > 1 ? 's' : ''}</span>
              <div className="number-pills" style={{ marginTop: 6 }}>
                {comparison.matches.map((n, i) => <span key={i} className="number-pill fourd match">{n}</span>)}
              </div>
            </div>
          )}
        </>
      )}

      {/* TOTO win */}
      {result.gameType === 'TOTO' && officialResult && (
        <>
          <TotoBallsDisplay winningNums={officialResult.winningNums} addlNum={officialResult.addlNum} />
          {officialResult.prizeGroups?.length > 0 && (() => {
            const wonGroup = officialResult.prizeGroups.find(g => g.group === comparison.prizeTier || comparison.prizeTier?.includes(g.group));
            return wonGroup ? (
              <div style={{ marginTop: 12 }}>
                <div className="rd-sub-label">{wonGroup.group} Prize Share</div>
                <div className="sp-group1-prize" style={{ fontSize: 24 }}>{wonGroup.shareAmount}</div>
              </div>
            ) : null;
          })()}
          {(result.isSystemBet || result.expandedCombinationCount > 1) && (
            <div className="system-bet-summary win" style={{ marginTop: 16 }}>
              <div className="sys-summary-label">System {result.systemSize || comparison?.systemSize} Bet Results</div>
              <div className="sys-summary-stats">
                <div className="sys-stat">
                  <span className="sys-stat-num">{result.expandedCombinationCount || comparison?.totalCombosChecked || 0}</span>
                  <span className="sys-stat-lbl">Combinations Checked</span>
                </div>
                <div className="sys-stat">
                  <span className="sys-stat-num win">{comparison?.totalWinningCombos || 0}</span>
                  <span className="sys-stat-lbl">Winning Combinations</span>
                </div>
              </div>
              {comparison?.prizeBreakdown && Object.keys(comparison.prizeBreakdown).length > 0 && (
                <div className="sys-prize-breakdown">
                  {Object.entries(comparison.prizeBreakdown).map(([prize, count]) => (
                    <div key={prize} className="sys-breakdown-row">
                      <span>{prize}</span>
                      <span className="sys-breakdown-count">×{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Result: Loss / draw result ────────────────────────────────────────────────

function LossDetails({ result }) {
  const { officialResult, gameType, drawDate } = result;

  if (!officialResult) return (
    <div className="rd-section">
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Draw result data unavailable — check Singapore Pools.</p>
    </div>
  );

  return (
    <div className="rd-section">
      {/* 4D: top-3 prize cards + starters/consolation chips */}
      {gameType === '4D' && (
        <>
          <div className="rd-sub-label" style={{ marginBottom: 14 }}>Draw Result — {drawDate}</div>

          {/* Top 3 prize cards */}
          <div className="top-prizes-grid">
            {[
              { rank: '1st', num: officialResult.first,  cls: 'first'  },
              { rank: '2nd', num: officialResult.second, cls: 'second' },
              { rank: '3rd', num: officialResult.third,  cls: 'third'  },
            ].filter(p => p.num).map(p => (
              <div className="prize-card" key={p.rank}>
                <div className={`prize-rank-badge ${p.cls}`}>{p.rank} Prize</div>
                <div className="prize-card-num">{p.num}</div>
              </div>
            ))}
          </div>

          {/* Starters */}
          {officialResult.starters?.length > 0 && (
            <div className="prize-group">
              <div className="prize-group-label">Starters <span>({officialResult.starters.length})</span></div>
              <div className="prize-group-chips">
                {officialResult.starters.map((n, i) => <span key={i} className="draw-chip">{n}</span>)}
              </div>
            </div>
          )}

          {/* Consolation */}
          {officialResult.consolation?.length > 0 && (
            <div className="prize-group">
              <div className="prize-group-label">Consolation <span>({officialResult.consolation.length})</span></div>
              <div className="prize-group-chips">
                {officialResult.consolation.map((n, i) => <span key={i} className="draw-chip">{n}</span>)}
              </div>
            </div>
          )}
        </>
      )}

      {/* TOTO: balls + prize groups */}
      {gameType === 'TOTO' && (
        <>
          <div className="rd-sub-label" style={{ marginBottom: 14 }}>Draw Result — {drawDate}</div>
          <TotoBallsDisplay winningNums={officialResult.winningNums} addlNum={officialResult.addlNum} />
          {officialResult.prizeGroups?.length > 0 && (
            <>
              <div className="rd-sub-label" style={{ marginTop: 16, marginBottom: 10 }}>Winning Shares</div>
              <table className="sp-shares-table caseb-shares">
                <thead><tr><th>Prize Group</th><th>Share Amount</th><th>Winning Shares</th></tr></thead>
                <tbody>
                  {officialResult.prizeGroups.map((g, i) => (
                    <tr key={i}><td>{g.group}</td><td>{g.shareAmount}</td><td>{Number(g.winningShares).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {(result.isSystemBet || result.expandedCombinationCount > 1) && (
            <div className="system-bet-summary loss" style={{ marginTop: 16 }}>
              <div className="sys-summary-label">System {result.systemSize} Bet — {result.expandedCombinationCount || 0} Combinations Checked</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                None of the {result.expandedCombinationCount} C({result.systemSize},6) combinations matched.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Future draw notice (Case A) ───────────────────────────────────────────────

function FutureDrawNotice({ result }) {
  const [perm, setPerm] = useState(
    () => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Result release times in SGT
  const releaseTime = result.gameType === 'TOTO' ? '9:30 PM' : '6:30 PM';
  const releaseDay  = result.drawDate || 'the draw date';

  const enableNotifs = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') {
      // Re-schedule now that permission is granted
      scheduleDrawNotification({
        id:           result.id,
        gameType:     result.gameType,
        drawDate:     result.drawDate,
        serialNumber: result.serialNumber || null,
      });
      new Notification('SGLottery — Notification scheduled', {
        body: `You'll be alerted when ${result.gameType} draw ${result.drawDate} results are out (${releaseTime} SGT).`,
        icon: '/favicon.ico',
      });
    }
  };

  return (
    <div className="future-notice-card">
      {/* Header */}
      <div className="future-notice-header">
        <div className="future-notice-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h3 className="future-notice-title">Draw Result Pending</h3>
      </div>

      <div className="future-notice-divider" />

      <div className="future-notice-body">
        <p className="future-notice-text">
          Your <strong>{result.gameType}</strong> ticket for <strong>{releaseDay}</strong> has been saved.
          Results are published at <strong>{releaseTime} SGT</strong> on draw day.
        </p>

        {/* Timeline */}
        <div className="future-timeline">
          <div className="future-tl-item done">
            <div className="future-tl-dot done" />
            <div className="future-tl-content">
              <span className="future-tl-title">Ticket uploaded &amp; saved</span>
              <span className="future-tl-sub">Numbers extracted and stored</span>
            </div>
          </div>
          <div className="future-tl-line" />
          <div className="future-tl-item">
            <div className="future-tl-dot" />
            <div className="future-tl-content">
              <span className="future-tl-title">Results published — {releaseTime} SGT</span>
              <span className="future-tl-sub">{releaseDay} · Singapore Pools official</span>
            </div>
          </div>
          <div className="future-tl-line" />
          <div className="future-tl-item">
            <div className="future-tl-dot" />
            <div className="future-tl-content">
              <span className="future-tl-title">Auto-check &amp; notification</span>
              <span className="future-tl-sub">We check your numbers and alert you if you won</span>
            </div>
          </div>
        </div>
      </div>

      <div className="future-notice-divider" />

      {/* Notification CTA */}
      <div className="future-notice-notif-row">
        {perm === 'granted' ? (
          <div className="future-notif-confirmed">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Notification scheduled — you'll be alerted at <strong>{releaseTime} SGT</strong></span>
          </div>
        ) : perm === 'denied' ? (
          <p className="future-notif-blocked">
            Notifications are blocked in your browser. Enable them in browser settings to receive draw alerts.
          </p>
        ) : perm === 'unsupported' ? (
          <p className="future-notif-blocked">Your browser does not support notifications.</p>
        ) : (
          <div className="future-notif-cta">
            <p className="future-notif-cta-text">Get notified when results are out:</p>
            <button className="fdn-notify-btn" onClick={enableNotifs}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Enable Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [preview, setPreview]   = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef     = useRef(null);
  const currentFile = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, HEIC, etc.).');
      return;
    }
    currentFile.current = file;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResult(null);
    setError(null);

    const form = new FormData();
    form.append('ticket', file);

    const headers = {};
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res  = await fetch(`${BASE_URL}/tickets/upload`, { method: 'POST', headers, body: form });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Backend returned an unexpected response (HTTP ${res.status}).`); }
      if (!res.ok) throw new Error(data.error || 'Server error');
      setResult(data);
      // Schedule a draw-result notification if this is a future-draw ticket
      if (data.drawType === 'future' && data.id) {
        scheduleDrawNotification({
          id:           data.id,
          gameType:     data.gameType,
          drawDate:     data.drawDate,
          serialNumber: data.serialNumber || null,
        });
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDragOver  = e => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = e  => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const onFileChange = e => { const f = e.target.files[0]; if (f) processFile(f); };

  const reset = () => {
    setPreview(null); setResult(null); setError(null);
    currentFile.current = null;
    if (fileRef.current) fileRef.current.value = '';
  };

  const is4D = result?.gameType === '4D';

  return (
    <div className="page page-narrow">
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {result && <span className={`badge ${is4D ? 'badge-4d' : 'badge-toto'}`}>{result.gameType}</span>}
          <h1 className="page-title" style={{ marginBottom: 0 }}>Upload Ticket</h1>
        </div>
        <p className="page-sub" style={{ marginBottom: 0 }}>
          Drag &amp; drop, browse, or take a photo
        </p>
      </div>

      {/* Drop Zone */}
      {!preview && (
        <div
          className={`upload-zone${dragging ? ' drag-active' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} />
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 17 12 21 16 17"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
            </svg>
          </div>
          <h3>Drag &amp; drop or click to upload</h3>
          <p>Supports JPG, PNG, HEIC and other image formats</p>
          <div className="or">or</div>
          <div className="upload-actions">
            <button className="upload-btn upload-btn-browse" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Browse Files
            </button>
            <button className="upload-btn upload-btn-camera" onClick={() => { if (fileRef.current) { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click(); } }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Use Camera
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !loading && (
        <div className="preview-section">
          <img src={preview} alt="Ticket preview" />
          {!result && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => processFile(currentFile.current)}>Re-process</button>
              <button className="btn btn-secondary" onClick={reset}>Upload Different</button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ocr-loading">
          <div className="spinner" />
          <strong>Processing your ticket<span className="loading-dots">...</span></strong>
          {preview && <img src={preview} alt="preview" style={{ width: 160, borderRadius: 8, opacity: 0.5 }} />}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-box">
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div><strong>Error</strong><p style={{ marginTop: 4, fontSize: 14 }}>{error}</p></div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="result-card">

          {/* ── Header ── */}
          <div className="ticket-detail-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span className={`badge ${is4D ? 'badge-4d' : 'badge-toto'}`}>{result.gameType}</span>
                <h2>{result.serialNumber ? `Serial: ${result.serialNumber}` : 'Scanned Ticket'}</h2>
              </div>
              <p>Review your scanned ticket details below.</p>
            </div>
            <div className="ticket-header-actions">
              {result.duplicate
                ? <span className="badge" style={{ background: 'rgba(139,148,158,.15)', color: '#8b949e', border: '1px solid rgba(139,148,158,.3)', fontSize: 12 }}>⚠ Already saved</span>
                : <span className="badge badge-saved">✓ Saved</span>
              }
              <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={reset}>
                Scan Another
              </button>
            </div>
          </div>

          {/* ── Meta strip ── */}
          <div className="ticket-meta-row">
            <div className="ticket-meta-cell">
              <label>Game Type</label>
              <span style={{ color: is4D ? '#7aa4e0' : 'var(--gold)' }}>{result.gameType}</span>
            </div>
            <div className="ticket-meta-cell">
              <label>Draw Date</label>
              <span>{result.drawDate || '—'}</span>
            </div>
            <div className="ticket-meta-cell">
              <label>Bet Type</label>
              <span>{result.betType}</span>
            </div>
            {(result.systemSize || result.betType === 'iBet' || result.betType === 'Group TOTO') && (
              <div className="ticket-meta-cell">
                <label>Combinations</label>
                <span style={{ color: 'var(--gold)' }}>
                  {result.systemSize ? `Sys ${result.systemSize} — ` : ''}{result.combinationCount || result.numbers?.length}
                </span>
              </div>
            )}
          </div>

          {/* ── Your Numbers ── */}
          {result.numbers?.length > 0 && (
            <div className="rd-your-numbers">
              <div className="rd-sub-label">Your Numbers</div>
              <div className="number-pills">
                {result.numbers.map((n, i) => (
                  <span key={i} className={`number-pill ${is4D ? 'fourd' : 'toto'}`}>{n}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── Status strip ── */}
          {result.drawType === 'past' && result.comparison && (
            <div className={`ticket-status-strip ${result.comparison.won ? 'won' : 'lost'}`}>
              {result.comparison.won ? (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <div>
                    <div className="status-strip-title won">Congratulations — You Won!</div>
                    <div className="status-strip-sub">Your ticket matched a prize tier for this draw</div>
                  </div>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <div>
                    <div className="status-strip-title lost">Not Won — Better Luck Next Time</div>
                    <div className="status-strip-sub">Your numbers did not match any prize tier for draw {result.drawDate}</div>
                  </div>
                </>
              )}
            </div>
          )}
          {result.drawType === 'future' && (
            <div className="ticket-status-strip pending">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a8fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>
                <div className="status-strip-title pending">Draw Result Pending</div>
                <div className="status-strip-sub">Results for draw {result.drawDate} are not yet available — we'll check automatically</div>
              </div>
            </div>
          )}

          {/* ── Draw details ── */}
          {result.drawType === 'past' && result.comparison && (
            result.comparison.won
              ? <WinDetails result={result} />
              : <LossDetails result={result} />
          )}
          {result.drawType === 'future' && (
            <div style={{ padding: '24px' }}>
              <FutureDrawNotice result={result} />
            </div>
          )}

          <div className="ticket-table-footer">
            Ticket ID: <code style={{ fontFamily: 'monospace' }}>{result.ticketId}</code>
          </div>

        </div>
      )}
    </div>
  );
}
