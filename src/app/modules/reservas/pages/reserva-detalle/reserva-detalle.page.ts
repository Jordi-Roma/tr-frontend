import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { finalize } from 'rxjs';
import { ReservaResponse } from '../../models/reservas.models';
import { ReservasService } from '../../services/reservas.service';

@Component({
  imports: [RouterLink],
  selector: 'app-reserva-detalle-page',
  styleUrl: './reserva-detalle.page.css',
  templateUrl: './reserva-detalle.page.html',
})
export class ReservaDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservasService = inject(ReservasService);

  protected readonly reserva = signal<ReservaResponse | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly cantidades = signal<Record<number, number>>({});
  protected readonly metodoPago = signal<'STRIPE' | 'QR' | 'EFECTIVO'>('STRIPE');
  protected readonly observacion = signal('');
  protected readonly mostrandoQr = signal(false);
  protected readonly qrDataUrl = signal('');
  protected readonly subtotalSeleccionado = computed(() => {
    const reserva = this.reserva();
    if (!reserva) return 0;
    const cantidades = this.cantidades();
    return reserva.detalles.reduce((total, detalle) => {
      return total + (cantidades[detalle.id] ?? 0) * Number(detalle.precio_unitario ?? 0);
    }, 0);
  });
  protected readonly anticipoAplicado = computed(() => {
    const reserva = this.reserva();
    if (!reserva?.anticipo_pagado) return 0;
    return Math.min(Number(reserva.monto_reserva ?? 0), this.subtotalSeleccionado());
  });
  protected readonly saldoAPagar = computed(() => Math.max(this.subtotalSeleccionado() - this.anticipoAplicado(), 0));
  protected readonly qrPayload = computed(() => {
    const reserva = this.reserva();
    if (!reserva) return '';
    return `StyleAR Reserva ${reserva.codigo}\nMonto: ${this.formatPrecio(this.saldoAPagar())}\nPago por QR`;
  });

  ngOnInit(): void {
    const reservaId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(reservaId)) {
      this.error.set('Reserva no valida.');
      return;
    }

    this.cargarReserva(reservaId);
  }

  protected cancelar(): void {
    const reserva = this.reserva();

    if (reserva === null) {
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    this.reservasService
      .cancelarReserva(reserva.id)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (actualizada) => this.reserva.set(actualizada),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected pagarAnticipo(): void {
    const reserva = this.reserva();
    if (!reserva || !this.requiereAnticipo(reserva)) return;

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.reservasService
      .pagarAnticipoStripe(reserva.id)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.reserva.set(respuesta.reserva);
          if (respuesta.checkout_url) {
            window.location.href = respuesta.checkout_url;
            return;
          }
          this.mensaje.set(respuesta.mensaje ?? 'Anticipo procesado.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected actualizarCantidad(detalleId: number, value: string, maximo: number): void {
    const cantidad = Math.min(Math.max(Number(value) || 0, 0), maximo);
    this.cantidades.update((actual) => ({ ...actual, [detalleId]: cantidad }));
    this.ocultarQr();
  }

  protected actualizarMetodo(event: Event): void {
    this.metodoPago.set((event.target as HTMLSelectElement).value as 'STRIPE' | 'QR' | 'EFECTIVO');
    this.ocultarQr();
  }

  protected actualizarObservacion(event: Event): void {
    this.observacion.set((event.target as HTMLTextAreaElement).value);
  }

  protected finalizarReserva(): void {
    const reserva = this.reserva();
    if (!reserva || !this.puedeFinalizar(reserva)) return;

    if (this.metodoPago() === 'QR' && !this.mostrandoQr()) {
      void this.generarQrPago();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.reservasService
      .finalizarMiReserva(reserva.id, {
        metodo_pago: this.metodoPago(),
        observacion: this.observacion().trim() || null,
        items: reserva.detalles.map((detalle) => ({
          reserva_detalle_id: detalle.id,
          cantidad: this.cantidades()[detalle.id] ?? 0,
        })),
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.reserva.set(respuesta.reserva);
          if (respuesta.checkout_url) {
            window.location.href = respuesta.checkout_url;
            return;
          }
          this.mensaje.set(respuesta.mensaje ?? 'Reserva completada correctamente.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected cerrarQr(): void {
    this.ocultarQr();
  }

  protected puedeCancelar(reserva: ReservaResponse): boolean {
    return !['COMPLETADA', 'CANCELADA', 'VENCIDA'].includes(reserva.estado);
  }

  protected requiereAnticipo(reserva: ReservaResponse): boolean {
    return Number(reserva.monto_reserva ?? 0) > 0 && !reserva.anticipo_pagado && !['COMPLETADA', 'CANCELADA', 'VENCIDA'].includes(reserva.estado);
  }

  protected puedeFinalizar(reserva: ReservaResponse): boolean {
    return !this.requiereAnticipo(reserva)
      && !['COMPLETADA', 'CANCELADA', 'VENCIDA'].includes(reserva.estado)
      && this.subtotalSeleccionado() > 0;
  }

  protected formatPrecio(value: number | string | null | undefined): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? `Bs ${parsed.toFixed(2)}` : 'Bs 0.00';
  }

  protected formatFecha(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString('es-BO') : 'Sin fecha';
  }

  private cargarReserva(id: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.reservasService
      .obtenerReserva(id)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (reserva) => {
          this.reserva.set(reserva);
          this.cantidades.set(Object.fromEntries(reserva.detalles.map((detalle) => [detalle.id, detalle.cantidad])));
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;

      if (typeof detail === 'string') {
        return detail;
      }
    }

    return 'No se pudo cargar la reserva.';
  }

  private async generarQrPago(): Promise<void> {
    this.error.set('');
    this.mensaje.set('');
    try {
      const dataUrl = await QRCode.toDataURL(this.qrPayload(), {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
          dark: '#111111',
          light: '#ffffff',
        },
      });
      this.qrDataUrl.set(dataUrl);
      this.mostrandoQr.set(true);
    } catch {
      this.error.set('No se pudo generar el QR de pago.');
      this.ocultarQr();
    }
  }

  private ocultarQr(): void {
    this.mostrandoQr.set(false);
    this.qrDataUrl.set('');
  }
}
