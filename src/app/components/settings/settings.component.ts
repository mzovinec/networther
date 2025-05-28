import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  
  constructor(private itemService: ItemService) {}
  
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
