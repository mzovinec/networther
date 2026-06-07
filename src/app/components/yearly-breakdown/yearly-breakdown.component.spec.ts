// Characterization spec: pins CURRENT YearlyBreakdownComponent output before logic moves into ItemService.

import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { YearlyBreakdownComponent } from './yearly-breakdown.component';

// Fixed dataset: 4 items across 2 distinct purchase years (2022 and 2023).
// Explicit purchasePrice / currentValue so totals are exact and independent
// of any depreciation estimation in ItemService.
//
//   id  year  purchasePrice  currentValue   note
//   1   2022  1000           600            depreciating
//   2   2022  2000           1500           depreciating
//   3   2023  500            1000           APPRECIATING (current > purchase)
//   4   2023  1500           1200           depreciating
//
// Hand-computed expectations (component sorts breakdown DESCENDING by year):
//
//   Year 2023: itemCount=2, purchaseValue=2000, currentValue=2200,
//              depreciation = (500-1000)+(1500-1200) = -500+300 = -200
//              depreciation% = -200/2000*100 = -10  (negative -> appreciating)
//              retention%    = 2200/2000*100 = 110
//
//   Year 2022: itemCount=2, purchaseValue=3000, currentValue=2100,
//              depreciation = (1000-600)+(2000-1500) = 400+500 = 900
//              depreciation% = 900/3000*100 = 30
//              retention%    = 2100/3000*100 = 70
//
//   Totals: totalItems=4, totalPurchaseValue=5000,
//           totalCurrentValue=4300, totalDepreciation=700
const FIXTURE = [
  {
    id: '1',
    name: 'Laptop',
    category: 'Electronics',
    purchasePrice: 1000,
    purchaseDate: '2022-03-15T00:00:00.000Z',
    currentValue: 600,
  },
  {
    id: '2',
    name: 'Sofa',
    category: 'Furniture',
    purchasePrice: 2000,
    purchaseDate: '2022-09-01T00:00:00.000Z',
    currentValue: 1500,
  },
  {
    id: '3',
    name: 'Rare Board Game',
    category: 'Board Games',
    purchasePrice: 500,
    purchaseDate: '2023-01-10T00:00:00.000Z',
    currentValue: 1000,
  },
  {
    id: '4',
    name: 'Bike',
    category: 'Sports Equipment',
    purchasePrice: 1500,
    purchaseDate: '2023-06-20T00:00:00.000Z',
    currentValue: 1200,
  },
];

function createComponent() {
  // Seed localStorage BEFORE the root ItemService is instantiated so its
  // constructor loads our fixtures.
  localStorage.setItem('items', JSON.stringify(FIXTURE));

  TestBed.configureTestingModule({
    imports: [YearlyBreakdownComponent],
    providers: [provideRouter([])],
  });

  const fixture = TestBed.createComponent(YearlyBreakdownComponent);
  fixture.detectChanges();
  return fixture;
}

describe('YearlyBreakdownComponent (characterization)', () => {
  beforeEach(() => {
    // Fresh module each test so the root ItemService is re-created and reads
    // the fixtures we seed below.
    TestBed.resetTestingModule();
    localStorage.clear();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('groups items by purchase year with correct count and totals (sorted descending)', () => {
    const fixture = createComponent();
    const breakdown = fixture.componentInstance.yearlyBreakdown();

    expect(breakdown).toHaveLength(2);

    // Sorted descending by year -> 2023 first, then 2022.
    const [year2023, year2022] = breakdown;

    expect(year2023.year).toBe(2023);
    expect(year2023.itemCount).toBe(2);
    expect(year2023.purchaseValue).toBe(2000);
    expect(year2023.currentValue).toBe(2200);
    expect(year2023.depreciation).toBe(-200);

    expect(year2022.year).toBe(2022);
    expect(year2022.itemCount).toBe(2);
    expect(year2022.purchaseValue).toBe(3000);
    expect(year2022.currentValue).toBe(2100);
    expect(year2022.depreciation).toBe(900);
  });

  it('exposes a breakdown entry for each distinct purchase year', () => {
    const fixture = createComponent();
    const breakdown = fixture.componentInstance.yearlyBreakdown();

    const years = breakdown.map((entry: { year: number }) => entry.year);
    expect(years).toEqual([2023, 2022]);
    expect(years).toContain(2022);
    expect(years).toContain(2023);
  });

  it('getTotalSummary() returns correct totals across all years', () => {
    const fixture = createComponent();
    const summary = fixture.componentInstance.getTotalSummary();

    expect(summary.totalItems).toBe(4);
    expect(summary.totalPurchaseValue).toBe(5000);
    expect(summary.totalCurrentValue).toBe(4300);
    expect(summary.totalDepreciation).toBe(700);
  });

  it('getDepreciationPercentage() and getRetentionPercentage() for a depreciating year (2022)', () => {
    const fixture = createComponent();
    const breakdown = fixture.componentInstance.yearlyBreakdown();
    const year2022 = breakdown.find(
      (entry: { year: number }) => entry.year === 2022
    );

    // depreciation% = 900/3000*100 = 30
    expect(
      fixture.componentInstance.getDepreciationPercentage(year2022)
    ).toBeCloseTo(30, 2);

    // retention% = 2100/3000*100 = 70
    expect(
      fixture.componentInstance.getRetentionPercentage(year2022)
    ).toBeCloseTo(70, 2);
  });

  it('pins APPRECIATING year (2023): depreciation% goes negative, retention% exceeds 100', () => {
    const fixture = createComponent();
    const breakdown = fixture.componentInstance.yearlyBreakdown();
    const year2023 = breakdown.find(
      (entry: { year: number }) => entry.year === 2023
    );

    // 2023 currentValue (2200) > purchaseValue (2000): the year appreciated.
    // depreciation% = -200/2000*100 = -10. Current behavior reports a NEGATIVE
    // percentage here; this is pinned as-is, NOT "fixed".
    expect(
      fixture.componentInstance.getDepreciationPercentage(year2023)
    ).toBeCloseTo(-10, 2);

    // retention% = 2200/2000*100 = 110 (over 100% because value grew).
    expect(
      fixture.componentInstance.getRetentionPercentage(year2023)
    ).toBeCloseTo(110, 2);
  });

  // ---------------------------------------------------------------------------
  // KNOWN BUG — intentionally RED until the refactor fixes it.
  // Template (yearly-breakdown.component.html:80) hard-codes a leading "-" in
  // front of an already-signed percentage: `-{{ getDepreciationPercentage() }}%`.
  // For the appreciating year 2023 the value is -10, so the cell renders the
  // nonsense "--10.0%". Intended: a single sign (e.g. "-10.0%"). This asserts the
  // intended behavior, so it FAILS now and goes green once the template is fixed.
  // ---------------------------------------------------------------------------
  it('does NOT render a double-minus for an appreciating year [red until fixed]', () => {
    const fixture = createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toMatch(/--\d/);
  });
});
