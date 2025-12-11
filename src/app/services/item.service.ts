import { Injectable, signal } from '@angular/core';
import { Item, CATEGORIES } from '../models/item.model';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  private items = signal<Item[]>([]);
  private nextId = 1;

  constructor() {
    // Load items from localStorage if available
    const savedItems = localStorage.getItem('items');
    if (savedItems) {
      const parsedItems = JSON.parse(savedItems);
      // Convert string dates back to Date objects
      parsedItems.forEach((item: any) => {
        item.purchaseDate = new Date(item.purchaseDate);
      });
      this.items.set(parsedItems);
      this.nextId =
        Math.max(...parsedItems.map((item: Item) => parseInt(item.id))) + 1;
    }
  }

  getItems() {
    return this.items;
  }

  getCategories() {
    return CATEGORIES;
  }

  addItem(item: Omit<Item, 'id'>) {
    const newItem: Item = {
      ...item,
      id: this.nextId.toString(),
    };
    this.nextId++;
    this.items.update((items) => [...items, newItem]);
    this.saveItems();
    return newItem;
  }

  updateItem(updatedItem: Item) {
    this.items.update((items) =>
      items.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    this.saveItems();
  }

  deleteItem(id: string): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
    this.saveItems();
  }

  deleteAllItems(): void {
    this.items.set([]);
    this.nextId = 1;
    this.saveItems();
  }

  calculateNetWorth() {
    return this.items().reduce((total, item) => total + item.currentValue, 0);
  }

  calculateDepreciation() {
    return this.items().reduce(
      (total, item) => total + (item.purchasePrice - item.currentValue),
      0
    );
  }

  // Helper method to estimate resale value based on category and age
  estimateResaleValue(item: Omit<Item, 'id' | 'currentValue'>): number {
    const ageInYears = this.calculateAgeInYears(item.purchaseDate);

    const depreciationRates: Record<string, number> = {
      Electronics: 0.2, // 20% per year
      Books: 0.2,
      Furniture: 0.1,
      Vehicles: 0.15,
      Jewelry: 0.05,
      Collectibles: -0.02, // May appreciate
      Art: -0.03, // May appreciate
      Clothing: 0.3,
      'Sports Equipment': 0.15,
      Tools: 0.08,
      'Board Games': 0.05, // Only 5% depreciation - many become collectibles
      Other: 0.12,
    };

    const rate = depreciationRates[item.category] || 0.12;

    // Calculate depreciated value (or appreciated if rate is negative)
    let estimatedValue = item.purchasePrice * Math.pow(1 - rate, ageInYears);

    // Floor value - items usually don't go below 10% of purchase price
    // (except for categories that might appreciate)
    if (rate > 0) {
      estimatedValue = Math.max(estimatedValue, item.purchasePrice * 0.1);
    }

    return Math.round(estimatedValue * 100) / 100; // Round to 2 decimal places
  }

  private calculateAgeInYears(purchaseDate: Date): number {
    const now = new Date();
    const diffInMs = now.getTime() - purchaseDate.getTime();
    return diffInMs / (1000 * 60 * 60 * 24 * 365.25);
  }

  private saveItems() {
    localStorage.setItem('items', JSON.stringify(this.items()));
  }

  // Export items to a JSON file
  exportToJson(): string {
    const itemsData = this.items();
    const exportData = {
      items: itemsData,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Import items from a JSON file
  importFromJson(jsonData: string): boolean {
    try {
      const importedData = JSON.parse(jsonData);

      // Basic validation
      if (!importedData.items || !Array.isArray(importedData.items)) {
        throw new Error('Invalid data format: missing or invalid items array');
      }

      // Convert string dates back to Date objects
      importedData.items.forEach((item: any) => {
        if (typeof item.purchaseDate === 'string') {
          item.purchaseDate = new Date(item.purchaseDate);
        }

        // Ensure all required fields are present
        if (
          !item.id ||
          !item.name ||
          !item.category ||
          item.purchasePrice === undefined ||
          !item.purchaseDate ||
          item.currentValue === undefined
        ) {
          throw new Error('Invalid item data: missing required fields');
        }
      });

      // Replace current items with imported ones
      this.items.set(importedData.items);

      // Update nextId to be greater than the highest id in the imported data
      if (importedData.items.length > 0) {
        this.nextId =
          Math.max(
            ...importedData.items.map((item: Item) => parseInt(item.id))
          ) + 1;
      }

      // Save to localStorage
      this.saveItems();

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}
