/**
 * Ticket vs Official Results Matcher
 * Compares extracted ticket numbers against Singapore Pools winning numbers
 * and determines prize tier.
 */

// ── 4D Prize Tiers ───────────────────────────────────────────────────────────

/**
 * Check a single 4D number against a draw result.
 * Returns prize tier or null.
 */
function check4DNumber(num, result) {
  if (!result || !num) return null;
  const n = String(num).padStart(4, '0');
  if (n === result.first)  return '1st Prize';
  if (n === result.second) return '2nd Prize';
  if (n === result.third)  return '3rd Prize';
  if ((result.starters   || []).includes(n)) return 'Starter Prize';
  if ((result.consolation|| []).includes(n)) return 'Consolation Prize';
  return null;
}

/**
 * Expand a System Roll number into 10 candidates by replacing the R digit.
 * e.g. "123R" → ["1230","1231",..."1239"], "R234" → ["0234","1234",..."9234"]
 * If no R is present (OCR read it as a digit), falls back to the number as-is.
 */
function expandSystemRoll(numStr) {
  const s = String(numStr).toUpperCase();
  const rIdx = s.indexOf('R');
  if (rIdx === -1) return [s.replace(/[^0-9]/g, '').padStart(4, '0')];
  const candidates = [];
  for (let d = 0; d <= 9; d++) {
    const candidate = s.slice(0, rIdx) + d + s.slice(rIdx + 1);
    if (/^\d{4}$/.test(candidate)) candidates.push(candidate);
  }
  return candidates.length ? candidates : [s.replace(/[^0-9]/g, '').padStart(4, '0')];
}

/**
 * Compare a 4D ticket against official results.
 * Handles all 4D bet types:
 *   Ordinary   — check each number directly (Big and/or Small bet)
 *   System Bet — check each C(n,4) number extracted by OCR
 *   iBet       — check all unique permutations of each number
 *   System Roll— expand the R-digit into 10 candidates (0–9)
 */
function compare4DTicket(ticket, result) {
  if (!result) return { won: false, matches: [], status: 'no_result' };

  const numbers  = ticket.numbers || [];
  const betType  = ticket.betType || 'Ordinary';
  const matches  = [];

  for (const num of numbers) {
    let candidates;
    if (betType === 'iBet') {
      candidates = permutations4D(num);
    } else if (betType === 'System Roll') {
      candidates = expandSystemRoll(num);
    } else {
      // Ordinary or System Bet — each extracted number is already a 4-digit entry
      candidates = [String(num).padStart(4, '0')];
    }

    for (const c of candidates) {
      const tier = check4DNumber(c, result);
      if (tier) {
        matches.push({ number: num, matched: c, prize: tier });
        break; // one prize per entry
      }
    }
  }

  return {
    won:       matches.length > 0,
    matches,
    status:    'checked',
    prizeTier: matches.length > 0 ? matches[0].prize : null,
  };
}

/** Generate all unique permutations of a 4-digit string */
const _permute = (arr, current, results) => {
  if (current.length === 4) { results.add(current.join('')); return; }
  for (let i = 0; i < arr.length; i++) {
    _permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...current, arr[i]], results);
  }
};

function permutations4D(numStr) {
  const digits  = String(numStr).padStart(4, '0').split('');
  const results = new Set();
  _permute(digits, [], results);
  return [...results];
}

// ── TOTO Prize Tiers ─────────────────────────────────────────────────────────

/**
 * TOTO prize structure:
 * Group 1: Match 6        → Jackpot
 * Group 2: Match 5 + addl → 2nd Prize
 * Group 3: Match 5        → 3rd Prize
 * Group 4: Match 4 + addl → 4th Prize
 * Group 5: Match 4        → 5th Prize
 * Group 6: Match 3 + addl → 6th Prize
 * Group 7: Match 3        → 7th Prize
 */
function checkTOTOCombination(combo, result) {
  if (!result) return null;
  const winning = result.winningNums || [];
  const addl    = result.addlNum;
  const comboSet = combo.map(n => parseInt(n));

  const matchWin  = comboSet.filter(n => winning.includes(n)).length;
  const matchAddl = comboSet.includes(addl);

  if (matchWin === 6)              return 'Group 1 (Jackpot)';
  if (matchWin === 5 && matchAddl) return 'Group 2';
  if (matchWin === 5)              return 'Group 3';
  if (matchWin === 4 && matchAddl) return 'Group 4';
  if (matchWin === 4)              return 'Group 5';
  if (matchWin === 3 && matchAddl) return 'Group 6';
  if (matchWin === 3)              return 'Group 7';
  return null;
}

/**
 * Compare a TOTO ticket (possibly a system bet with expanded combinations)
 * against official results.
 */
function compareTOTOTicket(ticket, result) {
  if (!result) return { won: false, matches: [], status: 'no_result' };

  // Use expandedCombinations if available (system bets), else ticket.numbers
  const combos = ticket.expandedCombinations || [ticket.numbers];
  const matches = [];

  for (const combo of combos) {
    const tier = checkTOTOCombination(combo, result);
    if (tier) {
      matches.push({ combination: combo, prize: tier });
    }
  }

  // Best prize tier (lowest group number = better)
  let bestPrize = null;
  if (matches.length > 0) {
    bestPrize = matches.sort((a, b) => {
      const groupA = parseInt(a.prize.match(/\d+/)?.[0] || '99');
      const groupB = parseInt(b.prize.match(/\d+/)?.[0] || '99');
      return groupA - groupB;
    })[0].prize;
  }

  // Build prize breakdown
  const prizeBreakdown = {};
  for (const m of matches) {
    prizeBreakdown[m.prize] = (prizeBreakdown[m.prize] || 0) + 1;
  }

  return {
    won:                matches.length > 0,
    matches,
    prizeBreakdown,
    status:             'checked',
    prizeTier:          bestPrize,
    totalWinningCombos: matches.length,
    totalCombosChecked: combos.length,
    isSystemBet:        ticket.systemSize != null,
    systemSize:         ticket.systemSize || null,
  };
}

/**
 * Determine if a draw date is in the past or future relative to now.
 * Returns 'past', 'future', or 'unknown'.
 */
function classifyDrawDate(drawDate) {
  if (!drawDate) return 'unknown';

  let d;
  // Try DD/MM/YYYY
  const m1 = drawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) d = new Date(`${m1[3]}-${m1[2]}-${m1[1]}`);

  // Try DD/MM/YY
  const m2 = !d && drawDate.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m2) d = new Date(`20${m2[3]}-${m2[2]}-${m2[1]}`);

  if (!d || isNaN(d.getTime())) return 'unknown';

  // Give a 2-hour buffer after draw day for results to be published
  const threshold = new Date(d.getTime() + 26 * 60 * 60 * 1000); // draw day + 26h
  return Date.now() > threshold.getTime() ? 'past' : 'future';
}

module.exports = {
  compare4DTicket,
  compareTOTOTicket,
  classifyDrawDate,
  check4DNumber,
  checkTOTOCombination,
};
