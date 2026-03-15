/**
 * TOTO System Bet Combinations
 * Generates all C(n, 6) 6-number combinations from a system bet set.
 */

// Recursive combination generator
function choose(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...choose(rest, k - 1).map(c => [first, ...c]),
    ...choose(rest, k),
  ];
}

/**
 * Expand a TOTO system bet into all possible 6-number combinations.
 * @param {number[]} numbers  - Array of selected numbers (e.g. 7–12 numbers for System 7–12)
 * @param {number}   size     - System size (7, 8, 9, 10, 11, or 12)
 * @returns {number[][]}      - Array of all C(size, 6) combinations
 */
function expandSystemBet(numbers, size) {
  const nums = numbers.slice(0, size).map(n => parseInt(n));
  return choose(nums, 6);
}

/**
 * Format combinations for storage (sorted arrays of integers).
 */
function formatCombinations(combos) {
  return combos.map(c => c.slice().sort((a, b) => a - b));
}

/** Official combination counts per system size */
const SYSTEM_COMBO_COUNTS = {
  7: 7, 8: 28, 9: 84, 10: 210, 11: 462, 12: 924,
};

/**
 * Get human-readable system bet info.
 */
function getSystemBetInfo(systemSize) {
  const counts = { 7: 7, 8: 28, 9: 84, 10: 210, 11: 462, 12: 924 };
  return {
    systemSize,
    combinationCount: counts[systemSize] || 0,
    label: `System ${systemSize}`,
    description: `C(${systemSize},6) = ${counts[systemSize] || 0} combinations`,
  };
}

/**
 * Validate that enough numbers were extracted for the system size.
 */
function validateSystemNumbers(numbers, systemSize) {
  const valid = numbers.filter(n => n >= 1 && n <= 49);
  return {
    valid: valid.length >= systemSize,
    found: valid.length,
    needed: systemSize,
    numbers: valid.slice(0, systemSize),
  };
}

module.exports = { expandSystemBet, formatCombinations, SYSTEM_COMBO_COUNTS, getSystemBetInfo, validateSystemNumbers };
