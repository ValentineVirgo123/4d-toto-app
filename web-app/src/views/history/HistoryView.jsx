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

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, prizeTier }) {
  if (status === 'won')     return <span className="hist-badge won">🏆 Won{prizeTier ? ` · ${prizeTier}` : ''}</span>;
  if (status === 'not_won') return <span className="hist-badge lost">✗ Not Won</span>;
  return <span className="hist-badge pending">⏳ Pending</span>;
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
      {/* Thumbnail */}
      <div className="hist-thumb">
        {ticket.imageUrl
          ? <img src={ticket.imageUrl} alt="ticket" />
          : <span className="hist-thumb-icon">{is4D ? '🎰' : '🎱'}</span>
        }
      </div>

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

        {/* Meta row */}
        <div className="hist-card-meta">
          <span className="hist-meta-item">
            <span className="hist-meta-label">Draw</span>
            <span className="hist-meta-val">{fmtDate(ticket.drawDate)}</span>
          </span>
          <span className="hist-meta-dot">·</span>
          <span className="hist-meta-item">
            <span className="hist-meta-label">Purchased</span>
            <span className="hist-meta-val">{fmtDate(ticket.ticketPurchaseDate) || uploadDate(ticket)}</span>
          </span>
          {ticket.amount && (
            <>
              <span className="hist-meta-dot">·</span>
              <span className="hist-meta-item">
                <span className="hist-meta-val" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                  ${parseFloat(ticket.amount).toFixed(2)}
                </span>
              </span>
            </>
          )}
          {ticket.combinationCount > 1 && (
            <>
              <span className="hist-meta-dot">·</span>
              <span className="hist-meta-item">
                <span className="hist-meta-val">{ticket.combinationCount} combos</span>
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
  { key: 'All',     label: 'All'         },
  { key: '4D',      label: '🎰 4D'       },
  { key: 'TOTO',    label: '🎱 TOTO'     },
  { key: 'Won',     label: '🏆 Won'      },
  { key: 'Pending', label: '⏳ Pending'  },
  { key: 'System',  label: '⚙️ System'  },
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
              <span className="hist-stat-num" style={{ color: 'var(--gold)', fontSize: 14 }}>${totalSpend.toFixed(0)}</span>
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
          <span style={{ fontSize: 20 }}>⚠️</span>
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
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/upload')}>
              📸 Scan a Ticket
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
