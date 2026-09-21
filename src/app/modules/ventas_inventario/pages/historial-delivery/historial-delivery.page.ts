import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { DeliveryItem } from '../../models/delivery.models';
import { DeliveryService } from '../../services/delivery.service';

@Component({
  imports: [RouterLink],
  selector: 'app-historial-delivery-page',
  styleUrl: './historial-delivery.page.css',
  templateUrl: './historial-delivery.page.html',
})
export class HistorialDeliveryPage implements OnInit {
  private readonly deliveryService = inject(DeliveryService);
  private readonly authService = inject(AuthService);

  protected readonly deliveries = signal<DeliveryItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly estado = signal('');
  protected readonly cliente = signal('');

  protected readonly vistaCliente = computed(() => this.authService.tieneRol('CLIENTE'));
  protected readonly titulo = computed(() => (this.vistaCliente() ? 'Mis deliveries' : 'Gestión de delivery'));

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    const request = this.vistaCliente()
      ? this.deliveryService.listarMisDeliveries(this.estado() || null)
      : this.deliveryService.listarDeliveries({
          estado: this.estado() || null,
          cliente: this.cliente() || null,
        });

    request.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (items) => this.deliveries.set(items),
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  protected actualizarEstado(event: Event): void {
    this.estado.set((event.target as HTMLSelectElement).value);
  }

  protected actualizarCliente(event: Event): void {
    this.cliente.set((event.target as HTMLInputElement).value);
  }

  protected detallePath(delivery: DeliveryItem): string {
    return this.vistaCliente() ? `/mis-deliveries/${delivery.id}` : `/delivery/${delivery.id}`;
  }

  protected formatPrecio(value: number | string | null | undefined): string {
    const number = Number(value ?? 0);
    return `Bs ${Number.isFinite(number) ? number.toFixed(2) : '0.00'}`;
  }

  protected formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-BO');
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;
      if (typeof detail === 'string') return detail;
    }
    return 'No se pudieron cargar los deliveries.';
  }
}
