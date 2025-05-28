import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ItemListComponent } from './components/item-list/item-list.component';
import { ItemFormComponent } from './components/item-form/item-form.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'items', component: ItemListComponent },
  { path: 'add-item', component: ItemFormComponent },
  { path: 'edit-item/:id', component: ItemFormComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' }
];
