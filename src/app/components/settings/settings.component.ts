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
  styleUrls: ['./settings.component.scss']
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
    if (confirm('Are you sure you want to delete all items? This action cannot be undone.')) {
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
              warrantyExpiry: ''
            }));
            
            // Import the data using the existing import functionality
            const importSuccessful = this.itemService.importFromJson(JSON.stringify({
              items: processedItems
            }));
            
            if (importSuccessful) {
              this.importStatus = 'success';
              this.importMessage = 'Dummy data has been added successfully.';
            } else {
              throw new Error('Failed to import data');
            }
          } catch (error) {
            console.error('Error processing dummy data:', error);
            this.importStatus = 'error';
            this.importMessage = 'Failed to process dummy data. Please try again.';
          } finally {
            setTimeout(() => this.resetStatus(), 3000);
          }
        },
        error: (error) => {
          console.error('Error loading dummy data:', error);
          this.importStatus = 'error';
          this.importMessage = 'Failed to load dummy data. Please try again.';
          setTimeout(() => this.resetStatus(), 3000);
        }
      });
    }
  }

  exportData() {
    const jsonData = this.itemService.exportToJson();
    this.downloadJsonFile(jsonData, 'networther-data.json');
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
          this.importMessage = 'Failed to import data. Please check the file format.';
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
}
