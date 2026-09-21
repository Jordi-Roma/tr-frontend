import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { CatalogoSucursal } from '../../../catalogo/models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { VentaPresencialResponse } from '../../models/inventario.models';
import { VarianteResponse } from '../../../administracion/models/variante.models';
import { VarianteService } from '../../../administracion/services/variante.service';
import { VentasService } from '../../services/ventas.service';

type VentaCampo = 'sucursal_id' | 'producto_variante_id' | 'cantidad' | 'descuento' | 'metodo_pago' | 'observacion';

@Component({
  selector: 'app-venta-presencial-page',
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './venta-presencial.page.css'],
  templateUrl: './venta-presencial.page.html',
})
export class VentaPresencialPage implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly catalogoService = inject(CatalogoPublicoService);
  private readonly varianteService = inject(VarianteService);

  protected readonly ventas = signal<VentaPresencialResponse[]>([]);
  protected readonly sucursales = signal<CatalogoSucursal[]>([]);
  protected readonly variantes = signal<VarianteResponse[]>([]);
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly form = signal({
    sucursal_id: null as number | null,
    producto_variante_id: null as number | null,
    cantidad: 1,
    descuento: 0,
    metodo_pago: 'EFECTIVO',
    observacion: '',
  });
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    this.cargarBase();
  }

  protected cambiarFiltroSucursal(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroSucursalId.set(value === '' ? null : Number(value));
    this.cargarVentas();
  }

  protected actualizarCampo(campo: VentaCampo, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const parsedValue = ['sucursal_id', 'producto_variante_id', 'cantidad', 'descuento'].includes(campo)
      ? Number(value)
      : value;
    this.form.update((actual) => ({ ...actual, [campo]: parsedValue }));
  }

  protected registrarVenta(): void {
    const data = this.form();
    if (!data.sucursal_id || !data.producto_variante_id || data.cantidad <= 0 || data.descuento < 0) {
      this.error.set('Completa sucursal, prenda, cantidad y descuento válido.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.ventasService
      .crearVenta({
        sucursal_id: data.sucursal_id,
        metodo_pago: data.metodo_pago || null,
        observacion: data.observacion || null,
        items: [{ producto_variante_id: data.producto_variante_id, cantidad: data.cantidad, descuento: data.descuento }],
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (venta) => {
          this.mensaje.set(`Venta ${venta.codigo} registrada correctamente.`);
          this.form.update((actual) => ({ ...actual, producto_variante_id: null, cantidad: 1, descuento: 0, observacion: '' }));
          this.cargarVentas();
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected etiquetaVariante(variante: VarianteResponse): string {
    const detalle = [variante.talla_nombre, variante.color_nombre].filter(Boolean).join(' / ');
    return `${variante.producto_nombre} - ${detalle || variante.sku}`;
  }

  protected fechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleString('es-BO');
  }

  protected monto(valor: number | string): string {
    return `Bs ${Number(valor).toFixed(2)}`;
  }

  private cargarBase(): void {
    this.cargando.set(true);
    forkJoin({
      sucursales: this.catalogoService.listarSucursales(),
      variantes: this.varianteService.listarVariantes(),
      ventas: this.ventasService.listarVentas(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ sucursales, variantes, ventas }) => {
          this.sucursales.set(sucursales);
          this.variantes.set(variantes.filter((variante) => variante.activo));
          this.ventas.set(ventas);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private cargarVentas(): void {
    this.cargando.set(true);
    this.error.set('');
    this.ventasService
      .listarVentas(this.filtroSucursalId())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => this.ventas.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo procesar la venta.';
  }
}
