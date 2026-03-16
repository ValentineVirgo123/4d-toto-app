// VIEW layer — full ticket history with cards, sort, filter, and detail modal.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../../presenters/TicketPresenter';
import { Mascot } from '../../components/Mascot';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3]);
  if (y < 100) y += 2000;
  return new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
}

function fmtDate(raw) {
  if (!raw) return '—';
  const d = parseDate(raw);
  if (d) return d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
  return raw;
}

function uploadDate(ticket) {
  if (ticket.uploadedAt) return new Date(ticket.uploadedAt).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
  return '—';
}

function sortScore(ticket) {
  if (ticket.ticketPurchaseDate) { const d = parseDate(ticket.ticketPurchaseDate); if (d) return d.getTime(); }
  return ticket.uploadedAt ? new Date(ticket.uploadedAt).getTime() : 0;
}

function isSystem(t) {
  return t.betType === 'System Bet' || t.betType === 'System Roll' || (t.betType || '').startsWith('System');
}

// ── SVG icons ──────────────────────────────────────────────────────────────────

const Icon4D = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const IconTOTO = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="9"  cy="10" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="10" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="9"  cy="14" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

const IconTrophy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
    <path d="M12 17v4"/><path d="M8 21h8"/>
    <path d="M6 5v4a6 6 0 0 0 12 0V5H6z"/>
  </svg>
);

const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconX = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, prizeTier }) {
  if (status === 'won')     return <span className="hist-badge won"><IconTrophy /> Won{prizeTier ? ` · ${prizeTier}` : ''}</span>;
  if (status === 'not_won') return <span className="hist-badge lost"><IconX /> Not Won</span>;
  return <span className="hist-badge pending"><IconClock /> Pending</span>;
}

// ── Detail Modal ───────────────────────────────────────────────────────────────

