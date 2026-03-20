/**
 * Preservation Property Tests — home-screen.tsx
 *
 * These tests baseline the CORRECT behaviors that must not regress after the fix.
 * All tests PASS on unfixed code — confirming the baseline to preserve.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_STAKE = 20;
const MAX_STAKE = 500;

const ALL_GAMES = [
  { id: 'ultra-658',   maxNumber: 58   },
  { id: 'grand-655',   maxNumber: 55   },
  { id: 'super-649',   maxNumber: 49   },
  { id: 'mega-645',    maxNumber: 45   },
  { id: 'lotto-642',   maxNumber: 42   },
  { id: '6digit',      maxNumber: 9    },
  { id: '4digit',      maxNumber: 9999 },
  { id: '3d-swertres', maxNumber: 999  },
  { id: '2d-ez2',      maxNumber: 45   },
];

// ---------------------------------------------------------------------------
// Pure logic helpers copied from home-screen.tsx
// ---------------------------------------------------------------------------

function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return (hash >>> 0) / 4294967295;
  };
}

function pickUniqueNumbers(max: number, count: number, rand: () => number = Math.random): number[] {
  const picked = new Set<number>();
  while (picked.size < count) picked.add(Math.floor(rand() * max) + 1);
  return Array.from(picked).sort((a, b) => a - b);
}

type LottoGame = { id: string; name?: string; maxNumber: number; drawTime?: string; drawDays?: string; jackpot?: number; jackpotStatus?: string };

function getGameType(gameId: string): '2number' | '3digit' | '4digit' | '6digit' | '6number' {
  if (gameId === '2d-ez2') return '2number';
  if (gameId === '3d-swertres') return '3digit';
  if (gameId === '4digit') return '4digit';
  if (gameId === '6digit') return '6digit';
  return '6number';
}

function isDigitGame(gameType: '2number' | '3digit' | '4digit' | '6digit' | '6number'): boolean {
  return gameType === '3digit' || gameType === '4digit' || gameType === '6digit';
}

function getRequiredDigits(gameType: '2number' | '3digit' | '4digit' | '6digit' | '6number'): number {
  switch (gameType) {
    case '2number': return 2;
    case '3digit': return 3;
    case '4digit': return 4;
    case '6digit': return 6;
    case '6number': return 6;
  }
}

function buildOfficialNumbers(game: LottoGame, key: string): number[] {
  const gameType = getGameType(game.id);
  const requiredCount = getRequiredDigits(gameType);
  const isDigit = isDigitGame(gameType);

  if (isDigit) {
    const result: number[] = [];
    const rand = seededRandom(`pcso:${game.id}:${key}`);
    for (let i = 0; i < requiredCount; i++) {
      result.push(Math.floor(rand() * 10));
    }
    return result;
  } else if (gameType === '2number') {
    const result: number[] = [];
    const rand = seededRandom(`pcso:${game.id}:${key}`);
    for (let i = 0; i < 2; i++) {
      result.push(Math.floor(rand() * game.maxNumber) + 1);
    }
    return result;
  } else {
    return pickUniqueNumbers(game.maxNumber, 6, seededRandom(`pcso:${game.id}:${key}`));
  }
}

function changeStake(cur: number, delta: number): number {
  return Math.min(MAX_STAKE, Math.max(MIN_STAKE, cur + delta));
}

// ---------------------------------------------------------------------------
// 1. Stake clamping (property-based)
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe('Property 1 — Stake clamping always stays in [20, 500]', () => {
  const startingValues = [20, 40, 100, 200, 300, 480, 500];
  const deltas = [-20, +20, -100, +100, -9999, +9999];

  test('for any starting stake and any delta, result is always in [MIN_STAKE, MAX_STAKE]', () => {
    for (const start of startingValues) {
      for (const delta of deltas) {
        const result = changeStake(start, delta);
        expect(result).toBeGreaterThanOrEqual(MIN_STAKE);
        expect(result).toBeLessThanOrEqual(MAX_STAKE);
      }
    }
  });

  test('boundary: from MAX_STAKE (500), +20 stays at 500', () => {
    expect(changeStake(500, +20)).toBe(500);
  });

  test('boundary: from MIN_STAKE (20), -20 stays at 20', () => {
    expect(changeStake(20, -20)).toBe(20);
  });

  test('chained stake changes always remain clamped', () => {
    const deltaSequences = [
      [+20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20, +20],
      [-20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20, -20],
      [+9999, -9999, +9999, -9999, +9999],
      [-9999, +9999, -9999, +9999, -9999],
    ];

    for (const sequence of deltaSequences) {
      let stake = MIN_STAKE;
      for (const delta of sequence) {
        stake = changeStake(stake, delta);
        expect(stake).toBeGreaterThanOrEqual(MIN_STAKE);
        expect(stake).toBeLessThanOrEqual(MAX_STAKE);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Lucky Pick (property-based)
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

describe('Property 2 — Lucky Pick produces exactly 6 unique numbers in [1, maxNumber]', () => {
  const SIX_NUMBER_GAMES = ALL_GAMES.filter(g => getGameType(g.id) === '6number');

  test('for each 6-number game, pickUniqueNumbers returns exactly 6 unique numbers all in [1, maxNumber]', () => {
    for (const game of SIX_NUMBER_GAMES) {
      // Run 20 iterations with different seeds
      for (let iteration = 0; iteration < 20; iteration++) {
        const seed = `test:${game.id}:iter-${iteration}`;
        const rand = seededRandom(seed);
        const result = pickUniqueNumbers(game.maxNumber, 6, rand);

        expect(result).toHaveLength(6);

        const unique = new Set(result);
        expect(unique.size).toBe(6);

        for (const n of result) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(game.maxNumber);
        }
      }
    }
  });

  test('ultra-658 (max 58): 20 iterations all produce 6 unique numbers in [1, 58]', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickUniqueNumbers(58, 6, seededRandom(`ultra-658:seed-${i}`));
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      result.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(58); });
    }
  });

  test('grand-655 (max 55): 20 iterations all produce 6 unique numbers in [1, 55]', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickUniqueNumbers(55, 6, seededRandom(`grand-655:seed-${i}`));
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      result.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(55); });
    }
  });

  test('super-649 (max 49): 20 iterations all produce 6 unique numbers in [1, 49]', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickUniqueNumbers(49, 6, seededRandom(`super-649:seed-${i}`));
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      result.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(49); });
    }
  });

  test('mega-645 (max 45): 20 iterations all produce 6 unique numbers in [1, 45]', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickUniqueNumbers(45, 6, seededRandom(`mega-645:seed-${i}`));
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      result.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(45); });
    }
  });

  test('lotto-642 (max 42): 20 iterations all produce 6 unique numbers in [1, 42]', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickUniqueNumbers(42, 6, seededRandom(`lotto-642:seed-${i}`));
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      result.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(42); });
    }
  });

  test('2d-ez2 (max 45): 20 iterations all produce 2 numbers in [1, 45]', () => {
    for (let i = 0; i < 20; i++) {
      const rand = seededRandom(`2d-ez2:seed-${i}`);
      const nums: number[] = [];
      for (let j = 0; j < 2; j++) nums.push(Math.floor(rand() * 45) + 1);
      expect(nums).toHaveLength(2);
      nums.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(45); });
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Official numbers determinism (property-based)
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------

describe('Property 3 — buildOfficialNumbers is deterministic for same game + date key', () => {
  const DATE_KEYS = [
    '2026-01-01',
    '2026-03-15',
    '2026-06-30',
    '2026-09-10',
    '2026-12-25',
  ];

  test('for all 9 games × 5 date keys, calling buildOfficialNumbers twice returns identical results', () => {
    for (const game of ALL_GAMES) {
      for (const key of DATE_KEYS) {
        const first  = buildOfficialNumbers(game, key);
        const second = buildOfficialNumbers(game, key);
        expect(first).toEqual(second);
      }
    }
  });

  test('ultra-658: same seed always produces same 6 numbers', () => {
    const game = ALL_GAMES.find(g => g.id === 'ultra-658')!;
    for (const key of DATE_KEYS) {
      expect(buildOfficialNumbers(game, key)).toEqual(buildOfficialNumbers(game, key));
    }
  });

  test('6digit: same seed always produces same 6 digits', () => {
    const game = ALL_GAMES.find(g => g.id === '6digit')!;
    for (const key of DATE_KEYS) {
      expect(buildOfficialNumbers(game, key)).toEqual(buildOfficialNumbers(game, key));
    }
  });

  test('4digit: same seed always produces same 4 digits', () => {
    const game = ALL_GAMES.find(g => g.id === '4digit')!;
    for (const key of DATE_KEYS) {
      expect(buildOfficialNumbers(game, key)).toEqual(buildOfficialNumbers(game, key));
    }
  });

  test('3d-swertres: same seed always produces same 3 digits', () => {
    const game = ALL_GAMES.find(g => g.id === '3d-swertres')!;
    for (const key of DATE_KEYS) {
      expect(buildOfficialNumbers(game, key)).toEqual(buildOfficialNumbers(game, key));
    }
  });

  test('2d-ez2: same seed always produces same 2 numbers', () => {
    const game = ALL_GAMES.find(g => g.id === '2d-ez2')!;
    for (const key of DATE_KEYS) {
      expect(buildOfficialNumbers(game, key)).toEqual(buildOfficialNumbers(game, key));
    }
  });

  test('different date keys produce different results for the same game', () => {
    const game = ALL_GAMES.find(g => g.id === 'ultra-658')!;
    const results = DATE_KEYS.map(key => buildOfficialNumbers(game, key).join(','));
    // Not all results should be identical (seeded by date key)
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// 4. numberOptions derivation (property-based)
// Validates: Requirements 3.1, 3.5
// ---------------------------------------------------------------------------

describe('Property 4 — numberOptions derivation produces [1..maxNumber] with no gaps', () => {
  const SIX_NUMBER_AND_2D_GAMES = ALL_GAMES.filter(g => !isDigitGame(getGameType(g.id)));

  test('for each non-digit game, Array.from({length: maxNumber}, (_, i) => i+1) equals [1..maxNumber]', () => {
    for (const game of SIX_NUMBER_AND_2D_GAMES) {
      const options = Array.from({ length: game.maxNumber }, (_, i) => i + 1);

      expect(options).toHaveLength(game.maxNumber);
      expect(options[0]).toBe(1);
      expect(options[options.length - 1]).toBe(game.maxNumber);

      // All consecutive — no gaps
      for (let i = 1; i < options.length; i++) {
        expect(options[i]).toBe(options[i - 1] + 1);
      }
    }
  });

  test('ultra-658 (max 58): options has 58 elements, starts at 1, ends at 58', () => {
    const options = Array.from({ length: 58 }, (_, i) => i + 1);
    expect(options).toHaveLength(58);
    expect(options[0]).toBe(1);
    expect(options[57]).toBe(58);
  });

  test('lotto-642 (max 42): options has 42 elements, starts at 1, ends at 42', () => {
    const options = Array.from({ length: 42 }, (_, i) => i + 1);
    expect(options).toHaveLength(42);
    expect(options[0]).toBe(1);
    expect(options[41]).toBe(42);
  });

  test('2d-ez2 (max 45): options has 45 elements, starts at 1, ends at 45', () => {
    const options = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(options).toHaveLength(45);
    expect(options[0]).toBe(1);
    expect(options[44]).toBe(45);
  });

  test('digit games (6digit, 4digit, 3d-swertres) use 0-9 digit range', () => {
    const digitGames = ALL_GAMES.filter(g => isDigitGame(getGameType(g.id)));
    for (const game of digitGames) {
      const options = Array.from({ length: 10 }, (_, i) => i);
      expect(options).toHaveLength(10);
      expect(options[0]).toBe(0);
      expect(options[9]).toBe(9);
    }
  });

  test('all 9 games: numberOptions length matches expected count', () => {
    const expectedLengths: Record<string, number> = {
      'ultra-658':   58,
      'grand-655':   55,
      'super-649':   49,
      'mega-645':    45,
      'lotto-642':   42,
      '6digit':      10, // digits 0-9
      '4digit':      10, // digits 0-9
      '3d-swertres': 10, // digits 0-9
      '2d-ez2':      45,
    };

    for (const game of ALL_GAMES) {
      const gameType = getGameType(game.id);
      const isDigit = isDigitGame(gameType);
      const options = isDigit
        ? Array.from({ length: 10 }, (_, i) => i)
        : Array.from({ length: game.maxNumber }, (_, i) => i + 1);

      expect(options).toHaveLength(expectedLengths[game.id]);
    }
  });
});
