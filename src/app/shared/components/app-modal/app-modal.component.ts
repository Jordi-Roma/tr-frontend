import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  styleUrl: './app-modal.component.css',
  templateUrl: './app-modal.component.html',
})
export class AppModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() eyebrow = '';

  @Output() close = new EventEmitter<void>();

  protected cerrar(): void {
    this.close.emit();
  }
}
