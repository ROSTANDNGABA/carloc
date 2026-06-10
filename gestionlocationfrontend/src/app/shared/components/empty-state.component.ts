import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      @if (icon) {
        <div class="w-16 h-16 mb-4 rounded-2xl bg-carloc-100 text-carloc-600 flex items-center justify-center">
          <i [class]="icon + ' text-3xl'" aria-hidden="true"></i>
        </div>
      }
      
      @if (title) {
        <h3 class="text-xl font-bold text-gray-900 mb-2">{{ title }}</h3>
      }
      
      @if (description) {
        <p class="text-gray-600 mb-6 max-w-md">{{ description }}</p>
      }
      
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title?: string;
  @Input() description?: string;
}
