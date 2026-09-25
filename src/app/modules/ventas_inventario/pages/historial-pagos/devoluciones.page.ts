import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { CrearDevolucionRequest, Devolucion, VentaDevolucionElegible } from '../../models/devolucion.models';
import { DevolucionService } from '../../services/devolucion.service';

@Component({
  selector: 'app-devoluciones-page',
  standalone: true,
  templateUrl: './devoluciones.page.html',
  styleUrl: './devoluciones.page.css',
})
export class DevolucionesPage implements OnInit {
  private readonly service = inject(DevolucionService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly esCliente = signal(false);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');
  protected readonly ventas = signal<VentaDevolucionElegible[]>([]);
  protected readonly devoluciones = signal<Devolucion[]>([]);
  protected readonly ventaSeleccionada = signal<VentaDevolucionElegible | null>(null);
  protected readonly devolucionSeleccionada = signal<Devolucion | null>(null);
  protected readonly cantidades = signal<Record<number, number>>({});
  protected readonly cantidadesRecibidas = signal<Record<number, number>>({});
  protected readonly motivo = signal('');
  protected readonly observacion = signal('');
  protected readonly notaGestion = signal('');
  protected readonly estadoFiltro = signal('');
  protected readonly puedeRevisar = signal(false);
  protected readonly puedeReembolsar = signal(false);
  protected readonly referencia = signal('');
  protected readonly metodoManual = signal('EFECTIVO');

  ngOnInit(): void {
    this.esCliente.set(this.route.snapshot.data['vista'] === 'cliente');
    const autorizado = this.auth.tieneRol('ADMINISTRADOR') || this.auth.tieneRol('ENCARGADO_SUCURSAL');
    this.puedeRevisar.set(autorizado);
    this.puedeReembolsar.set(autorizado);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    const solicitud = this.esCliente()
      ? this.service.listarPropias()
      : this.service.listarGestion(this.estadoFiltro() || undefined);
    solicitud.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (items) => this.devoluciones.set(items),
      error: (err: HttpErrorResponse) => this.error.set(this.mensajeError(err)),
    });
    if (this.esCliente()) {
      this.service.listarVentasElegibles().subscribe({
        next: (ventas) => this.ventas.set(ventas),
        error: (err: HttpErrorResponse) => this.error.set(this.mensajeError(err)),
      });
    }
  }

  protected iniciarSolicitud(venta: VentaDevolucionElegible): void {
    this.ventaSeleccionada.set(venta);
    this.cantidades.set(Object.fromEntries(venta.detalles.map((item) => [item.venta_detalle_id, 0])));
    this.motivo.set('');
    this.observacion.set('');
  }

  protected actualizarCantidad(id: number, event: Event): void {
    const maximo = this.ventaSeleccionada()?.detalles.find((item) => item.venta_detalle_id === id)?.cantidad_disponible ?? 0;
    const cantidad = Math.min(maximo, Math.max(0, Number((event.target as HTMLInputElement).value) || 0));
    this.cantidades.update((actual) => ({ ...actual, [id]: cantidad }));
  }

  protected enviarSolicitud(): void {
    const venta = this.ventaSeleccionada();
    const items = Object.entries(this.cantidades())
      .filter(([, cantidad]) => cantidad > 0)
      .map(([venta_detalle_id, cantidad]) => ({ venta_detalle_id: Number(venta_detalle_id), cantidad }));
    if (!venta || this.motivo().trim().length < 5 || !items.length) {
      this.error.set('Indica el motivo y selecciona al menos una unidad para devolver.');
      return;
    }
    const body: CrearDevolucionRequest = {
      motivo: this.motivo().trim(),
      observacion: this.observacion().trim() || null,
      items,
    };
    this.ejecutar(this.service.solicitar(venta.venta_id, body), 'Solicitud enviada.');
    this.ventaSeleccionada.set(null);
  }

  protected cancelar(devolucion: Devolucion): void {
    if (devolucion.estado === 'SOLICITADA') {
      this.ejecutar(this.service.cancelarPropia(devolucion.id), 'Solicitud cancelada.');
    }
  }

  protected cerrarSolicitud(): void { this.ventaSeleccionada.set(null); }

  protected seleccionar(devolucion: Devolucion): void {
    this.devolucionSeleccionada.set(devolucion);
    this.cantidadesRecibidas.set(Object.fromEntries(
      devolucion.detalles.map((detalle) => [detalle.id, detalle.cantidad_solicitada]),
    ));
    this.notaGestion.set('');
    this.referencia.set('');
  }

  protected cerrarDetalle(): void { this.devolucionSeleccionada.set(null); }
  protected cambiarMotivo(event: Event): void { this.motivo.set((event.target as HTMLInputElement).value); }
  protected cambiarObservacion(event: Event): void { this.observacion.set((event.target as HTMLTextAreaElement).value); }
  protected cambiarNota(event: Event): void { this.notaGestion.set((event.target as HTMLTextAreaElement).value); }
  protected cambiarReferencia(event: Event): void { this.referencia.set((event.target as HTMLInputElement).value); }
  protected cambiarMetodo(event: Event): void { this.metodoManual.set((event.target as HTMLSelectElement).value); }
  protected cambiarFiltro(event: Event): void {
    this.estadoFiltro.set((event.target as HTMLSelectElement).value);
    this.cargar();
  }

  protected actualizarRecepcion(id: number, event: Event): void {
    const detalle = this.devolucionSeleccionada()?.detalles.find((item) => item.id === id);
    const cantidad = Math.min(detalle?.cantidad_solicitada ?? 0, Math.max(0, Number((event.target as HTMLInputElement).value) || 0));
    this.cantidadesRecibidas.update((actual) => ({ ...actual, [id]: cantidad }));
  }

  protected revisar(aprobar: boolean): void {
    const item = this.devolucionSeleccionada();
    if (!item) return;
    if (!aprobar && !this.notaGestion().trim()) {
      this.error.set('Indica el motivo del rechazo para dejarlo registrado.');
      return;
    }
    this.ejecutar(this.service.revisar(item.id, aprobar, this.notaGestion().trim()), aprobar ? 'Devolución aprobada.' : 'Devolución rechazada.');
  }

  protected registrarRecepcion(): void {
    const item = this.devolucionSeleccionada();
    if (!item) return;
    const detalles = item.detalles.map((detalle) => ({
      detalle_id: detalle.id,
      cantidad_aceptada: this.cantidadesRecibidas()[detalle.id] ?? 0,
    }));
    this.ejecutar(this.service.recibir(item.id, detalles), 'Recepción registrada; se repusieron solo las unidades aceptadas.');
  }

  protected procesarReembolso(): void {
    const item = this.devolucionSeleccionada();
    if (!item) return;
    if (item.proveedor_pago_original?.toUpperCase() === 'STRIPE') {
      this.ejecutar(this.service.reembolsarStripe(item.id), 'Resultado del reembolso recibido desde Stripe.');
      return;
    }
    if (this.referencia().trim().length < 3) {
      this.error.set('Registra la referencia del comprobante del reembolso manual.');
      return;
    }
    this.ejecutar(
      this.service.reembolsarManual(item.id, this.metodoManual(), this.referencia().trim(), this.notaGestion().trim()),
      'Reembolso manual registrado.',
    );
  }

  protected monto(valor: number | string): string { return `Bs ${Number(valor || 0).toFixed(2)}`; }
  protected tieneMonto(valor: number | string): boolean { return Number(valor || 0) > 0; }
  protected fecha(valor: string | null): string { return valor ? new Date(valor).toLocaleString('es-BO') : '—'; }
  protected estadoClase(estado: string): string { return `status status-${estado.toLowerCase().replaceAll('_', '-')}`; }
  protected etiquetaEstado(estado: string): string { return estado.replaceAll('_', ' '); }

  private ejecutar(request: Observable<Devolucion>, exito: string): void {
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (actualizada) => {
        this.mensaje.set(exito);
        this.devolucionSeleccionada.set(actualizada);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.mensajeError(err)),
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
