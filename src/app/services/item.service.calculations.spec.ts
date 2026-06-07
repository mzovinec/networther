import { vi } from 'vitest';
import { ItemService } from './item.service';
import { Item } from '../models/item.model';

// Freeze "now" so estimateResaleValue / calculateAgeInYears are deterministic.
const FROZEN_NOW = new Date('2026-06-07T12:00:00.000Z').getTime();
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

// Build a purchaseDate exactly k*365.25 days before the frozen now, so that
// calculateAgeInYears(purchaseDate) === k EXACTLY (no fractional drift).
const yearsAgo = (k: number) => new Date(FROZEN_NOW - k * MS_PER_YEAR);

// Mirror the service's round-to-2-decimals so expected values are derived
// the same way the unit under test computes them.
const round2 = (n: number) => Math.round(n * 100) / 100;

describe('ItemService financial calculations', () => {
  let service: ItemService;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
    // No constructor deps; constructor reads localStorage key 'items'
    // (cleared above, so a fresh empty service is created).
    service = new ItemService();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('estimateResaleValue', () => {
    it('depreciates Electronics (rate 0.20) at exactly 2 years: 1000 * 0.8^2 = 640', () => {
      const result = service.estimateResaleValue({
        name: 'Laptop',
        category: 'Electronics',
        purchasePrice: 1000,
        purchaseDate: yearsAgo(2),
      });

      expect(result).toBeCloseTo(640, 2);
    });

    it('returns purchasePrice unchanged for a known category at 0 years (Furniture)', () => {
      const result = service.estimateResaleValue({
        name: 'Desk',
        category: 'Furniture',
        purchasePrice: 1000,
        purchaseDate: yearsAgo(0),
      });

      expect(result).toBeCloseTo(1000, 2);
    });

    it('appreciates negative-rate Art (rate -0.03) at 2 years: 1000 * 1.03^2 = 1060.9', () => {
      const purchasePrice = 1000;
      const result = service.estimateResaleValue({
        name: 'Painting',
        category: 'Art',
        purchasePrice,
        purchaseDate: yearsAgo(2),
      });

      expect(result).toBeCloseTo(1060.9, 2);
      expect(result).toBeGreaterThan(purchasePrice);
    });

    it('applies the 10% floor for a high-depreciation category (Clothing 0.30) at 20 years', () => {
      const purchasePrice = 1000;
      const result = service.estimateResaleValue({
        name: 'Jacket',
        category: 'Clothing',
        purchasePrice,
        purchaseDate: yearsAgo(20),
      });

      // Raw 1000 * 0.7^20 is far below the floor, so result is clamped to 10%.
      expect(result).toBe(purchasePrice * 0.1);
    });

    it('does NOT floor appreciating (negative-rate) Collectibles (-0.02) at 20 years', () => {
      const purchasePrice = 1000;
      const result = service.estimateResaleValue({
        name: 'Stamp',
        category: 'Collectibles',
        purchasePrice,
        purchaseDate: yearsAgo(20),
      });

      // No floor on negative rates; 1000 * 1.02^20 grows well above purchase price.
      const expected = round2(purchasePrice * Math.pow(1.02, 20));
      expect(result).toBeCloseTo(expected, 2);
      expect(result).toBeGreaterThan(purchasePrice);
    });

    it('falls back to the default rate 0.12 for an unknown category at 1 year: 1000*0.88 = 880', () => {
      const result = service.estimateResaleValue({
        name: 'Mystery',
        category: 'Nonexistent',
        purchasePrice: 1000,
        purchaseDate: yearsAgo(1),
      });

      expect(result).toBeCloseTo(880, 2);
    });

    it('rounds the result to 2 decimal places', () => {
      // Vehicles rate 0.15 at 3 years: 777 * 0.85^3 = 477.175125 -> rounds to 477.18
      const purchasePrice = 777;
      const raw = purchasePrice * Math.pow(0.85, 3);
      const result = service.estimateResaleValue({
        name: 'Scooter',
        category: 'Vehicles',
        purchasePrice,
        purchaseDate: yearsAgo(3),
      });

      // Sanity-check the raw value really has more than 2 decimal places.
      expect(raw).not.toBe(round2(raw));
      expect(result).toBe(round2(raw));
      expect(result).toBe(477.18);
    });

    it('treats Books as a 20% depreciator (service table rate 0.20, same as Electronics)', () => {
      // Pins the SERVICE depreciation table as canonical: Books === Electronics rate.
      const books = service.estimateResaleValue({
        name: 'Encyclopedia',
        category: 'Books',
        purchasePrice: 1000,
        purchaseDate: yearsAgo(2),
      });
      const electronics = service.estimateResaleValue({
        name: 'Tablet',
        category: 'Electronics',
        purchasePrice: 1000,
        purchaseDate: yearsAgo(2),
      });

      expect(books).toBeCloseTo(640, 2);
      expect(books).toBe(electronics);
    });
  });

  describe('calculateNetWorth', () => {
    it('returns 0 for an empty list', () => {
      expect(service.calculateNetWorth()).toBe(0);
    });

    it('sums currentValue across all items', () => {
      const fixtures: Omit<Item, 'id'>[] = [
        {
          name: 'A',
          category: 'Electronics',
          purchasePrice: 1000,
          purchaseDate: yearsAgo(1),
          currentValue: 800,
        },
        {
          name: 'B',
          category: 'Furniture',
          purchasePrice: 500,
          purchaseDate: yearsAgo(2),
          currentValue: 450,
        },
        {
          name: 'C',
          category: 'Art',
          purchasePrice: 2000,
          purchaseDate: yearsAgo(3),
          currentValue: 2200,
        },
      ];
      fixtures.forEach((fixture) => service.addItem(fixture));

      // 800 + 450 + 2200
      expect(service.calculateNetWorth()).toBe(3450);
    });
  });

  describe('calculateDepreciation', () => {
    it('returns 0 for an empty list', () => {
      expect(service.calculateDepreciation()).toBe(0);
    });

    it('sums (purchasePrice - currentValue) across all items', () => {
      const fixtures: Omit<Item, 'id'>[] = [
        {
          name: 'A',
          category: 'Electronics',
          purchasePrice: 1000,
          purchaseDate: yearsAgo(1),
          currentValue: 800,
        },
        {
          name: 'B',
          category: 'Furniture',
          purchasePrice: 500,
          purchaseDate: yearsAgo(2),
          currentValue: 450,
        },
        {
          name: 'C',
          category: 'Art',
          purchasePrice: 2000,
          purchaseDate: yearsAgo(3),
          currentValue: 2200,
        },
      ];
      fixtures.forEach((fixture) => service.addItem(fixture));

      // (1000-800) + (500-450) + (2000-2200) = 200 + 50 - 200 = 50
      expect(service.calculateDepreciation()).toBe(50);
    });
  });
});
