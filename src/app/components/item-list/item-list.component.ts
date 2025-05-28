import { Component } from '@angular/core';
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
  items: any;
  
  constructor(private itemService: ItemService) {
    this.items = this.itemService.getItems();
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
