import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { obtenerEstadoPagoVisual } from '../../models/pago-estado.util';
import { PagoFiltros, PagoHistorialItem } from '../../models/pago.models';
import { PagoService } from '../../services/pago.service';

@Component({
  selector: 'app-historial-pagos-page',
  imports: [RouterLink],
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './historial-pagos.page.css'],
  templateUrl: './historial-pagos.page.html',
})
export class HistorialPagosPage implements OnInit {
  private readonly pagoService = inject(PagoService);
  private readonly router = inject(Router);

  protected readonly pagos = signal<PagoHistorialItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly estado = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly cliente = signal('');
  protected readonly sucursalId = signal('');

  protected readonly vistaCliente = signal(false);

  ngOnInit(): void {
    this.vistaCliente.set(this.router.url.startsWith('/mis-pagos'));
    this.cargarPagos();
  }

  protected aplicarFiltros(): void {
    this.cargarPagos();
  }

  protected limpiarFiltros(): void {
    this.estado.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.cliente.set('');
    this.sucursalId.set('');
    this.cargarPagos();
  }

  protected actualizarEstado(event: Event): void {
    this.estado.set((event.target as HTMLSelectElement).value);
  }

  protected actualizarFechaDesde(event: Event): void {
    this.fechaDesde.set((event.target as HTMLInputElement).value);
  }

  protected actualizarFechaHasta(event: Event): void {
    this.fechaHasta.set((event.target as HTMLInputElement).value);
  }

  protected actualizarCliente(event: Event): void {
    this.cliente.set((event.target as HTMLInputElement).value);
  }

  protected actualizarSucursal(event: Event): void {
    this.sucursalId.set((event.target as HTMLInputElement).value);
  }

  protected detalleLink(pago: PagoHistorialItem): string[] {
    return this.vistaCliente() ? ['/mis-pagos', `${pago.orden_id}`] : ['/pagos', `${pago.orden_id}`];
  }

  protected formatMonto(value: number | string): string {
    const monto = Number(value ?? 0);
    return Number.isFinite(monto) ? `Bs ${monto.toFixed(2)}` : 'Bs 0.00';
  }

  protected formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    const fecha = new Date(value);
    return Number.isNaN(fecha.getTime()) ? value : fecha.toLocaleString('es-BO');
  }

  protected estadoClase(estado: string): string {
    return obtenerEstadoPagoVisual(estado).clase;
  }

  protected estadoEtiqueta(estado: string): string {
    return obtenerEstadoPagoVisual(estado).etiqueta;
  }

  protected estadoDescripcion(estado: string): string {
    return obtenerEstadoPagoVisual(estado).descripcion;
  }

  private cargarPagos(): void {
    this.cargando.set(true);
    this.error.set('');
    const filtros = this.construirFiltros();
    const request$ = this.vistaCliente()
      ? this.pagoService.listarMisPagos(filtros)
      : this.pagoService.listarPagos(filtros);

    request$
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (pagos) => this.pagos.set(pagos),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private construirFiltros(): PagoFiltros {
    return {
      estado: this.estado() || null,
      fecha_desde: this.fechaDesde() || null,
      fecha_hasta: this.fechaHasta() || null,
      cliente: this.vistaCliente() ? null : this.cliente().trim() || null,
      sucursal_id: this.vistaCliente() || this.sucursalId().trim() === '' ? null : Number(this.sucursalId()),
    };
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo cargar el historial de pagos.';
  }
}
