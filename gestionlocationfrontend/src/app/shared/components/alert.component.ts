import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div [class]="alertClasses" role="alert">
        <div class="flex items-start gap-3">
          @if (icon) {
            <i [class]="iconClass" aria-hidden="true"></i>
          }
          <div class="flex-1">
            @if (title) {
              <h4 class="font-bold mb-1">{{ title }}</h4>
            }
            <div class="text-sm">
              <ng-content></ng-content>
            </div>
          </div>
          @if (dismissible) {
            <button
              type="button"
              (click)="dismiss()"
              class="p-1 hover:bg-black/5 rounded transition-colors"
              aria-label="Fermer"
            >
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class AlertComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() title?: string;
  @Input() icon = true;
  @Input() dismissible = false;
  @Output() dismissed = new EventEmitter<void>();

  isVisible = true;

  get alertClasses(): string {
    const baseClasses = 'p-4 rounded-xl border animate-slide-up';
    
    const variantClasses = {
      success: 'bg-green-50 text-green-800 border-green-200',
      warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      danger: 'bg-red-50 text-red-800 border-red-200',
      info: 'bg-blue-50 text-blue-800 border-blue-200'
    };

    return `${baseClasses} ${variantClasses[this.variant]}`;
  }

  get iconClass(): string {
    const baseIcon = 'text-xl';
    const variantIcons = {
      success: 'bi bi-check-circle-fill text-green-600',
      warning: 'bi bi-exclamation-triangle-fill text-yellow-600',
      danger: 'bi bi-x-circle-fill text-red-600',
      info: 'bi bi-info-circle-fill text-blue-600'
    };

    return `${baseIcon} ${variantIcons[this.variant]}`;
  }

  dismiss(): void {
    this.isVisible = false;
    this.dismissed.emit();
  }
}
