import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses">
      <svg 
        [class]="spinnerClasses" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          class="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          stroke-width="4"
        ></circle>
        <path 
          class="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      @if (text) {
        <p class="mt-3 text-gray-600 font-medium">{{ text }}</p>
      }
    </div>
  `,
})
export class LoadingComponent {
  @Input() size: LoadingSize = 'md';
  @Input() text?: string;
  @Input() center = true;

  get containerClasses(): string {
    const baseClasses = 'flex flex-col items-center';
    return this.center ? `${baseClasses} justify-center min-h-[200px]` : baseClasses;
  }

  get spinnerClasses(): string {
    const baseClasses = 'animate-spin text-carloc-600';
    
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-10 w-10',
      lg: 'h-16 w-16',
      xl: 'h-24 w-24'
    };

    return `${baseClasses} ${sizeClasses[this.size]}`;
  }
}
