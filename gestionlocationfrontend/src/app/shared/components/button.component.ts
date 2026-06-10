import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
      (click)="handleClick($event)"
    >
      @if (loading) {
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ loadingText || 'Chargement...' }}</span>
      } @else {
        @if (icon && !iconRight) {
          <i [class]="icon" aria-hidden="true"></i>
        }
        <ng-content></ng-content>
        @if (icon && iconRight) {
          <i [class]="icon" aria-hidden="true"></i>
        }
      }
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() loadingText?: string;
  @Input() icon?: string;
  @Input() iconRight = false;
  @Input() fullWidth = false;
  @Output() clicked = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all duration-300 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg'
    };

    const variantClasses = {
      primary: 'text-white bg-gradient-to-r from-carloc-600 to-carloc-500 hover:from-carloc-700 hover:to-carloc-600 shadow-carloc hover:shadow-carloc-lg hover:-translate-y-0.5 active:translate-y-0 focus:ring-carloc-200',
      outline: 'text-carloc-600 border-2 border-carloc-600 hover:bg-carloc-50 focus:ring-carloc-200',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-200',
      danger: 'text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md focus:ring-red-200'
    };

    const widthClass = this.fullWidth ? 'w-full' : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${widthClass}`;
  }

  handleClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
