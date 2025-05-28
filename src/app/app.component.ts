import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'networther';
  mobileMenuOpen = false;
  
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
}
