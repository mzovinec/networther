import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss']
})
export class ItemFormComponent implements OnInit, AfterViewInit {
  @ViewChild('dayInput') dayInput!: ElementRef<HTMLInputElement>;
  @ViewChild('monthInput') monthInput!: ElementRef<HTMLInputElement>;
  @ViewChild('yearInput') yearInput!: ElementRef<HTMLInputElement>;
  
  dateInputError: string | null = null;
  dateValues = {
    day: '',
    month: '',
    year: ''
  };
  itemForm!: FormGroup;
  categories: string[] = [];
  isEditMode = false;
  currentItemId: string | null = null;
  estimatedValue: number | null = null;

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.categories = this.itemService.getCategories();
  }

  ngOnInit(): void {
    this.initForm();

    // Check if we're in edit mode
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.currentItemId = id;
        this.loadItemData(id);
      } else {
        // Set today's date in the separate inputs for new items
        const today = new Date();
        this.dateValues = {
          day: today.getDate().toString(),
          month: (today.getMonth() + 1).toString(),
          year: today.getFullYear().toString()
        };
      }
    });

    // Listen to purchase price and date changes to estimate value
    this.itemForm.get('purchasePrice')?.valueChanges.subscribe(() => {
      this.updateEstimatedValue();
    });
    
    this.itemForm.get('purchaseDate')?.valueChanges.subscribe(() => {
      this.updateEstimatedValue();
    });
    
    this.itemForm.get('category')?.valueChanges.subscribe(() => {
      this.updateEstimatedValue();
    });
  }

  initForm(): void {
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['Electronics', Validators.required],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      purchaseDate: [today, Validators.required],
      currentValue: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  ngAfterViewInit(): void {
    // Set timeout to ensure view is fully initialized
    setTimeout(() => {
      this.populateDateInputsFromFormControl();
    });
  }

  loadItemData(id: string): void {
    const items = this.itemService.getItems();
    const item = items().find(i => i.id === id);
    
    if (item) {
      // Format the date as YYYY-MM-DD for the input field
      const purchaseDate = new Date(item.purchaseDate);
      const formattedDate = purchaseDate.toISOString().split('T')[0];
      
      this.itemForm.patchValue({
        name: item.name,
        category: item.category,
        purchasePrice: item.purchasePrice,
        purchaseDate: formattedDate,
        currentValue: item.currentValue,
        notes: item.notes || ''
      });
      
      // Set the date values for the separate inputs
      this.dateValues = {
        day: purchaseDate.getDate().toString(),
        month: (purchaseDate.getMonth() + 1).toString(),
        year: purchaseDate.getFullYear().toString()
      };
    } else {
      // Item not found, redirect to list
      this.router.navigate(['/items']);
    }
  }

  updateEstimatedValue(): void {
    const purchasePrice = this.itemForm.get('purchasePrice')?.value;
    const purchaseDateStr = this.itemForm.get('purchaseDate')?.value;
    const category = this.itemForm.get('category')?.value;
    
    if (purchasePrice && purchaseDateStr && category) {
      const purchaseDate = new Date(purchaseDateStr);
      
      this.estimatedValue = this.itemService.estimateResaleValue({
        name: '',
        category,
        purchasePrice,
        purchaseDate
      });
      
      // Update the currentValue field with the estimated value
      this.itemForm.get('currentValue')?.setValue(this.estimatedValue);
    }
  }

  useEstimatedValue(): void {
    if (this.estimatedValue !== null) {
      this.itemForm.get('currentValue')?.setValue(this.estimatedValue);
    }
  }

  // Handle date input changes and validation
  onDateInputChange(field: 'day' | 'month' | 'year', event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // Store the value
    this.dateValues[field] = value;
    
    // Update the hidden form control with the combined date
    this.updateDateFormControl();
  }
  
  onDateKeyUp(field: 'day' | 'month' | 'year', event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Auto-focus to next input when filled
    if (field === 'day' && value.length >= 2) {
      this.monthInput.nativeElement.focus();
    } else if (field === 'month' && value.length >= 2) {
      this.yearInput.nativeElement.focus();
    }
  }
  
  onDatePaste(event: ClipboardEvent): void {
    // Prevent default paste behavior
    event.preventDefault();
    
    // Get pasted text
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    const pastedText = clipboardData.getData('text');
    
    // Try to parse the pasted text as a date
    // Support common formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, and D. M. YYYY
    let day = '', month = '', year = '';
    
    // Check for the app's format: D. M. YYYY (with periods and spaces)
    const appFormatMatch = pastedText.match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/);
    if (appFormatMatch) {
      day = appFormatMatch[1];
      month = appFormatMatch[2];
      year = appFormatMatch[3];
    }
    // Check for ISO format (YYYY-MM-DD)
    else {
      const isoMatch = pastedText.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
      if (isoMatch) {
        year = isoMatch[1];
        month = isoMatch[2];
        day = isoMatch[3];
      } 
      // Check for DD/MM/YYYY or MM/DD/YYYY
      else {
        const parts = pastedText.split(/[-\/\.\s]/);
        if (parts.length === 3) {
          // Assume DD/MM/YYYY format as default for European users
          if (parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
            day = parts[0];
            month = parts[1];
            year = parts[2];
          } 
          // Try MM/DD/YYYY if the first part is a valid month
          else if (parseInt(parts[0]) <= 12 && parseInt(parts[1]) <= 31) {
            month = parts[0];
            day = parts[1];
            year = parts[2];
          }
        }
      }
    }
    
    // If we successfully parsed a date, update the inputs
    if (day && month && year) {
      this.dateValues = { day, month, year };
      this.dayInput.nativeElement.value = day;
      this.monthInput.nativeElement.value = month;
      this.yearInput.nativeElement.value = year;
      this.updateDateFormControl();
    }
  }
  
  updateDateFormControl(): void {
    this.dateInputError = null;
    const { day, month, year } = this.dateValues;
    
    // Validate inputs
    if (!day || !month || !year) {
      return; // Don't update if any field is empty
    }
    
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Basic validation
    if (monthNum < 1 || monthNum > 12) {
      this.dateInputError = 'Month must be between 1 and 12';
      return;
    }
    
    // Check days in month
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    if (dayNum < 1 || dayNum > daysInMonth) {
      this.dateInputError = `Day must be between 1 and ${daysInMonth} for the selected month`;
      return;
    }
    
    // Format as YYYY-MM-DD for the form control
    const formattedMonth = monthNum.toString().padStart(2, '0');
    const formattedDay = dayNum.toString().padStart(2, '0');
    const dateString = `${yearNum}-${formattedMonth}-${formattedDay}`;
    
    // Update the hidden form control
    this.itemForm.get('purchaseDate')?.setValue(dateString);
  }
  
  populateDateInputsFromFormControl(): void {
    const dateString = this.itemForm.get('purchaseDate')?.value;
    if (dateString) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        this.dateValues = {
          day: date.getDate().toString(),
          month: (date.getMonth() + 1).toString(),
          year: date.getFullYear().toString()
        };
        
        // Update the input elements if they exist
        if (this.dayInput?.nativeElement) {
          this.dayInput.nativeElement.value = this.dateValues.day;
        }
        if (this.monthInput?.nativeElement) {
          this.monthInput.nativeElement.value = this.dateValues.month;
        }
        if (this.yearInput?.nativeElement) {
          this.yearInput.nativeElement.value = this.dateValues.year;
        }
      }
    }
  }

  onSubmit(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.itemForm.value;
    
    // Convert date string to Date object
    formValue.purchaseDate = new Date(formValue.purchaseDate);
    
    if (this.isEditMode && this.currentItemId) {
      const updatedItem: Item = {
        id: this.currentItemId,
        ...formValue
      };
      this.itemService.updateItem(updatedItem);
    } else {
      this.itemService.addItem(formValue);
    }
    
    this.router.navigate(['/items']);
  }
  
  onSubmitAndAddAnother(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.itemForm.value;
    
    // Convert date string to Date object
    formValue.purchaseDate = new Date(formValue.purchaseDate);
    
    // Add the item
    this.itemService.addItem(formValue);
    
    // Save the current date and category for the next item
    const currentDate = this.itemForm.get('purchaseDate')?.value;
    const currentCategory = this.itemForm.get('category')?.value;
    
    // Keep the current date values for the separate inputs
    const currentDateValues = { ...this.dateValues };
    
    // Reset the form but keep the date and category
    this.itemForm.reset({
      name: '',
      category: currentCategory,
      purchasePrice: 0,
      purchaseDate: currentDate,
      currentValue: 0,
      notes: ''
    });
    
    // Restore the date values for the separate inputs
    this.dateValues = currentDateValues;
    
    // Update the UI to reflect the date values
    setTimeout(() => {
      if (this.dayInput?.nativeElement) {
        this.dayInput.nativeElement.value = this.dateValues.day;
      }
      if (this.monthInput?.nativeElement) {
        this.monthInput.nativeElement.value = this.dateValues.month;
      }
      if (this.yearInput?.nativeElement) {
        this.yearInput.nativeElement.value = this.dateValues.year;
      }
      
      // Focus on the name field for the next item
      const nameInput = document.getElementById('name') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 0);

  }
}
