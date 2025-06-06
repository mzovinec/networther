import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'networther';
  mobileMenuOpen = false;
  showFirstTimeNotification = false;
  private readonly FIRST_VISIT_KEY = 'networther_first_visit';
  
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    
    // Prevent scrolling when mobile menu is open
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
  
  closeMobileMenu() {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  ngOnInit() {
    this.checkFirstVisit();
  }

  private checkFirstVisit() {
    const hasVisited = localStorage.getItem(this.FIRST_VISIT_KEY);
    if (!hasVisited) {
      this.showFirstTimeNotification = true;
      localStorage.setItem(this.FIRST_VISIT_KEY, 'true');
    }
  }

  dismissNotification() {
    this.showFirstTimeNotification = false;
  }
}
