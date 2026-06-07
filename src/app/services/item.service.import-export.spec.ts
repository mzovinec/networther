import { vi } from 'vitest';
import { ItemService } from './item.service';
import { Item } from '../models/item.model';

// Builds a valid Omit<Item, 'id'> fixture (for addItem) with sensible defaults.
function makeNewItem(overrides: Partial<Omit<Item, 'id'>> = {}): Omit<Item, 'id'> {
  return {
    name: 'Laptop',
    category: 'Electronics',
    purchasePrice: 1000,
    purchaseDate: new Date('2024-01-01T00:00:00.000Z'),
    currentValue: 600,
    ...overrides,
  };
}

// Builds a full Item fixture (with id) for import payloads.
function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'Laptop',
    category: 'Electronics',
    purchasePrice: 1000,
    purchaseDate: new Date('2024-01-01T00:00:00.000Z'),
    currentValue: 600,
    ...overrides,
  };
}

describe('ItemService JSON import/export', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('exportToJson', () => {
    it('returns a JSON string parsing to {items: array, exportDate (frozen), version "1.0"}', () => {
      const service = new ItemService();

      const parsed = JSON.parse(service.exportToJson());

      expect(Array.isArray(parsed.items)).toBe(true);
      expect(parsed.exportDate).toBe('2026-06-07T12:00:00.000Z');
      expect(parsed.version).toBe('1.0');
    });

    it('exports the items that were added', () => {
      const service = new ItemService();
      service.addItem(makeNewItem({ name: 'Phone' }));
      service.addItem(makeNewItem({ name: 'Desk', category: 'Furniture' }));

      const parsed = JSON.parse(service.exportToJson());

      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].name).toBe('Phone');
      expect(parsed.items[0].id).toBe('1');
      expect(parsed.items[1].name).toBe('Desk');
      expect(parsed.items[1].category).toBe('Furniture');
      expect(parsed.items[1].id).toBe('2');
    });

    it('pretty-prints output with 2-space indentation (contains newlines)', () => {
      const service = new ItemService();
      service.addItem(makeNewItem());

      const json = service.exportToJson();

      expect(json).toContain('\n');
      expect(json).toContain('  "version": "1.0"');
    });
  });

  describe('importFromJson', () => {
    it('returns true, replaces current items (set not append), and persists to localStorage', () => {
      const service = new ItemService();
      service.addItem(makeNewItem({ name: 'OldItem' }));

      const payload = JSON.stringify({
        items: [makeItem({ id: '5', name: 'NewItem' })],
      });
      const result = service.importFromJson(payload);

      expect(result).toBe(true);

      const items = service.getItems()();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('NewItem');
      // The pre-seeded item is gone (set, not append).
      expect(items.some((item) => item.name === 'OldItem')).toBe(false);

      const stored = JSON.parse(localStorage.getItem('items')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('NewItem');
    });

    it('rehydrates a string purchaseDate into a Date instance', () => {
      const service = new ItemService();

      const payload = JSON.stringify({
        items: [{ ...makeItem(), purchaseDate: '2023-05-10T00:00:00.000Z' }],
      });
      const result = service.importFromJson(payload);

      expect(result).toBe(true);
      const imported = service.getItems()()[0];
      expect(imported.purchaseDate).toBeInstanceOf(Date);
      expect(imported.purchaseDate.toISOString()).toBe('2023-05-10T00:00:00.000Z');
    });

    it('updates nextId from the highest imported id so the next addItem id follows', () => {
      const service = new ItemService();

      const payload = JSON.stringify({
        items: [makeItem({ id: '3' }), makeItem({ id: '7', name: 'Other' })],
      });
      expect(service.importFromJson(payload)).toBe(true);

      const added = service.addItem(makeNewItem({ name: 'Fresh' }));
      expect(added.id).toBe('8');
    });

    it('returns false and leaves items unchanged when the items key is missing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const service = new ItemService();
      service.addItem(makeNewItem({ name: 'Existing' }));

      const result = service.importFromJson(JSON.stringify({ version: '1.0' }));

      expect(result).toBe(false);
      const items = service.getItems()();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Existing');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns false when items is not an array', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const service = new ItemService();

      const result = service.importFromJson(JSON.stringify({ items: 'foo' }));

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns false when an item is missing a required field', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const service = new ItemService();

      const incompleteItem = makeItem();
      delete (incompleteItem as Partial<Item>).name;
      const result = service.importFromJson(
        JSON.stringify({ items: [incompleteItem] })
      );

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns false (no throw) on malformed JSON', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const service = new ItemService();

      const result = service.importFromJson('{ not valid json');

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
