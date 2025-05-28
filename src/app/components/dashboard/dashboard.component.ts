import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemService } from '../../services/item.service';
import { RouterLink } from '@angular/router';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  items: any; // Signal<Item[]>
  netWorth: any;
  depreciation: any;
  topItems: any;
  categorySummary: any;

  constructor(private itemService: ItemService) {
    this.items = this.itemService.getItems();
    this.netWorth = computed(() => this.itemService.calculateNetWorth());
    this.depreciation = computed(() => this.itemService.calculateDepreciation());
    
    // Get top 5 most valuable items
    this.topItems = computed(() => {
      return [...this.items()]
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 5);
    });
    
    // Category summary
    this.categorySummary = computed(() => {
      const summary: Record<string, { count: number, totalValue: number }> = {};
      
      this.items().forEach((item: Item) => {
        if (!summary[item.category]) {
          summary[item.category] = { count: 0, totalValue: 0 };
        }
        summary[item.category].count += 1;
        summary[item.category].totalValue += item.currentValue;
      });
      
      return Object.entries(summary)
        .map(([category, data]) => ({
          category,
          count: data.count,
          totalValue: data.totalValue,
          percentage: (data.totalValue / this.netWorth() * 100).toFixed(1)
        }))
        .sort((a, b) => b.totalValue - a.totalValue);
    });
  }
}
