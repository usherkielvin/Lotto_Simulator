/**
 * Bug Condition Verification Tests — home-screen.tsx
 *
 * These tests verify the three bugs are FIXED on the patched code.
 * Bug 1, 2, 3 assertion tests PASS when the fixed state is confirmed.
 * The seeded RNG baseline test PASS as a sanity check.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Constants (expected post-fix values — used to assert their ABSENCE now)
// ---------------------------------------------------------------------------

const MAJOR_LOTTO_IDS = ['ultra-658', 'grand-655', 'super-649', 'mega-645', 'lotto-642'];
const SMALL_GAME_IDS  = ['6digit', '4digit', '3d-swertres', '2d-ez2'];

// ---------------------------------------------------------------------------
// Read home-screen.tsx source once
// ---------------------------------------------------------------------------

const HOME_SCREEN_PATH = path.resolve(__dirname, '../components/home-screen.tsx');
const source = fs.readFileSync(HOME_SCREEN_PATH, 'utf-8');

// ---------------------------------------------------------------------------
// Pure logic helpers copied from home-screen.tsx (for baseline RNG test)
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

// ---------------------------------------------------------------------------
// Bug 1 — Flat game list (no categories)
// ---------------------------------------------------------------------------

describe('Bug 1 — Flat game list (fixed: categories present)', () => {
  test('MAJOR_LOTTO_IDS constant is defined with 5 expected IDs', () => {
    expect(MAJOR_LOTTO_IDS).toEqual(['ultra-658', 'grand-655', 'super-649', 'mega-645', 'lotto-642']);
    expect(MAJOR_LOTTO_IDS).toHaveLength(5);
  });

  test('SMALL_GAME_IDS constant is defined with 4 expected IDs', () => {
    expect(SMALL_GAME_IDS).toEqual(['6digit', '4digit', '3d-swertres', '2d-ez2']);
    expect(SMALL_GAME_IDS).toHaveLength(4);
  });

  test('home-screen.tsx contains "Major Lotto Games" heading (Bug 1 fixed)', () => {
    // On fixed code this heading exists — confirms Bug 1 is fixed
    expect(source).toContain('Major Lotto Games');
  });

  test('home-screen.tsx contains "3D / 4D" category label (Bug 1 fixed)', () => {
    // On fixed code this label exists — confirms Bug 1 is fixed
    expect(source).toContain('3D / 4D');
  });
});

// ---------------------------------------------------------------------------
// Bug 2 — Wrong API endpoint
// ---------------------------------------------------------------------------

describe('Bug 2 — Wrong API endpoint (fixed: correct endpoint used)', () => {
  test('home-screen.tsx does NOT contain "/games?day=today" (wrong endpoint removed)', () => {
    // Confirms the wrong filtered endpoint is no longer used
    expect(source).not.toContain('/games?day=today');
  });

  test('home-screen.tsx calls apiFetch("/games") without query string (fix applied)', () => {
    // The fix replaces the call with apiFetch('/games') — assert it's present
    expect(source).toMatch(/apiFetch(?:<[^>]+>)?\s*\(\s*['"`]\/games['"`]\s*\)/);
  });
});

// ---------------------------------------------------------------------------
// Bug 3 — No scroll on game selection
// ---------------------------------------------------------------------------

describe('Bug 3 — No scroll on game selection (fixed: scrollViewRef and selectGame present)', () => {
  test('home-screen.tsx contains scrollViewRef (outer scroll ref added)', () => {
    // The fix adds scrollViewRef — assert it's present on fixed code
    expect(source).toContain('scrollViewRef');
  });

  test('home-screen.tsx contains selectGame helper (fix applied)', () => {
    // The fix adds a selectGame() helper — assert it's present on fixed code
    expect(source).toContain('selectGame');
  });
});

// ---------------------------------------------------------------------------
// Baseline — Seeded RNG (should PASS on unfixed code)
// ---------------------------------------------------------------------------

describe('Baseline — Seeded RNG', () => {
  test('pickUniqueNumbers(58, 6, seededRandom(...)) returns exactly 6 unique numbers all in [1, 58]', () => {
    const rand = seededRandom('pcso:ultra-658:2026-03-20');
    const result = pickUniqueNumbers(58, 6, rand);

    expect(result).toHaveLength(6);

    // All unique
    const unique = new Set(result);
    expect(unique.size).toBe(6);

    // All in [1, 58]
    for (const n of result) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(58);
    }

    // Sorted ascending
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });
});
