export interface Item {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: Date;
  currentValue: number;
  notes?: string;
}

export const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Vehicles',
  'Jewelry',
  'Collectibles',
  'Art',
  'Clothing',
  'Sports Equipment',
  'Tools',
  'Board Games',
  'Other'
];
