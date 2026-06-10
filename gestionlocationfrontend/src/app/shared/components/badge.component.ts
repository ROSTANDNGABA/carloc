import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      @if (icon) {
        <i [class]="icon" aria-hidden="true"></i>
      }
      @if (dot) {
        <span class="w-2 h-2 rounded-full bg-current"></span>
      }
      <ng-content></ng-content>
    </span>
  `,
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'neutral';
  @Input() icon?: string;
  @Input() dot = false;

  get badgeClasses(): string {
    const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border';
    
    const variantClasses = {
      success: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      danger: 'bg-red-100 text-red-700 border-red-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
      neutral: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    return `${baseClasses} ${variantClasses[this.variant]}`;
  }
}
