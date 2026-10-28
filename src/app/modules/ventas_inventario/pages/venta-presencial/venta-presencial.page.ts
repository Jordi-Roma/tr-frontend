import { OperacionNuevaDirective } from '../../../../core/directives/operacion-nueva.directive';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { VentaPresencialResponse } from '../../models/inventario.models';
import { ClienteVenta, VarianteVenta, VentasService } from '../../services/ventas.service';

type Linea = { variante: VarianteVenta; cantidad: number; descuento: number };

@Component({
  imports: [OperacionNuevaDirective],
  selector: 'app-venta-presencial-page',
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './venta-presencial.page.css'],
  templateUrl: './venta-presencial.page.html',
})
export class VentaPresencialPage implements OnInit {
  private readonly servicio = inject(VentasService);
  protected readonly esAdmin = inject(AuthService).tieneRol('ADMINISTRADOR');
  protected readonly ventas = signal<VentaPresencialResponse[]>([]);
  protected readonly sucursales = signal<{ id: number; nombre: string }[]>([]);
  protected readonly variantes = signal<VarianteVenta[]>([]);
  protected readonly clientes = signal<ClienteVenta[]>([]);
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly asignada = signal<number | null>(null);
  protected readonly clienteId = signal<number | null>(null);
  protected readonly varianteId = signal<number | null>(null);
  protected readonly cantidad = signal(1);
  protected readonly descuento = signal(0);
  protected readonly metodoPago = signal('EFECTIVO');
  protected readonly observacion = signal('');
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly puedeDescontar = signal(false);
  protected readonly condiciones = signal('');
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly total = computed(() =>
    this.lineas().reduce((s, l) => s + Number(l.variante.precio) * l.cantidad - l.descuento, 0),
  );

  ngOnInit(): void {
    this.cargando.set(true);
    forkJoin({
      opciones: this.servicio.opciones(),
      ventas: this.servicio.listarVentas(),
      clientes: this.servicio.clientes(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ opciones, ventas, clientes }) => {
          this.sucursales.set(opciones.sucursales);
          this.variantes.set(opciones.variantes);
          this.asignada.set(opciones.sucursal_asignada);
          this.sucursalId.set(opciones.sucursal_asignada);
          this.puedeDescontar.set(opciones.puede_descontar);
          this.ventas.set(ventas);
          this.clientes.set(clientes);
        },
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
    if (this.esAdmin)
      this.servicio
        .configuracion()
        .subscribe({
          next: (r) => this.condiciones.set(r.comprobante_config.condiciones ?? ''),
          error: () => {},
        });
  }

  protected texto(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
  protected numero(event: Event): number {
    return Number(this.texto(event));
  }
  protected cambiarSucursal(event: Event): void {
    if (this.asignada()) return;
    this.sucursalId.set(this.numero(event) || null);
    this.lineas.set([]);
    this.varianteId.set(null);
    this.buscarPrendas('');
    this.cargarVentas();
  }
  protected buscarPrendas(q: string): void {
    this.servicio
      .opciones(this.sucursalId(), q)
      .subscribe({
        next: (r) => this.variantes.set(r.variantes),
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
  }
  protected buscarClientes(q: string): void {
    this.servicio
      .clientes(q)
      .subscribe({
        next: (r) => this.clientes.set(r),
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
  }
  protected agregar(): void {
    this.error.set('');
    const v = this.variantes().find((v) => v.id === this.varianteId());
    const cantidad = this.cantidad();
    const descuento = this.puedeDescontar() ? this.descuento() : 0;
    if (
      !this.sucursalId() ||
      !v ||
      v.precio === null ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      descuento < 0 ||
      descuento > Number(v.precio) * cantidad
    ) {
      this.error.set('Selecciona sucursal, prenda con precio, cantidad entera y descuento válido.');
      return;
    }
    if (this.lineas().some((l) => l.variante.id === v.id)) {
      this.error.set('La prenda ya está en la venta. Retírala para cambiar su cantidad.');
      return;
    }
    if (cantidad > v.stock) {
      this.error.set('La cantidad supera las unidades disponibles.');
      return;
    }
    this.lineas.update((l) => [...l, { variante: v, cantidad, descuento }]);
    this.varianteId.set(null);
    this.cantidad.set(1);
    this.descuento.set(0);
  }
  protected quitar(id: number): void {
    this.lineas.update((l) => l.filter((i) => i.variante.id !== id));
  }
  protected registrarVenta(): void {
    const sucursal = this.sucursalId();
    if (this.guardando() || !sucursal || !this.lineas().length) return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.servicio
      .crearVenta({
        sucursal_id: sucursal,
        cliente_id: this.clienteId(),
        metodo_pago: this.metodoPago(),
        observacion: this.observacion().trim() || null,
        items: this.lineas().map((l) => ({
          producto_variante_id: l.variante.id,
          cantidad: l.cantidad,
          descuento: l.descuento,
        })),
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (venta) => {
          this.mensaje.set(`Venta ${venta.codigo} registrada. Su nota de venta está disponible.`);
          this.lineas.set([]);
          this.observacion.set('');
          this.cargarVentas();
          this.buscarPrendas('');
        },
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
  }
  protected descargar(id: number): void {
    this.servicio.descargarNota(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `nota-venta-${id}.pdf`;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.error.set('No se pudo descargar la nota de venta.'),
    });
  }
  protected enviar(id: number): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.servicio
      .enviarNota(id)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (r) => this.mensaje.set(r.mensaje),
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
  }
  protected guardarCondiciones(): void {
    this.servicio
      .guardarCondiciones(this.condiciones())
      .subscribe({
        next: (r) => this.mensaje.set(r.mensaje),
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
  }
  protected subirLogo(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (archivo)
      this.servicio
        .subirLogo(archivo)
        .subscribe({
          next: (r) => this.mensaje.set(r.mensaje),
          error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
        });
  }
  protected etiqueta(v: VarianteVenta): string {
    return `${v.producto_nombre} · ${v.talla_nombre} / ${v.color_nombre} · ${v.stock} disponibles`;
  }
  protected fecha(value: string): string {
    return new Date(value).toLocaleString('es-BO');
  }
  protected monto(value: number | string | null): string {
    return `Bs ${Number(value ?? 0).toFixed(2)}`;
  }
  private cargarVentas(): void {
    this.servicio
      .listarVentas(this.sucursalId())
      .subscribe({
        next: (r) => this.ventas.set(r),
        error: (e: HttpErrorResponse) => this.error.set(this.mensajeError(e)),
      });
  }
  private mensajeError(e: HttpErrorResponse): string {
    return typeof e.error?.detail === 'string'
      ? e.error.detail
      : 'No se pudo procesar la operación.';
  }
}
