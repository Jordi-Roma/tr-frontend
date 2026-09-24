import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { obtenerEstadoPagoVisual } from '../../models/pago-estado.util';
import { OrdenPagoResponse } from '../../models/pago.models';
import { PagoService } from '../../services/pago.service';

@Component({
  selector: 'app-pago-resultado-page',
  imports: [RouterLink],
  templateUrl: './pago-resultado.page.html',
  styleUrl: './pago-resultado.page.css',
})
export class PagoResultadoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pagoService = inject(PagoService);

  protected readonly orden = signal<OrdenPagoResponse | null>(null);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly estadoRetorno = signal('');

  ngOnInit(): void {
    this.estadoRetorno.set(this.route.snapshot.queryParamMap.get('estado') ?? '');
    const ordenId = Number(this.route.snapshot.queryParamMap.get('orden_id'));
    if (!Number.isSafeInteger(ordenId) || ordenId <= 0) {
      this.error.set('Orden de pago no valida.');
      return;
    }
    this.cargarOrden(ordenId);
  }

  protected confirmarPrueba(aprobar: boolean): void {
    const orden = this.orden();
    if (orden === null) return;
    this.procesando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.pagoService.confirmarPrueba(orden.orden_id, { aprobar })
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: (actualizada) => {
          this.orden.set(actualizada);
          this.mensaje.set(aprobar ? 'Pago confirmado correctamente.' : 'Pago cancelado correctamente.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected formatMonto(value: number | string | null | undefined): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? `Bs ${parsed.toFixed(2)}` : 'Bs 0.00';
  }

  protected estadoClase(): string {
    return obtenerEstadoPagoVisual(this.orden()?.estado).clase;
  }

  protected estadoEtiqueta(estado: string): string {
    return obtenerEstadoPagoVisual(estado).etiqueta;
  }

  protected estadoDescripcion(estado: string): string {
    return obtenerEstadoPagoVisual(estado).descripcion;
  }

  private cargarOrden(ordenId: number): void {
    this.cargando.set(true);
    this.pagoService.obtenerOrden(ordenId)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (orden) => this.orden.set(orden),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;
      if (typeof detail === 'string') return detail;
    }
    return 'No se pudo consultar el pago.';
  }
}
