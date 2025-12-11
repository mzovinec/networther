import {
  Component,
  computed,
  signal,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
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
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  items: any; // Signal<Item[]>
  netWorth: any;
  depreciation: any;
  totalPurchaseValue: any;
  selectedCategory = signal<string | null>(null);
  topItems: any;
  categorySummary: any;
  showCurrentYearOnly = signal<boolean>(false);
  currentView = signal<'dashboard' | 'yearly'>('dashboard');
  yearlyBreakdown: any;

  // Filtered item count
  filteredItemCount = computed(() => {
    const category = this.selectedCategory();
    let filtered = this.items();
    if (this.showCurrentYearOnly()) {
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter((item: Item) => {
        const date = new Date(item.purchaseDate);
        return date.getFullYear() === currentYear;
      });
    }
    if (!category) return filtered.length;
    return filtered.filter((item: Item) => item.category === category).length;
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

    // Helper to get filtered items by year and category
    const getFilteredItems = () => {
      let filtered = this.items();
      if (this.showCurrentYearOnly()) {
        const currentYear = new Date().getFullYear();
        filtered = filtered.filter((item: Item) => {
          const date = new Date(item.purchaseDate);
          return date.getFullYear() === currentYear;
        });
      }
      const category = this.selectedCategory();
      if (category) {
        filtered = filtered.filter((item: Item) => item.category === category);
      }
      return filtered;
    };

    // Calculate net worth - filtered by year and category
    this.netWorth = computed(() => {
      return getFilteredItems().reduce(
        (total: number, item: Item) => total + item.currentValue,
        0
      );
    });

    // Calculate depreciation - filtered by year and category
    this.depreciation = computed(() => {
      return getFilteredItems().reduce(
        (total: number, item: Item) =>
          total + (item.purchasePrice - item.currentValue),
        0
      );
    });

    // Calculate total purchase value - filtered by year and category
    this.totalPurchaseValue = computed(() => {
      return getFilteredItems().reduce(
        (total: number, item: Item) => total + item.purchasePrice,
        0
      );
    });

    // Get top items, filtered by year and category

    this.topItems = computed(() => {
      return getFilteredItems()
        .sort((a: any, b: any) => b.currentValue - a.currentValue)
        .slice(0, 5);
    });

    // Category summary
    this.categorySummary = computed(() => {
      const summary: Record<string, { count: number; totalValue: number }> = {};
      const filtered = getFilteredItems();
      filtered.forEach((item: Item) => {
        if (!summary[item.category]) {
          summary[item.category] = { count: 0, totalValue: 0 };
        }
        summary[item.category].count += 1;
        summary[item.category].totalValue += item.currentValue;
      });
      const baseValueForPercentage = this.netWorth();
      return Object.entries(summary)
        .map(([category, data]) => ({
          category,
          count: data.count,
          totalValue: data.totalValue,
          percentage: baseValueForPercentage
            ? ((data.totalValue / baseValueForPercentage) * 100).toFixed(1)
            : '0.0',
        }))
        .sort((a, b) => b.totalValue - a.totalValue);
    });

    // Yearly breakdown
    this.yearlyBreakdown = computed(() => {
      const yearMap = new Map<
        number,
        {
          year: number;
          purchaseValue: number;
          currentValue: number;
          depreciation: number;
          itemCount: number;
        }
      >();

      getFilteredItems().forEach((item: Item) => {
        const year = new Date(item.purchaseDate).getFullYear();

        if (!yearMap.has(year)) {
          yearMap.set(year, {
            year,
            purchaseValue: 0,
            currentValue: 0,
            depreciation: 0,
            itemCount: 0,
          });
        }

        const yearData = yearMap.get(year)!;
        yearData.purchaseValue += item.purchasePrice;
        yearData.currentValue += item.currentValue;
        yearData.depreciation += item.purchasePrice - item.currentValue;
        yearData.itemCount += 1;
      });

      return Array.from(yearMap.values()).sort((a, b) => b.year - a.year);
    });
    // Toggle current year filter
  }
  toggleCurrentYearOnly(): void {
    this.showCurrentYearOnly.set(!this.showCurrentYearOnly());
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

  // Switch between views
  switchView(view: 'dashboard' | 'yearly'): void {
    this.currentView.set(view);
  }

  // Calculate depreciation percentage for yearly data
  getDepreciationPercentage(
    purchaseValue: number,
    depreciation: number
  ): number {
    if (purchaseValue === 0) return 0;
    return (depreciation / purchaseValue) * 100;
  }

  // Calculate retention percentage for yearly data
  getRetentionPercentage(purchaseValue: number, currentValue: number): number {
    if (purchaseValue === 0) return 0;
    return (currentValue / purchaseValue) * 100;
  }
}
