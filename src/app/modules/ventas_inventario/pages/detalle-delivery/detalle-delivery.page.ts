import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { DeliveryDetalle } from '../../models/delivery.models';
import { DeliveryService } from '../../services/delivery.service';

@Component({
  imports: [RouterLink],
  selector: 'app-detalle-delivery-page',
  styleUrl: './detalle-delivery.page.css',
  templateUrl: './detalle-delivery.page.html',
})
export class DetalleDeliveryPage implements OnInit {
  private readonly deliveryService = inject(DeliveryService);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly delivery = signal<DeliveryDetalle | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly nuevoEstado = signal('');
  protected readonly observacion = signal('');
  protected readonly vistaCliente = computed(() => this.authService.tieneRol('CLIENTE'));
  protected readonly mapaUrl = computed<SafeResourceUrl>(() => {
    const item = this.delivery();
    const lat = Number(item?.latitud_entrega ?? -17.783327);
    const lng = Number(item?.longitud_entrega ?? -63.18214);
    const delta = 0.02;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.error.set('Delivery no valido.');
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    const request = this.vistaCliente()
      ? this.deliveryService.obtenerMiDelivery(id)
      : this.deliveryService.obtenerDelivery(id);
    request.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (delivery) => {
        this.delivery.set(delivery);
        this.nuevoEstado.set(delivery.estado);
      },
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  protected actualizarEstado(event: Event): void {
    this.nuevoEstado.set((event.target as HTMLSelectElement).value);
  }

  protected actualizarObservacion(event: Event): void {
    this.observacion.set((event.target as HTMLTextAreaElement).value);
  }

  protected guardarEstado(): void {
    const item = this.delivery();
    if (!item) return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.deliveryService
      .actualizarEstado(item.id, {
        estado: this.nuevoEstado(),
        observacion: this.observacion().trim() || null,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (response) => {
          this.delivery.set(response.delivery);
          this.mensaje.set(response.mensaje);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
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
    return 'No se pudo procesar el delivery.';
  }
}