function DetailModal({ ticket, onClose, onCheckResult }) {
  const is4D = ticket.gameType === '4D';

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal hist-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge badge-${is4D ? '4d' : 'toto'}`}>{ticket.gameType}</span>
            <h2>Ticket Detail</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body hist-modal-body">
          {/* Ticket image */}
          {ticket.imageUrl ? (
            <div className="hist-modal-img-wrap">
              <img src={ticket.imageUrl} alt="Ticket" className="hist-modal-img" />
            </div>
          ) : (
            <div className="hist-modal-img-placeholder">🎫</div>
          )}

          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatusBadge status={ticket.resultStatus} prizeTier={ticket.prizeTier} />
            {ticket.drawType === 'pending' && (
              <button className="btn btn-outline" style={{ padding: '4px 14px', fontSize: 12 }}
                onClick={() => { onCheckResult(ticket.id); onClose(); }}>
                Check Now
              </button>
            )}
          </div>

          {/* Info grid */}
          <div className="hist-info-grid">
            {[
              ['Game Type',     ticket.gameType],
              ['Bet Type',      ticket.betType || 'Ordinary'],
              ['Draw Date',     fmtDate(ticket.drawDate)],
              ['Purchase Date', fmtDate(ticket.ticketPurchaseDate) || uploadDate(ticket)],
              ['Draw Status',   ticket.drawType === 'future' ? 'Upcoming' : 'Past'],
              ['Combinations',  ticket.combinationCount || ticket.numbers?.length || '—'],
              ['System Size',   ticket.systemSize ? `System ${ticket.systemSize}` : '—'],
              ['Amount Paid',   ticket.amount ? `$${parseFloat(ticket.amount).toFixed(2)}` : '—'],
              ['Serial No.',    ticket.serialNumber || '—'],
            ].map(([k, v]) => (
              <div key={k} className="hist-info-row">
                <span className="hist-info-key">{k}</span>
                <span className="hist-info-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Numbers */}
          {ticket.numbers?.length > 0 && (
            <div className="hist-section">
              <h4>Extracted Numbers</h4>
              <div className="number-pills">
                {ticket.numbers.map((n, i) => (
                  <span key={i} className={`number-pill ${is4D ? 'fourd' : 'toto'}`}>{n}</span>
                ))}
              </div>
            </div>
          )}

          {/* Expanded combinations */}
          {ticket.expandedCombinations?.length > 0 && (
            <div className="hist-section">
              <h4>Expanded Combinations ({ticket.expandedCombinations.length} total)</h4>
              <div className="hist-combos-scroll">
                {ticket.expandedCombinations.slice(0, 30).map((c, i) => (
                  <div key={i} className="hist-combo-row">
                    <span className="hist-combo-num">{i + 1}.</span>
                    <span>{Array.isArray(c) ? c.join('  ') : c}</span>
                  </div>
                ))}
                {ticket.expandedCombinations.length > 30 && (
                  <div className="hist-combo-more">+ {ticket.expandedCombinations.length - 30} more combinations…</div>
                )}
              </div>
            </div>
          )}

          {/* Winning matches */}
          {ticket.winMatches?.length > 0 && (
            <div className="hist-section">
              <h4>Winning Matches</h4>
              {ticket.winMatches.map((m, i) => (
                <div key={i} className="hist-info-row">
                  <span className="hist-info-key">{m.number || (m.combination || []).join(', ')}</span>
                  <span className="hist-info-val" style={{ color: '#22c55e', fontWeight: 700 }}>{m.prize}</span>
                </div>
              ))}
            </div>
          )}

          <div className="hist-ticket-id">ID: {ticket.id}</div>
        </div>
      </div>
    </div>
  );
}

// ── Ticket Card ────────────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick, onCheck }) {
  const is4D = ticket.gameType === '4D';

  return (
    <div className={`hist-card ${is4D ? 'fourd' : 'toto'}`} onClick={onClick}>
      {/* Ticket thumbnail or game-type avatar */}
      {ticket.imageUrl ? (
        <img src={ticket.imageUrl} alt="Ticket" className="hist-thumb-img" />
      ) : (
        <div className={`hist-avatar ${is4D ? 'fourd' : 'toto'}`}>
          {is4D ? <Icon4D /> : <IconTOTO />}
        </div>
      )}

      {/* Main content */}
      <div className="hist-card-body">
        {/* Top row: badge + bet type + status */}
        <div className="hist-card-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge badge-${is4D ? '4d' : 'toto'}`}>{ticket.gameType}</span>
            <span className="hist-bet-type">{ticket.betType || 'Ordinary'}</span>
            {ticket.systemSize && (
              <span className="hist-system-tag">System {ticket.systemSize}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={ticket.resultStatus} prizeTier={ticket.prizeTier} />
            {ticket.resultStatus === 'pending' && (
              <button
                type="button"
                className="btn btn-outline hist-check-btn"
                onClick={e => { e.stopPropagation(); onCheck(ticket.id); }}
              >
                Check My Ticket
              </button>
            )}
          </div>
        </div>

        {/* Numbers */}
        {ticket.numbers?.length > 0 && (
          <div className="hist-card-nums">
            {ticket.numbers.slice(0, 6).map((n, i) => (
              <span key={i} className={`hist-num-chip ${is4D ? 'fourd' : 'toto'}`}>{n}</span>
            ))}
            {ticket.numbers.length > 6 && (
              <span className="hist-num-more">+{ticket.numbers.length - 6}</span>
            )}
          </div>
        )}

        {/* Meta row — draw date + amount only; full detail in modal */}
        <div className="hist-card-meta">
          <span className="hist-meta-item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="hist-meta-label">Draw</span>
            <span className="hist-meta-val">{fmtDate(ticket.drawDate)}</span>
          </span>
          {ticket.amount && (
            <>
              <span className="hist-meta-dot">·</span>
              <span className="hist-meta-item">
                <span className="hist-meta-val hist-meta-amount">
                  ${parseFloat(ticket.amount).toFixed(2)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="hist-card-arrow">›</div>
    </div>
  );
}

// ── View ───────────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'All',     label: 'All'      },
  { key: '4D',      label: '4D'       },
  { key: 'TOTO',    label: 'TOTO'     },
  { key: 'Won',     label: 'Won'      },
  { key: 'Pending', label: 'Pending'  },
  { key: 'System',  label: 'System'   },
];

const SORTS = [
  { key: 'newest',  label: 'Newest First'  },
  { key: 'oldest',  label: 'Oldest First'  },
  { key: 'winning', label: 'Winning First' },
  { key: 'amount',  label: 'Amount ↓'      },
];

export function HistoryView() {
  const { tickets, loading, error, refresh, checkResult } = useTickets();
  const [filter,   setFilter]   = useState('All');
  const [sort,     setSort]     = useState('newest');
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { refresh(); }, []);

  const processed = useMemo(() => {
    let list = tickets.filter(t => {
      if (filter === '4D')      return t.gameType === '4D';
      if (filter === 'TOTO')    return t.gameType === 'TOTO';
      if (filter === 'Won')     return t.resultStatus === 'won';
      if (filter === 'Pending') return t.resultStatus === 'pending';
      if (filter === 'System')  return isSystem(t);
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'oldest')  return sortScore(a) - sortScore(b);
      if (sort === 'winning') {
        const ws = { won: 0, pending: 1, not_won: 2 };
        const diff = (ws[a.resultStatus] ?? 1) - (ws[b.resultStatus] ?? 1);
        return diff !== 0 ? diff : sortScore(b) - sortScore(a);
      }
      if (sort === 'amount') return (b.amount || 0) - (a.amount || 0);
      return sortScore(b) - sortScore(a); // newest
    });

    return list;
  }, [tickets, filter, sort]);

  const wonCount     = tickets.filter(t => t.resultStatus === 'won').length;
  const pendingCount = tickets.filter(t => t.resultStatus === 'pending').length;
  const totalSpend   = tickets.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  return (
    <div className="page">
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Ticket History</h1>
        <p className="page-sub">All your scanned tickets in one place.</p>
      </div>

      {/* Stats bar */}
      {!loading && tickets.length > 0 && (
        <div className="hist-stats-bar">
          <div className="hist-stat">
            <span className="hist-stat-num">{tickets.length}</span>
            <span className="hist-stat-lbl">Tickets</span>
          </div>
          <div className="hist-stat-div" />
          <div className="hist-stat">
            <span className="hist-stat-num" style={{ color: 'var(--red)' }}>{tickets.filter(t => t.gameType === '4D').length}</span>
            <span className="hist-stat-lbl">4D</span>
          </div>
          <div className="hist-stat-div" />
          <div className="hist-stat">
            <span className="hist-stat-num" style={{ color: 'var(--purple)' }}>{tickets.filter(t => t.gameType === 'TOTO').length}</span>
            <span className="hist-stat-lbl">TOTO</span>
          </div>
          {wonCount > 0 && <>
            <div className="hist-stat-div" />
            <div className="hist-stat">
              <span className="hist-stat-num" style={{ color: '#22c55e' }}>{wonCount}</span>
              <span className="hist-stat-lbl">Won</span>
            </div>
          </>}
          {pendingCount > 0 && <>
            <div className="hist-stat-div" />
            <div className="hist-stat">
              <span className="hist-stat-num" style={{ color: 'var(--gold)' }}>{pendingCount}</span>
              <span className="hist-stat-lbl">Pending</span>
            </div>
          </>}
          {totalSpend > 0 && <>
            <div className="hist-stat-div" />
            <div className="hist-stat">
              <span className="hist-stat-num" style={{ fontSize: 14 }}>${totalSpend.toFixed(0)}</span>
              <span className="hist-stat-lbl">Spent</span>
            </div>
          </>}
        </div>
      )}

      {/* Filter + Sort bar */}
      <div className="hist-toolbar">
        <div className="hist-filters">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`hist-filter-btn${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="hist-sort-select"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={refresh}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Result count */}
      {!loading && !error && tickets.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Showing {processed.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="hist-skeleton-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div><strong>Could not load tickets</strong><p style={{ fontSize: 14, marginTop: 4 }}>{error}</p></div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && processed.length === 0 && (
        <div className="empty-state">
          <Mascot state="sleeping" size={90} />
          <h3 style={{ marginTop: 20 }}>{filter === 'All' ? 'No tickets yet' : `No ${filter} tickets`}</h3>
          <p>{filter === 'All' ? 'Upload your first ticket to get started.' : 'Try a different filter.'}</p>
          {filter === 'All' && (
            <button className="btn btn-primary" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7 }} onClick={() => navigate('/upload')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Scan a Ticket
            </button>
          )}
        </div>
      )}

      {/* Cards list */}
      {!loading && !error && processed.length > 0 && (
        <div className="hist-card-list">
          {processed.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => setSelected(t)}
              onCheck={checkResult}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onCheckResult={checkResult}
        />
      )}
    </div>
  );
}
