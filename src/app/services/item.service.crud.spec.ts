import { vi } from 'vitest';
import { ItemService } from './item.service';
import { Item } from '../models/item.model';

function makeItemInput(
  overrides: Partial<Omit<Item, 'id'>> = {}
): Omit<Item, 'id'> {
  return {
    name: 'Laptop',
    category: 'Electronics',
    purchasePrice: 1000,
    purchaseDate: new Date('2025-01-01T00:00:00.000Z'),
    currentValue: 800,
    notes: 'A note',
    ...overrides,
  };
}

describe('ItemService CRUD + localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('addItem assigns id "1" on a fresh service, returns it, and reflects it in getItems()', () => {
    const service = new ItemService();

    const created = service.addItem(makeItemInput({ name: 'Laptop' }));

    expect(created.id).toBe('1');
    expect(created.name).toBe('Laptop');

    const items = service.getItems()();
    expect(items).toHaveLength(1);
    expect(items[0]).toBe(created);
    expect(items[0].id).toBe('1');
  });

  it('increments ids "1", "2", "3" across multiple additions', () => {
    const service = new ItemService();

    const first = service.addItem(makeItemInput({ name: 'First' }));
    const second = service.addItem(makeItemInput({ name: 'Second' }));
    const third = service.addItem(makeItemInput({ name: 'Third' }));

    expect([first.id, second.id, third.id]).toEqual(['1', '2', '3']);
    expect(service.getItems()().map((item) => item.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('updateItem replaces the matching item by id and leaves others untouched', () => {
    const service = new ItemService();
    const first = service.addItem(makeItemInput({ name: 'First' }));
    const second = service.addItem(makeItemInput({ name: 'Second' }));

    const updated: Item = {
      ...second,
      name: 'Second Updated',
      currentValue: 500,
    };
    service.updateItem(updated);

    const items = service.getItems()();
    expect(items).toHaveLength(2);
    expect(items[0]).toBe(first);
    expect(items[0].name).toBe('First');
    expect(items[1].name).toBe('Second Updated');
    expect(items[1].currentValue).toBe(500);
  });

  it('deleteItem removes only the matching id', () => {
    const service = new ItemService();
    service.addItem(makeItemInput({ name: 'First' }));
    service.addItem(makeItemInput({ name: 'Second' }));
    service.addItem(makeItemInput({ name: 'Third' }));

    service.deleteItem('2');

    const items = service.getItems()();
    expect(items.map((item) => item.id)).toEqual(['1', '3']);
    expect(items.map((item) => item.name)).toEqual(['First', 'Third']);
  });

  it('deleteAllItems empties the list and resets nextId so the next addItem gets id "1"', () => {
    const service = new ItemService();
    service.addItem(makeItemInput({ name: 'First' }));
    service.addItem(makeItemInput({ name: 'Second' }));

    service.deleteAllItems();
    expect(service.getItems()()).toHaveLength(0);

    const recreated = service.addItem(makeItemInput({ name: 'Fresh' }));
    expect(recreated.id).toBe('1');
    expect(service.getItems()()).toHaveLength(1);
  });

  it('saveItems persists the serialized item to localStorage after addItem', () => {
    const service = new ItemService();
    service.addItem(
      makeItemInput({
        name: 'Persisted',
        category: 'Books',
        purchasePrice: 25,
        currentValue: 10,
        purchaseDate: new Date('2024-03-15T00:00:00.000Z'),
        notes: 'persisted note',
      })
    );

    const raw = localStorage.getItem('items');
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('1');
    expect(parsed[0].name).toBe('Persisted');
    expect(parsed[0].category).toBe('Books');
    expect(parsed[0].purchasePrice).toBe(25);
    expect(parsed[0].currentValue).toBe(10);
    expect(parsed[0].notes).toBe('persisted note');
    // purchaseDate is serialized to its ISO string form by JSON.stringify
    expect(parsed[0].purchaseDate).toBe('2024-03-15T00:00:00.000Z');
  });

  it('loads items from localStorage at construction and rehydrates purchaseDate to a Date instance', () => {
    const seeded = [
      {
        id: '1',
        name: 'Seed One',
        category: 'Electronics',
        purchasePrice: 1000,
        purchaseDate: '2025-01-01T00:00:00.000Z',
        currentValue: 800,
      },
      {
        id: '2',
        name: 'Seed Two',
        category: 'Furniture',
        purchasePrice: 300,
        purchaseDate: '2024-06-10T00:00:00.000Z',
        currentValue: 250,
      },
    ];
    localStorage.setItem('items', JSON.stringify(seeded));

    const service = new ItemService();

    const items = service.getItems()();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Seed One');
    expect(items[1].name).toBe('Seed Two');
    expect(items[0].purchaseDate).toBeInstanceOf(Date);
    expect(items[1].purchaseDate).toBeInstanceOf(Date);
    expect(items[0].purchaseDate.toISOString()).toBe(
      '2025-01-01T00:00:00.000Z'
    );
  });

  it('sets nextId to max existing numeric id + 1 after load (ids "1" and "5" -> next is "6")', () => {
    const seeded = [
      {
        id: '1',
        name: 'Seed One',
        category: 'Electronics',
        purchasePrice: 1000,
        purchaseDate: '2025-01-01T00:00:00.000Z',
        currentValue: 800,
      },
      {
        id: '5',
        name: 'Seed Five',
        category: 'Tools',
        purchasePrice: 60,
        purchaseDate: '2025-02-02T00:00:00.000Z',
        currentValue: 40,
      },
    ];
    localStorage.setItem('items', JSON.stringify(seeded));

    const service = new ItemService();
    const created = service.addItem(makeItemInput({ name: 'Next' }));

    expect(created.id).toBe('6');
    expect(service.getItems()().map((item) => item.id)).toEqual([
      '1',
      '5',
      '6',
    ]);
  });
});
