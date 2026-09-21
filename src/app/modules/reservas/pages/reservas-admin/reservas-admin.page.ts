import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { CatalogoSucursal } from '../../../catalogo/models/catalogo-publico.models';
import { ReservaResponse } from '../../models/reservas.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { ReservasService } from '../../services/reservas.service';

const ESTADOS = ['PENDIENTE_ANTICIPO', 'PENDIENTE', 'PREPARADA', 'EN_ATENCION', 'COMPLETADA', 'CANCELADA', 'VENCIDA'];

@Component({
  selector: 'app-reservas-admin-page',
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './reservas-admin.page.css'],
  templateUrl: './reservas-admin.page.html',
})
export class ReservasAdminPage implements OnInit {
  private readonly reservasService = inject(ReservasService);
  private readonly catalogoService = inject(CatalogoPublicoService);
  private readonly authService = inject(AuthService);

  protected readonly estados = ESTADOS;
  protected readonly esAdmin = signal(this.authService.tieneRol('ADMINISTRADOR'));
  protected readonly reservas = signal<ReservaResponse[]>([]);
  protected readonly sucursales = signal<CatalogoSucursal[]>([]);
  protected readonly reservaSeleccionada = signal<ReservaResponse | null>(null);
  protected readonly cantidadesVenta = signal<Record<number, number>>({});
  protected readonly metodoPago = signal('EFECTIVO');
  protected readonly observacionVenta = signal('');
  protected readonly estadoFiltro = signal('');
  protected readonly sucursalFiltro = signal<number | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarReservas();
  }

  protected cambiarFiltro(event: Event): void {
    this.estadoFiltro.set((event.target as HTMLSelectElement).value);
    this.cargarReservas();
  }

  protected cambiarSucursal(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sucursalFiltro.set(value === '' ? null : Number(value));
    this.cargarReservas();
  }

  protected verDetalle(reserva: ReservaResponse): void {
    this.reservaSeleccionada.set(reserva);
    this.cantidadesVenta.set(
      Object.fromEntries(reserva.detalles.map((detalle) => [detalle.id, detalle.cantidad]))
    );
    this.metodoPago.set('EFECTIVO');
    this.observacionVenta.set('');
  }

  protected cerrarDetalle(): void {
    this.reservaSeleccionada.set(null);
    this.cantidadesVenta.set({});
    this.observacionVenta.set('');
  }

  protected cambiarEstado(reserva: ReservaResponse, event: Event): void {
    const estado = (event.target as HTMLSelectElement).value;

    if (estado === reserva.estado) {
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.reservasService
      .cambiarEstado(reserva.id, { estado })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (actualizada) => {
          this.reservas.update((items) =>
            items.map((item) => (item.id === actualizada.id ? actualizada : item))
          );
          this.reservaSeleccionada.update((item) =>
            item?.id === actualizada.id ? actualizada : item
          );
          this.mensaje.set(`Reserva ${actualizada.codigo} actualizada a ${actualizada.estado}.`);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected actualizarCantidadVenta(detalleId: number, value: string, maximo: number): void {
    const cantidad = Math.min(Math.max(Number(value) || 0, 0), maximo);
    this.cantidadesVenta.update((actual) => ({ ...actual, [detalleId]: cantidad }));
  }

  protected actualizarMetodoPago(event: Event): void {
    this.metodoPago.set((event.target as HTMLSelectElement).value);
  }

  protected actualizarObservacionVenta(event: Event): void {
    this.observacionVenta.set((event.target as HTMLTextAreaElement).value);
  }

  protected subtotalVenta(reserva: ReservaResponse): number {
    const cantidades = this.cantidadesVenta();
    return reserva.detalles.reduce((total, detalle) => {
      const cantidad = cantidades[detalle.id] ?? 0;
      return total + cantidad * Number(detalle.precio_unitario ?? 0);
    }, 0);
  }

  protected anticipoAplicado(reserva: ReservaResponse): number {
    if (!reserva.anticipo_pagado) {
      return 0;
    }
    return Math.min(Number(reserva.monto_reserva ?? 0), this.subtotalVenta(reserva));
  }

  protected saldoVenta(reserva: ReservaResponse): number {
    return Math.max(this.subtotalVenta(reserva) - this.anticipoAplicado(reserva), 0);
  }

  protected puedeFinalizar(reserva: ReservaResponse): boolean {
    const requiereAnticipo = Number(reserva.monto_reserva ?? 0) > 0 && !reserva.anticipo_pagado;
    return !requiereAnticipo
      && !['COMPLETADA', 'CANCELADA', 'VENCIDA', 'PENDIENTE_ANTICIPO'].includes(reserva.estado)
      && this.subtotalVenta(reserva) > 0;
  }

  protected finalizarVenta(reserva: ReservaResponse): void {
    if (!this.puedeFinalizar(reserva)) {
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.reservasService
      .finalizarComoVenta(reserva.id, {
        metodo_pago: this.metodoPago(),
        observacion: this.observacionVenta().trim() || null,
        items: reserva.detalles.map((detalle) => ({
          reserva_detalle_id: detalle.id,
          cantidad: this.cantidadesVenta()[detalle.id] ?? 0,
        })),
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (actualizada) => {
          this.reservas.update((items) =>
            ['COMPLETADA', 'CANCELADA', 'VENCIDA'].includes(actualizada.estado)
              ? items.filter((item) => item.id !== actualizada.id)
              : items.map((item) => (item.id === actualizada.id ? actualizada : item))
          );
          this.reservaSeleccionada.set(actualizada);
          this.mensaje.set(`Reserva ${actualizada.codigo} cerrada como venta presencial.`);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected formatPrecio(value: number | string | null | undefined): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? `Bs ${parsed.toFixed(2)}` : 'Bs 0.00';
  }

  protected formatFecha(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString('es-BO') : 'Sin fecha';
  }

  protected estadoClase(estado: string): string {
    return `estado-${estado.toLowerCase().replace('_', '-')}`;
  }

  private cargarReservas(): void {
    this.cargando.set(true);
    this.error.set('');

    this.reservasService
      .listarReservas(this.estadoFiltro() || null, this.esAdmin() ? this.sucursalFiltro() : null)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (reservas) => this.reservas.set(reservas),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private cargarSucursales(): void {
    if (!this.esAdmin()) {
      return;
    }

    this.catalogoService.obtenerFiltros().subscribe({
      next: (filtros) => this.sucursales.set(filtros.sucursales),
      error: () => this.sucursales.set([]),
    });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;

      if (typeof detail === 'string') {
        return detail;
      }
    }

    return 'No se pudieron cargar o actualizar las reservas.';
  }
}
