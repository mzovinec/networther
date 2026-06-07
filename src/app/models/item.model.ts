export interface Item {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: Date;
  currentValue: number;
  notes?: string;
}

export interface YearlyData {
  year: number;
  purchaseValue: number;
  currentValue: number;
  depreciation: number;
  itemCount: number;
}

export const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Vehicles',
  'Jewelry',
  'Collectibles',
  'Art',
  'Books',
  'Clothing',
  'Sports Equipment',
  'Tools',
  'Board Games',
  'Other',
];
