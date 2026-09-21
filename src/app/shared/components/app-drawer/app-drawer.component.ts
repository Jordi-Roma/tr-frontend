import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-drawer',
  styleUrl: './app-drawer.component.css',
  templateUrl: './app-drawer.component.html',
})
export class AppDrawerComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() eyebrow = '';

  @Output() close = new EventEmitter<void>();

  protected cerrar(): void {
    this.close.emit();
  }
}
