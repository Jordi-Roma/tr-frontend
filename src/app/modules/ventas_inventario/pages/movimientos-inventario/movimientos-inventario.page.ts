import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { CatalogoSucursal } from '../../../catalogo/models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { MovimientoInventarioResponse } from '../../models/inventario.models';
import { VarianteResponse } from '../../../administracion/models/variante.models';
import { ProveedorResponse } from '../../../administracion/models/proveedor.models';
import { InventarioService } from '../../services/inventario.service';
import { ProveedorService } from '../../../administracion/services/proveedor.service';
import { VarianteService } from '../../../administracion/services/variante.service';

type MovimientoCampo = 'sucursal_id' | 'producto_variante_id' | 'tipo' | 'cantidad' | 'motivo' | 'proveedor_id';

@Component({
  selector: 'app-movimientos-inventario-page',
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './movimientos-inventario.page.css'],
  templateUrl: './movimientos-inventario.page.html',
})
export class MovimientosInventarioPage implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoPublicoService);
  private readonly varianteService = inject(VarianteService);
  private readonly proveedorService = inject(ProveedorService);

  protected readonly tipos = ['ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'];
  protected readonly movimientos = signal<MovimientoInventarioResponse[]>([]);
  protected readonly sucursales = signal<CatalogoSucursal[]>([]);
  protected readonly variantes = signal<VarianteResponse[]>([]);
  protected readonly proveedores = signal<ProveedorResponse[]>([]);
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly tipoFiltro = signal('');
  protected readonly form = signal({
    sucursal_id: null as number | null,
    producto_variante_id: null as number | null,
    tipo: 'ENTRADA',
    cantidad: 1,
    motivo: '',
    proveedor_id: null as number | null,
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
    this.cargarMovimientos();
  }

  protected cambiarTipoFiltro(event: Event): void {
    this.tipoFiltro.set((event.target as HTMLSelectElement).value);
    this.cargarMovimientos();
  }

  protected actualizarCampo(campo: MovimientoCampo, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const parsedValue = ['sucursal_id', 'producto_variante_id', 'cantidad'].includes(campo)
      ? Number(value)
      : campo === 'proveedor_id'
        ? (value === '' ? null : Number(value))
      : value;
    this.form.update((actual) => ({
      ...actual,
      [campo]: parsedValue,
      ...(campo === 'tipo' && value !== 'ENTRADA' ? { proveedor_id: null } : {}),
    }));
  }

  protected registrarMovimiento(): void {
    const data = this.form();
    if (!data.sucursal_id || !data.producto_variante_id || data.cantidad <= 0) {
      this.error.set('Selecciona sucursal, variante y una cantidad válida.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.inventarioService
      .registrarMovimiento({
        sucursal_id: data.sucursal_id,
        producto_variante_id: data.producto_variante_id,
        tipo: data.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo || null,
        proveedor_id: data.tipo === 'ENTRADA' ? data.proveedor_id : null,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.mensaje.set('Movimiento registrado correctamente.');
          this.form.update((actual) => ({ ...actual, cantidad: 1, motivo: '' }));
          this.cargarMovimientos();
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

  private cargarBase(): void {
    this.cargando.set(true);
    forkJoin({
      sucursales: this.catalogoService.listarSucursales(),
      variantes: this.varianteService.listarVariantes(),
      proveedores: this.proveedorService.listarProveedores(),
      movimientos: this.inventarioService.listarMovimientos(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ sucursales, variantes, proveedores, movimientos }) => {
          this.sucursales.set(sucursales);
          this.variantes.set(variantes.filter((variante) => variante.activo));
          this.proveedores.set(proveedores.filter((proveedor) => proveedor.activo));
          this.movimientos.set(movimientos);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private cargarMovimientos(): void {
    this.cargando.set(true);
    this.error.set('');
    this.inventarioService
      .listarMovimientos({
        sucursal_id: this.filtroSucursalId(),
        tipo: this.tipoFiltro(),
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => this.movimientos.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo procesar inventario.';
  }
}
