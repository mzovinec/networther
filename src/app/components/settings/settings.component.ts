import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ItemService } from '../../services/item.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  importStatus: 'idle' | 'success' | 'error' = 'idle';
  importMessage = '';

  private http = inject(HttpClient);

  constructor(private itemService: ItemService) {}

  private resetStatus() {
    this.importStatus = 'idle';
    this.importMessage = '';
  }

  deleteAllItems() {
    if (
      confirm(
        'Are you sure you want to delete all items? This action cannot be undone.'
      )
    ) {
      this.itemService.deleteAllItems();
      this.importStatus = 'success';
      this.importMessage = 'All items have been deleted successfully.';
      setTimeout(() => this.resetStatus(), 3000);
    }
  }

  addDummyData() {
    if (confirm('This will add sample data. Continue?')) {
      this.importStatus = 'idle';
      this.importMessage = 'Loading dummy data...';

      this.http.get('assets/dummy_data.json').subscribe({
        next: (data: any) => {
          try {
            if (!data || !data.items || !Array.isArray(data.items)) {
              throw new Error('Invalid dummy data format');
            }

            // Process each item to ensure it has all required fields
            const processedItems = data.items.map((item: any) => ({
              ...item,
              purchaseDate: new Date(item.purchaseDate).toISOString(),
              // Ensure all required fields are present with defaults if missing
              description: item.notes || '',
              location: 'Unknown',
              serialNumber: '',
              warrantyExpiry: '',
            }));

            // Import the data using the existing import functionality
            const importSuccessful = this.itemService.importFromJson(
              JSON.stringify({
                items: processedItems,
              })
            );

            if (importSuccessful) {
              this.importStatus = 'success';
              this.importMessage = 'Dummy data has been added successfully.';
            } else {
              throw new Error('Failed to import data');
            }
          } catch (error) {
            console.error('Error processing dummy data:', error);
            this.importStatus = 'error';
            this.importMessage =
              'Failed to process dummy data. Please try again.';
          } finally {
            setTimeout(() => this.resetStatus(), 3000);
          }
        },
        error: (error) => {
          console.error('Error loading dummy data:', error);
          this.importStatus = 'error';
          this.importMessage = 'Failed to load dummy data. Please try again.';
          setTimeout(() => this.resetStatus(), 3000);
        },
      });
    }
  }

  exportData() {
    const jsonData = this.itemService.exportToJson();
    this.downloadJsonFile(jsonData, 'networther-data.json');
  }

  exportMonthlyData() {
    const items = this.itemService.getItems()();

    if (items.length === 0) {
      alert('No items to export');
      return;
    }

    // Find the earliest and latest dates
    const dates = items.map((item) => new Date(item.purchaseDate));
    const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const today = new Date();

    // Generate monthly data
    const monthlyData: {
      month: string;
      netWorth: number;
      totalSpent: number;
      monthlyPurchases: number;
    }[] = [];

    let currentDate = new Date(
      earliestDate.getFullYear(),
      earliestDate.getMonth(),
      1
    );
    const endDate = new Date(today.getFullYear(), today.getMonth(), 1);

    while (currentDate <= endDate) {
      const monthStr = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}`;

      // Calculate net worth, total spent, and monthly purchases
      let netWorth = 0;
      let totalSpent = 0;
      let monthlyPurchases = 0;
      items.forEach((item) => {
        const itemDate = new Date(item.purchaseDate);
        const itemMonth = new Date(
          itemDate.getFullYear(),
          itemDate.getMonth(),
          1
        );

        // Check if item was purchased in this specific month
        if (itemMonth.getTime() === currentDate.getTime()) {
          monthlyPurchases += item.purchasePrice;
        }

        if (itemMonth <= currentDate) {
          // Add to total spent
          totalSpent += item.purchasePrice;

          // Calculate what the item was worth at the end of this month
          const monthsSincePurchase =
            (currentDate.getFullYear() - itemDate.getFullYear()) * 12 +
            (currentDate.getMonth() - itemDate.getMonth());

          // Estimate value at that point in time
          const category = item.category;
          const depreciationRates: Record<string, number> = {
            Electronics: 0.2 / 12,
            Furniture: 0.1 / 12,
            Vehicles: 0.15 / 12,
            Jewelry: 0.05 / 12,
            Collectibles: -0.02 / 12,
            Art: -0.03 / 12,
            Clothing: 0.3 / 12,
            'Sports Equipment': 0.15 / 12,
            Tools: 0.08 / 12,
            'Board Games': 0.05 / 12,
            Other: 0.12 / 12,
          };

          const monthlyRate = depreciationRates[category] || 0.12 / 12;
          const valueAtMonth =
            item.purchasePrice * Math.pow(1 - monthlyRate, monthsSincePurchase);
          const floorValue =
            monthlyRate > 0 ? item.purchasePrice * 0.1 : valueAtMonth;

          netWorth += Math.max(valueAtMonth, floorValue);
        }
      });

      monthlyData.push({
        month: monthStr,
        netWorth: Math.round(netWorth * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        monthlyPurchases: Math.round(monthlyPurchases * 100) / 100,
      });

      // Move to next month
      currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      );
    }

    // Generate CSV with Czech number formatting (comma as decimal separator)
    let csv = 'Month,Net Worth (CZK),Total Spent (CZK),Monthly Purchases (CZK)\n';
    monthlyData.forEach((row) => {
      const formattedNetWorth = row.netWorth.toFixed(0);
      const formattedTotalSpent = row.totalSpent.toFixed(0);
      const formattedMonthlyPurchases = row.monthlyPurchases.toFixed(0);
      csv += `${row.month},${formattedNetWorth},${formattedTotalSpent},${formattedMonthlyPurchases}\n`;
    });

    this.downloadCsvFile(csv, 'networther-monthly-data.csv');
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const contents = e.target?.result as string;
      if (contents) {
        const success = this.itemService.importFromJson(contents);

        if (success) {
          this.importStatus = 'success';
          this.importMessage = 'Data imported successfully!';
        } else {
          this.importStatus = 'error';
          this.importMessage =
            'Failed to import data. Please check the file format.';
        }

        // Reset file input
        input.value = '';

        // Reset status after 5 seconds
        setTimeout(() => {
          this.importStatus = 'idle';
          this.importMessage = '';
        }, 5000);
      }
    };

    reader.onerror = () => {
      this.importStatus = 'error';
      this.importMessage = 'Error reading file.';

      // Reset status after 5 seconds
      setTimeout(() => {
        this.importStatus = 'idle';
        this.importMessage = '';
      }, 5000);
    };

    reader.readAsText(file);
  }

  private downloadJsonFile(jsonData: string, filename: string) {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private downloadCsvFile(csvData: string, filename: string) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
