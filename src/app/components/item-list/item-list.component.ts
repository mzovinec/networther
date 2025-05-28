import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.scss']
})
export class ItemListComponent {
  // Raw items from service
  private rawItems: any;
  
  // Filtering state
  filterCategory = signal<string | null>(null);
  
  // Sorting state
  sortColumn = signal<string>('currentValue');
  sortDirection = signal<'asc' | 'desc'>('desc');
  
  // Page title
  pageTitle = computed(() => {
    const category = this.filterCategory();
    return category ? `Items in ${category}` : 'Your Items';
  });
  
  // Computed filtered and sorted items
  items = computed(() => {
    let items = [...this.rawItems()];
    const category = this.filterCategory();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    
    // Apply category filter if set
    if (category) {
      items = items.filter(item => item.category === category);
    }
    
    // Apply sorting
    return items.sort((a, b) => {
      let comparison = 0;
      
      // Handle different data types
      if (column === 'purchaseDate') {
        // Date comparison
        comparison = new Date(a[column]).getTime() - new Date(b[column]).getTime();
      } else if (typeof a[column] === 'string') {
        // String comparison
        comparison = a[column].localeCompare(b[column]);
      } else {
        // Number comparison
        comparison = a[column] - b[column];
      }
      
      // Apply sort direction
      return direction === 'asc' ? comparison : -comparison;
    });
  });
  
  // Available categories for the filter dropdown
  availableCategories = computed(() => {
    const categories = new Set<string>();
    this.rawItems().forEach((item: Item) => categories.add(item.category));
    return Array.from(categories).sort();
  });
  
  constructor(private itemService: ItemService) {
    this.rawItems = this.itemService.getItems();
  }
  
  // Set category filter
  setFilter(category: string | null): void {
    this.filterCategory.set(category);
    
    // When filtering by category, default to sorting by value
    if (category) {
      this.sortColumn.set('currentValue');
      this.sortDirection.set('desc');
    }
  }
  
  // Sort items by column
  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      // Toggle direction if same column
      this.sortDirection.update(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending for values (ascending for names)
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'name' ? 'asc' : 'desc');
    }
  }
  
  // Get sort icon class
  getSortIconClass(column: string): string {
    if (this.sortColumn() !== column) return 'sort-icon';
    return this.sortDirection() === 'asc' ? 'sort-icon asc' : 'sort-icon desc';
  }
  
  deleteItem(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this item?')) {
      this.itemService.deleteItem(id);
    }
  }
  
  // Helper method to format dates nicely
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('cs-CZ');
  }
}
