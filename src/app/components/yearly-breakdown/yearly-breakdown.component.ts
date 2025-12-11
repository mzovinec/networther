import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';

interface YearlyData {
  year: number;
  purchaseValue: number;
  currentValue: number;
  depreciation: number;
  itemCount: number;
}

@Component({
  selector: 'app-yearly-breakdown',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './yearly-breakdown.component.html',
  styleUrls: ['./yearly-breakdown.component.scss'],
})
export class YearlyBreakdownComponent {
  items: any;
  yearlyBreakdown: any;

  constructor(private itemService: ItemService) {
    this.items = this.itemService.getItems();

    // Calculate yearly breakdown
    this.yearlyBreakdown = computed(() => {
      const yearMap = new Map<number, YearlyData>();

      this.items().forEach((item: Item) => {
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

      // Convert map to array and sort by year (descending)
      return Array.from(yearMap.values()).sort((a, b) => b.year - a.year);
    });
  }

  // Calculate total depreciation percentage
  getDepreciationPercentage(yearData: YearlyData): number {
    if (yearData.purchaseValue === 0) return 0;
    return (yearData.depreciation / yearData.purchaseValue) * 100;
  }

  // Calculate retention percentage
  getRetentionPercentage(yearData: YearlyData): number {
    if (yearData.purchaseValue === 0) return 0;
    return (yearData.currentValue / yearData.purchaseValue) * 100;
  }

  // Get total summary
  getTotalSummary() {
    const breakdown = this.yearlyBreakdown();
    return {
      totalPurchaseValue: breakdown.reduce(
        (sum: number, year: YearlyData) => sum + year.purchaseValue,
        0
      ),
      totalCurrentValue: breakdown.reduce(
        (sum: number, year: YearlyData) => sum + year.currentValue,
        0
      ),
      totalDepreciation: breakdown.reduce(
        (sum: number, year: YearlyData) => sum + year.depreciation,
        0
      ),
      totalItems: breakdown.reduce(
        (sum: number, year: YearlyData) => sum + year.itemCount,
        0
      ),
    };
  }
}
