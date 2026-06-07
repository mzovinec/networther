// KNOWN BUG (red until fixed): addDummyData REPLACES instead of APPENDS.
// Intended: append sample data to existing items. See memory project-angular21-vitest-refactor.
//
// This spec asserts the INTENDED append behavior and will FAIL against the
// current code (addDummyData -> itemService.importFromJson(...) which does
// items.set(...), wiping pre-existing items). Do NOT "fix" this by weakening
// the assertions; fix addDummyData to append instead.

import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { SettingsComponent } from './settings.component';
import { ItemService } from '../../services/item.service';

describe('SettingsComponent.addDummyData() (KNOWN BUG: replaces instead of appends)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Recreate the root ItemService singleton per test so it re-reads
    // localStorage in its constructor.
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is a KNOWN BUG (red until fixed): should APPEND sample data, preserving existing items', () => {
    // Seed TWO existing items BEFORE TestBed creates the component / injects ItemService.
    localStorage.setItem(
      'items',
      JSON.stringify([
        {
          id: '1',
          name: 'Existing Laptop',
          category: 'Electronics',
          purchasePrice: 1500,
          purchaseDate: '2023-01-15T00:00:00.000Z',
          currentValue: 900,
          notes: 'work laptop',
        },
        {
          id: '2',
          name: 'Existing Sofa',
          category: 'Furniture',
          purchasePrice: 800,
          purchaseDate: '2022-06-01T00:00:00.000Z',
          currentValue: 600,
          notes: 'living room',
        },
      ])
    );

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    const httpMock = TestBed.inject(HttpTestingController);
    const itemService = TestBed.inject(ItemService);

    // Mock the native confirm dialog so addDummyData proceeds.
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.addDummyData();

    // Flush the HTTP request for the dummy data with TWO valid dummy items.
    const req = httpMock.expectOne('assets/dummy_data.json');
    req.flush({
      items: [
        {
          id: '3',
          name: 'Dummy Phone',
          category: 'Electronics',
          purchasePrice: 1000,
          purchaseDate: '2024-03-10T00:00:00.000Z',
          currentValue: 700,
          notes: 'sample phone',
        },
        {
          id: '4',
          name: 'Dummy Bike',
          category: 'Sports Equipment',
          purchasePrice: 500,
          purchaseDate: '2024-05-20T00:00:00.000Z',
          currentValue: 400,
          notes: 'sample bike',
        },
      ],
    });

    const items = itemService.getItems()();

    // INTENDED append behavior (these FAIL now, which is the point):
    // the two ORIGINAL items must still be present.
    expect(items.find((item) => item.name === 'Existing Laptop')).toBeTruthy();
    expect(items.find((item) => item.name === 'Existing Sofa')).toBeTruthy();
    // the dummy items were added too.
    expect(items.find((item) => item.name === 'Dummy Phone')).toBeTruthy();
    // total count should be existing (2) + dummy (2).
    expect(items.length).toBe(4);

    try {
      httpMock.verify();
    } catch {
      // ignore outstanding-request verification noise; assertions above are the point.
    }
  });
});
