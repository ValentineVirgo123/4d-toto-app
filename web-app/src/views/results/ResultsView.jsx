import { useState, useEffect } from 'react';
import { useResultsInteractor } from '../../interactors/useResultsInteractor';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse DD/MM/YY or DD/MM/YYYY → Date object (midnight local) */
function parseDDMMYY(str) {
  const m = String(str).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
  const d = new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function isFutureDateStr(str) {
  const d = parseDDMMYY(str);
  if (!d) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d > today;
}

/** Returns false if there's no draw of that game on the given date (past or present) */
function isDrawDay(str, game) {
  const d = parseDDMMYY(str);
  if (!d) return true; // unknown — don't block
  const day = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  if (game === '4d')   return day === 0 || day === 3 || day === 6; // Sun/Wed/Sat
  if (game === 'toto') return day === 1 || day === 4;              // Mon/Thu
  return true;
}

function formatDrawDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('/');
  if (parts.length !== 3) return dateStr;
  const [dd, mm, yyyy] = parts;
  const year = parseInt(yyyy);
  const fullYear = year < 100 ? 2000 + year : year;
  const d = new Date(fullYear, parseInt(mm) - 1, parseInt(dd));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── 4D Table ──────────────────────────────────────────────────────────────────

function FourDTable({ results, hasSearch }) {
  const [expanded, setExpanded] = useState(null);

  const toggle = (i) => setExpanded(expanded === i ? null : i);

  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th style={{ width: 80 }}></th>
            <th style={{ textAlign: 'left' }}>Draw Date</th>
            <th>Draw No.</th>
            <th>1st Prize</th>
            <th>2nd Prize</th>
            <th>3rd Prize</th>
            <th style={{ width: 48 }}></th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const isLatest = i === 0 && !hasSearch;
            const isOpen   = expanded === i;
            return (
              <>
                <tr
                  key={`row-${i}`}
                  className={`results-row fourd${isOpen ? ' row-open' : ''}`}
                  onClick={() => toggle(i)}
                >
                  {/* Badge */}
                  <td className="td-badge">
                    {isLatest && <span className="badge-latest">LATEST</span>}
                  </td>

                  {/* Date */}
                  <td className="td-date">
                    <span className="draw-date-text">{formatDrawDate(r.drawDate)}</span>
                  </td>

                  {/* Draw number */}
                  <td className="td-center">
                    <span className="draw-no">#{r.drawNumber || '—'}</span>
                  </td>

                  {/* 1st Prize */}
                  <td className="td-center">
                    <span className="prize-num gold">{r.first || '—'}</span>
                  </td>

                  {/* 2nd Prize */}
                  <td className="td-center">
                    <span className="prize-num silver">{r.second || '—'}</span>
                  </td>

                  {/* 3rd Prize */}
                  <td className="td-center">
                    <span className="prize-num sm">{r.third || '—'}</span>
                  </td>

                  {/* Expand chevron */}
                  <td className="td-center">
                    <span className={`expand-chevron${isOpen ? ' open' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </span>
                  </td>
                </tr>

                {/* Expanded row: starters + consolation */}
                {isOpen && (
                  <tr key={`exp-${i}`} className="results-row-expanded">
                    <td colSpan={7}>
                      <div className="expanded-panel fourd-panel">
                        <div className="expanded-group">
                          <div className="expanded-group-label">
                            Starter Prizes
                            <span className="expanded-count">({(r.starters || []).length})</span>
                          </div>
                          <div className="expanded-chips">
                            {(r.starters || []).map((n, j) => (
                              <span key={j} className="result-chip">{n}</span>
                            ))}
                          </div>
                        </div>
                        <div className="expanded-divider" />
                        <div className="expanded-group">
                          <div className="expanded-group-label">
                            Consolation Prizes
                            <span className="expanded-count">({(r.consolation || []).length})</span>
                          </div>
                          <div className="expanded-chips">
                            {(r.consolation || []).map((n, j) => (
                              <span key={j} className="result-chip">{n}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── TOTO Table ────────────────────────────────────────────────────────────────

function TOTOBall({ n, isAddl }) {
  return (
    <span
      className="toto-ball-sm"
      style={isAddl
        ? { background: '#4a8fff', color: '#fff' }
        : { background: 'rgba(123,159,255,0.15)', border: '1px solid rgba(123,159,255,0.4)', color: '#7b9fff' }
      }
    >
      {n}
    </span>
  );
}

function TOTOTable({ results, hasSearch }) {
  const [expanded, setExpanded] = useState(null);
  const toggle = (i) => setExpanded(expanded === i ? null : i);

  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th style={{ width: 80 }}></th>
            <th style={{ textAlign: 'left' }}>Draw Date</th>
            <th>Draw No.</th>
            <th>Winning Numbers</th>
            <th>Add'l</th>
            <th style={{ width: 48 }}></th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const isLatest = i === 0 && !hasSearch;
            const isOpen   = expanded === i;
            const hasGroups = r.prizeGroups?.length > 0;
            return (
              <>
                <tr
                  key={`row-${i}`}
                  className={`results-row toto${isOpen ? ' row-open' : ''}${hasGroups ? ' clickable' : ''}`}
                  onClick={() => hasGroups && toggle(i)}
                >
                  <td className="td-badge">
                    {isLatest && <span className="badge-latest toto">LATEST</span>}
                  </td>

                  <td className="td-date">
                    <span className="draw-date-text">{formatDrawDate(r.drawDate)}</span>
                  </td>

                  <td className="td-center">
                    <span className="draw-no">#{r.drawNumber || '—'}</span>
                  </td>

                  {/* Winning numbers as balls */}
                  <td className="td-balls">
                    <div className="toto-balls-row-sm">
                      {(r.winningNums || []).map((n, j) => <TOTOBall key={j} n={n} />)}
                    </div>
                  </td>

                  {/* Additional number */}
                  <td className="td-center">
                    {r.addlNum != null
                      ? <TOTOBall n={r.addlNum} isAddl />
                      : <span className="draw-no">—</span>
                    }
                  </td>

                  <td className="td-center">
                    {hasGroups && (
                      <span className={`expand-chevron${isOpen ? ' open' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </span>
                    )}
                  </td>
                </tr>

                {/* Expanded row: prize groups table */}
                {isOpen && hasGroups && (
                  <tr key={`exp-${i}`} className="results-row-expanded">
                    <td colSpan={6}>
                      <div className="expanded-panel toto-panel">
                        <table className="prize-groups-table">
                          <thead>
                            <tr>
                              <th>Prize Group</th>
                              <th>Share Amount</th>
                              <th>No. of Winners</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.prizeGroups.map((g, j) => (
                              <tr key={j}>
                                <td>{g.group}</td>
                                <td style={{ color: '#7b9fff', fontWeight: 700 }}>{g.shareAmount || '—'}</td>
                                <td>{Number(g.winningShares || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Future Draw Notice ────────────────────────────────────────────────────────

function FutureDrawNotice({ dateStr, game, onClear }) {
  const [notifState, setNotifState] = useState('idle'); // idle | granted | denied | unsupported

  const d = parseDDMMYY(dateStr);
  const displayDate = d
    ? d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : dateStr;

  const handleNotify = async () => {
    if (!('Notification' in window)) { setNotifState('unsupported'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifState('granted');
      new Notification(`SGLottery — ${game.toUpperCase()} Draw Alert Set`, {
        body: `We'll remind you to check results for ${displayDate}.`,
        icon: '/favicon.ico',
      });
    } else {
      setNotifState('denied');
    }
  };

  return (
    <div className="future-draw-notice">
      {/* Icon */}
      <div className="fdn-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a8fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>

      {/* Text */}
      <div className="fdn-body">
        <p className="fdn-title">Draw Not Yet Held</p>
        <p className="fdn-sub">
          <strong style={{ color: '#4a8fff' }}>{displayDate}</strong> is a future draw date.
          Results will be published on Singapore Pools after the draw closes.
        </p>

        {/* Notification CTA */}
        {notifState === 'idle' && (
          <div className="fdn-cta">
            <p className="fdn-cta-label">Want to be notified when this draw result is out?</p>
            <button className="fdn-notify-btn" onClick={handleNotify}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Enable Notifications
            </button>
          </div>
        )}

        {notifState === 'granted' && (
          <div className="fdn-notif-ok">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Notifications enabled — we'll remind you when results are available.
          </div>
        )}

        {notifState === 'denied' && (
          <p className="fdn-notif-denied">
            Notifications blocked. Please enable them in your browser settings to receive draw alerts.
          </p>
        )}

        {notifState === 'unsupported' && (
          <p className="fdn-notif-denied">
            Your browser does not support notifications.
          </p>
        )}
      </div>

      {/* Clear button */}
      <button className="fdn-clear" onClick={onClear} title="Clear search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────

function SearchBar({ tab, onSearch, onClear, searching, hasSearch }) {
  const [date, setDate] = useState('');
  const [err,  setErr]  = useState('');

  const submit = (e) => {
    e.preventDefault();
    const v = date.trim();
    if (!v) { setErr('Enter a draw date.'); return; }
    if (!/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)) { setErr('Use format DD/MM/YY'); return; }
    setErr(''); onSearch(tab, v);
  };

  const clear = () => { setDate(''); setErr(''); onClear(); };

  return (
    <div className="results-search-bar">
      <p className="results-search-label">Search by Draw Date</p>
      <form onSubmit={submit} className="results-search-form">
        <input
          type="text"
          placeholder="DD/MM/YY  e.g. 15/03/26"
          value={date}
          onChange={e => { setDate(e.target.value); setErr(''); }}
          className="results-search-input"
        />
        <button type="submit" disabled={searching} className="results-search-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Search
        </button>
        {hasSearch && (
          <button type="button" onClick={clear} className="results-clear-btn">✕ Clear</button>
        )}
      </form>
      {err && <p className="results-search-error">{err}</p>}
      {!hasSearch && (
        <p className="results-search-hint">
          Showing last 7 days by default · Search any date to look up a specific draw
        </p>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            {['', 'Draw Date', 'Draw No.', '1st Prize', '2nd Prize', '3rd Prize', ''].map((h, i) => (
              <th key={i} style={{ textAlign: i === 1 ? 'left' : 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} className="results-row fourd skeleton-row">
              <td><div className="skel-box w-14 h-5" /></td>
              <td><div className="skel-box w-40 h-5" /></td>
              <td className="td-center"><div className="skel-box w-16 h-5 mx-auto" /></td>
              <td className="td-center"><div className="skel-box w-16 h-9 mx-auto" /></td>
              <td className="td-center"><div className="skel-box w-16 h-8 mx-auto" /></td>
              <td className="td-center"><div className="skel-box w-16 h-8 mx-auto" /></td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

export function ResultsView() {
  const { fourdResults, totoResults, loading, searching, refreshing, error,
          fetch4D, fetchTOTO, searchByDate, scrapeLatest } = useResultsInteractor();
  const [tab,               setTab]              = useState('4d');
  const [hasSearch,         setHasSearch]        = useState(false);
  const [searchedDate,      setSearchedDate]     = useState('');
  const [interceptedSearch, setInterceptedSearch] = useState(false);

  useEffect(() => {
    setHasSearch(false);
    setSearchedDate('');
    setInterceptedSearch(false);
    tab === '4d' ? fetch4D(7) : fetchTOTO(7);
  }, [tab]);

  const handleSearch = async (game, date) => {
    setSearchedDate(date);
    // Skip the API entirely for future dates or non-draw days — answer is always "no result"
    if (isFutureDateStr(date) || !isDrawDay(date, game)) {
      setHasSearch(true);
      setInterceptedSearch(true);  // hides stale results from previous load
      return;
    }
    setInterceptedSearch(false);
    const found = await searchByDate(game, date);
    setHasSearch(true);
    if (!found) setHasSearch(false);
  };

  const handleClear = () => {
    setHasSearch(false);
    setSearchedDate('');
    setInterceptedSearch(false);
    tab === '4d' ? fetch4D(7) : fetchTOTO(7);
  };

  const refresh = async () => {
    await scrapeLatest();
    tab === '4d' ? fetch4D(7) : fetchTOTO(7);
  };

  const results = tab === '4d' ? fourdResults : totoResults;

  return (
    <div className="page text-white">

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2">Past Results</h1>
        <p style={{ color: '#6b8eb5' }}>Official Singapore Pools winning numbers</p>
      </div>

      {/* Game tabs */}
      <div className="results-tabs">
        {[['4d', '4D', '#4a8fff'], ['toto', 'TOTO', '#7b9fff']].map(([key, label, color]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="results-tab-btn"
            style={tab === key
              ? { background: color, color: '#fff', borderColor: color }
              : { background: 'transparent', color: '#6b8eb5', borderColor: '#1e3a5f' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchBar tab={tab} onSearch={handleSearch} onClear={handleClear} searching={searching} hasSearch={hasSearch} />

      {/* Label + refresh */}
      <div className="results-toolbar">
        <span className="results-toolbar-label">
          {hasSearch ? 'Search Result' : 'Last 7 Days'}
        </span>
        <button onClick={refresh} disabled={refreshing} className="results-refresh-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 1s linear' }}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Loading skeleton */}
      {(loading || searching) && <SkeletonTable />}

      {/* Future draw notice (draw is scheduled but hasn't happened yet) */}
      {!loading && !searching && interceptedSearch && isFutureDateStr(searchedDate) && isDrawDay(searchedDate, tab) && (
        <FutureDrawNotice dateStr={searchedDate} game={tab} onClear={handleClear} />
      )}

      {/* No draw scheduled on this day (past or future) */}
      {!loading && !searching && interceptedSearch && !isDrawDay(searchedDate, tab) && (
        <div className="results-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: 16, marginBottom: 6 }}>
            No draw on this date
          </p>
          <p style={{ color: '#6b8eb5', fontSize: 14 }}>
            {tab.toUpperCase()} draws are held on {tab === '4d' ? 'Wed, Sat & Sun' : 'Mon & Thu'} only.
          </p>
          <button onClick={handleClear} style={{ marginTop: 20, padding: '8px 20px', background: 'transparent', border: '1px solid #163360', borderRadius: 8, color: '#6b8eb5', fontSize: 13, cursor: 'pointer' }}>
            ← Back to results
          </button>
        </div>
      )}

      {/* Error */}
      {error && !loading && !searching && (
        <div className="results-error-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p style={{ color: '#f87171', fontWeight: 700, fontSize: 14 }}>Could not load results</p>
            <p style={{ color: '#6b8eb5', fontSize: 12, marginTop: 4 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Empty — only show when not an intercepted search */}
      {!loading && !searching && !error && results.length === 0 && !interceptedSearch && (
        <div className="results-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: 16, marginBottom: 6 }}>
            {hasSearch && !isDrawDay(searchedDate, tab)
              ? 'No draw on this date'
              : hasSearch ? 'No result found' : 'No results yet'}
          </p>
          <p style={{ color: '#6b8eb5', fontSize: 14 }}>
            {hasSearch && !isDrawDay(searchedDate, tab)
              ? `${tab.toUpperCase()} draws are held on ${tab === '4d' ? 'Wed, Sat & Sun' : 'Mon & Thu'} only.`
              : hasSearch ? 'Try a different date.' : 'Click Refresh to load results.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !searching && !error && results.length > 0 && !interceptedSearch && (
        tab === '4d'
          ? <FourDTable results={results} hasSearch={hasSearch} />
          : <TOTOTable  results={results} hasSearch={hasSearch} />
      )}
    </div>
  );
}
