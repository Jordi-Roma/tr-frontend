import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { obtenerEstadoPagoVisual } from '../../models/pago-estado.util';
import { PagoHistorialDetalle } from '../../models/pago.models';
import { PagoService } from '../../services/pago.service';

@Component({
  selector: 'app-detalle-pago-page',
  imports: [RouterLink],
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './detalle-pago.page.css'],
  templateUrl: './detalle-pago.page.html',
})
export class DetallePagoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pagoService = inject(PagoService);

  protected readonly pago = signal<PagoHistorialDetalle | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly vistaCliente = signal(false);

  ngOnInit(): void {
    this.vistaCliente.set(this.router.url.startsWith('/mis-pagos'));
    const ordenId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(ordenId) || ordenId <= 0) {
      this.error.set('Pago no válido.');
      return;
    }
    this.cargarPago(ordenId);
  }

  protected volverLink(): string[] {
    return this.vistaCliente() ? ['/mis-pagos'] : ['/pagos'];
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

  private cargarPago(ordenId: number): void {
    this.cargando.set(true);
    this.error.set('');
    const request$ = this.vistaCliente()
      ? this.pagoService.obtenerMiPago(ordenId)
      : this.pagoService.obtenerPago(ordenId);

    request$
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (pago) => this.pago.set(pago),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo consultar el pago.';
  }
}
