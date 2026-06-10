import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
        (click)="closeOnBackdrop && close()"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- Modal -->
        <div 
          [class]="modalClasses"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="title ? 'modal-title' : null"
        >
          <!-- Header -->
          @if (title || showClose) {
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              @if (title) {
                <h2 id="modal-title" class="text-xl font-bold text-gray-900">{{ title }}</h2>
              }
              @if (showClose) {
                <button
                  type="button"
                  (click)="close()"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <i class="bi bi-x-lg text-xl"></i>
                </button>
              }
            </div>
          }
          
          <!-- Body -->
          <div [class]="bodyClasses">
            <ng-content></ng-content>
          </div>
          
          <!-- Footer -->
          @if (hasFooter) {
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <ng-content select="[modal-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title?: string;
  @Input() size: ModalSize = 'md';
  @Input() showClose = true;
  @Input() closeOnBackdrop = true;
  @Input() hasFooter = false;
  @Output() closed = new EventEmitter<void>();

  get modalClasses(): string {
    const baseClasses = 'relative bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in';
    
    const sizeClasses = {
      sm: 'w-full max-w-md',
      md: 'w-full max-w-lg',
      lg: 'w-full max-w-2xl',
      xl: 'w-full max-w-4xl',
      full: 'w-full h-full max-w-none max-h-none rounded-none'
    };

    return `${baseClasses} ${sizeClasses[this.size]}`;
  }

  get bodyClasses(): string {
    return 'p-6';
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }
}
