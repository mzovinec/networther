import { Component, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item, YearlyData } from '../../models/item.model';

@Component({
  selector: 'app-yearly-breakdown',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './yearly-breakdown.component.html',
  styleUrls: ['./yearly-breakdown.component.scss'],
})
export class YearlyBreakdownComponent {
  readonly items: Signal<Item[]>;
  readonly yearlyBreakdown: Signal<YearlyData[]>;

  constructor(private itemService: ItemService) {
    this.items = this.itemService.getItems();
    this.yearlyBreakdown = computed(() =>
      this.itemService.getYearlyBreakdown(this.items())
    );
  }

  getDepreciationPercentage(yearData: YearlyData): number {
    return this.itemService.depreciationPercentage(
      yearData.purchaseValue,
      yearData.depreciation
    );
  }

  getRetentionPercentage(yearData: YearlyData): number {
    return this.itemService.retentionPercentage(
      yearData.purchaseValue,
      yearData.currentValue
    );
  }

  getTotalSummary() {
    const breakdown = this.yearlyBreakdown();
    return {
      totalPurchaseValue: breakdown.reduce(
        (sum, year) => sum + year.purchaseValue,
        0
      ),
      totalCurrentValue: breakdown.reduce(
        (sum, year) => sum + year.currentValue,
        0
      ),
      totalDepreciation: breakdown.reduce(
        (sum, year) => sum + year.depreciation,
        0
      ),
      totalItems: breakdown.reduce((sum, year) => sum + year.itemCount, 0),
    };
  }
}
