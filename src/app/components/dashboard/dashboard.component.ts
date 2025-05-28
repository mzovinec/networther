import { Component, computed, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemService } from '../../services/item.service';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  items: any; // Signal<Item[]>
  netWorth: any;
  depreciation: any;
  totalPurchaseValue: any;
  selectedCategory = signal<string | null>(null);
  topItems: any;
  categorySummary: any;
  
  // Filtered item count
  filteredItemCount = computed(() => {
    const category = this.selectedCategory();
    if (!category) return this.items().length;
    
    return this.items().filter((item: Item) => item.category === category).length;
  });
  
  // Depreciation percentage relative to original value
  depreciationPercentageFromOriginal = computed(() => {
    const originalValue = this.totalPurchaseValue();
    if (originalValue === 0) return 0;
    
    return (this.depreciation() / originalValue) * 100;
  });
  
  // Depreciation percentage relative to current value
  depreciationPercentageFromCurrent = computed(() => {
    const currentValue = this.netWorth();
    if (currentValue === 0) return 0;
    
    return (this.depreciation() / (currentValue + this.depreciation())) * 100;
  });

  constructor(private itemService: ItemService, private router: Router) {
    this.items = this.itemService.getItems();
    
    // Calculate net worth - filtered by category if one is selected
    this.netWorth = computed(() => {
      const category = this.selectedCategory();
      if (!category) {
        return this.itemService.calculateNetWorth();
      }
      
      // Calculate net worth for the selected category
      return this.items()
        .filter((item: Item) => item.category === category)
        .reduce((total: number, item: Item) => total + item.currentValue, 0);
    });
    
    // Calculate depreciation - filtered by category if one is selected
    this.depreciation = computed(() => {
      const category = this.selectedCategory();
      if (!category) {
        return this.itemService.calculateDepreciation();
      }
      
      // Calculate depreciation for the selected category
      return this.items()
        .filter((item: Item) => item.category === category)
        .reduce((total: number, item: Item) => total + (item.purchasePrice - item.currentValue), 0);
    });
    
    // Calculate total purchase value - filtered by category if one is selected
    this.totalPurchaseValue = computed(() => {
      const category = this.selectedCategory();
      const filteredItems = category 
        ? this.items().filter((item: Item) => item.category === category)
        : this.items();
        
      return filteredItems.reduce((total: number, item: Item) => total + item.purchasePrice, 0);
    });
    
    // Get top items, filtered by category if selected
    this.topItems = computed(() => {
      let filteredItems = [...this.items()];
      const category = this.selectedCategory();
      
      // Filter by category if one is selected
      if (category) {
        filteredItems = filteredItems.filter(item => item.category === category);
      }
      
      // Sort by value and take top 5
      return filteredItems
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 5);
    });
    
    // Category summary
    this.categorySummary = computed(() => {
      const summary: Record<string, { count: number, totalValue: number }> = {};
      const selectedCategory = this.selectedCategory();
      
      this.items().forEach((item: Item) => {
        if (!summary[item.category]) {
          summary[item.category] = { count: 0, totalValue: 0 };
        }
        summary[item.category].count += 1;
        summary[item.category].totalValue += item.currentValue;
      });
      
      // Calculate the base value for percentage calculation
      // If a category is selected, use that category's total value as 100%
      // Otherwise use the total net worth
      const baseValueForPercentage = selectedCategory
        ? summary[selectedCategory]?.totalValue || 0
        : this.netWorth();
      
      return Object.entries(summary)
        .map(([category, data]) => {
          let percentage;
          
          if (selectedCategory) {
            // If a category is selected:
            if (category === selectedCategory) {
              // The selected category is 100%
              percentage = '100.0';
            } else {
              // Other categories show their percentage relative to the selected category
              percentage = ((data.totalValue / baseValueForPercentage) * 100).toFixed(1);
            }
          } else {
            // Normal calculation when no category is selected
            percentage = ((data.totalValue / baseValueForPercentage) * 100).toFixed(1);
          }
          
          return {
            category,
            count: data.count,
            totalValue: data.totalValue,
            percentage
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);
    });
  }
  
  // Select a category to filter items
  selectCategory(category: string): void {
    if (this.selectedCategory() === category) {
      // If clicking the already selected category, clear the filter
      this.selectedCategory.set(null);
    } else {
      // Otherwise, set the filter to the clicked category
      this.selectedCategory.set(category);
    }
  }
  
  private titleEffect = effect(() => {
    // This effect will run whenever selectedCategory signal changes
    const category = this.selectedCategory();
  });
  
  ngOnInit(): void {
    // Initial title update
  }
  
  ngOnDestroy(): void {
    // Clean up any subscriptions if needed
  }
  
}
