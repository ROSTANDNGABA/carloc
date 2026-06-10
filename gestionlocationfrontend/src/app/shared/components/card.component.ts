import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type CardVariant = 'default' | 'hover' | 'clickable' | 'flat';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses">
      @if (title || actions) {
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            @if (title) {
              <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
            }
            @if (actions) {
              <div class="flex items-center gap-2">
                <ng-content select="[card-actions]"></ng-content>
              </div>
            }
          </div>
        </div>
      }
      
      <div [class]="bodyClasses">
        <ng-content></ng-content>
      </div>
      
      @if (footer) {
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <ng-content select="[card-footer]"></ng-content>
        </div>
      }
    </div>
  `,
})
export class CardComponent {
  @Input() variant: CardVariant = 'default';
  @Input() title?: string;
  @Input() actions = false;
  @Input() footer = false;
  @Input() padding = true;

  get cardClasses(): string {
    const baseClasses = 'bg-white rounded-2xl overflow-hidden transition-all duration-300';
    
    const variantClasses = {
      default: 'shadow-lg border border-gray-200',
      hover: 'shadow-lg border border-gray-200 hover:shadow-xl hover:border-carloc-300 hover:-translate-y-1 cursor-default',
      clickable: 'shadow-lg border border-gray-200 hover:shadow-xl hover:border-carloc-300 hover:-translate-y-1 cursor-pointer',
      flat: 'shadow-sm border border-gray-200'
    };

    return `${baseClasses} ${variantClasses[this.variant]}`;
  }

  get bodyClasses(): string {
    return this.padding ? 'p-6' : '';
  }
}
