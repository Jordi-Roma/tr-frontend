import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { CatalogoSucursal } from '../../../catalogo/models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { TransferenciaResponse } from '../../models/inventario.models';
import { VarianteResponse } from '../../../administracion/models/variante.models';
import { InventarioService } from '../../services/inventario.service';
import { VarianteService } from '../../../administracion/services/variante.service';

type TransferenciaCampo = 'sucursal_origen_id' | 'sucursal_destino_id' | 'producto_variante_id' | 'cantidad' | 'observacion';

@Component({
  selector: 'app-transferencias-stock-page',
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './transferencias-stock.page.css'],
  templateUrl: './transferencias-stock.page.html',
})
export class TransferenciasStockPage implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoPublicoService);
  private readonly varianteService = inject(VarianteService);

  protected readonly transferencias = signal<TransferenciaResponse[]>([]);
  protected readonly sucursales = signal<CatalogoSucursal[]>([]);
  protected readonly variantes = signal<VarianteResponse[]>([]);
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly form = signal({
    sucursal_origen_id: null as number | null,
    sucursal_destino_id: null as number | null,
    producto_variante_id: null as number | null,
    cantidad: 1,
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
    this.cargarTransferencias();
  }

  protected actualizarCampo(campo: TransferenciaCampo, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const parsedValue = campo === 'observacion' ? value : Number(value);
    this.form.update((actual) => ({ ...actual, [campo]: parsedValue }));
  }

  protected crearTransferencia(): void {
    const data = this.form();
    if (!data.sucursal_origen_id || !data.sucursal_destino_id || !data.producto_variante_id || data.cantidad <= 0) {
      this.error.set('Completa origen, destino, prenda y cantidad.');
      return;
    }
    if (data.sucursal_origen_id === data.sucursal_destino_id) {
      this.error.set('La sucursal origen y destino deben ser diferentes.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.inventarioService
      .crearTransferencia({
        sucursal_origen_id: data.sucursal_origen_id,
        sucursal_destino_id: data.sucursal_destino_id,
        observacion: data.observacion || null,
        items: [{ producto_variante_id: data.producto_variante_id, cantidad: data.cantidad }],
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.mensaje.set('Transferencia registrada y stock actualizado.');
          this.form.update((actual) => ({ ...actual, producto_variante_id: null, cantidad: 1, observacion: '' }));
          this.cargarTransferencias();
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
      transferencias: this.inventarioService.listarTransferencias(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ sucursales, variantes, transferencias }) => {
          this.sucursales.set(sucursales);
          this.variantes.set(variantes.filter((variante) => variante.activo));
          this.transferencias.set(transferencias);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private cargarTransferencias(): void {
    this.cargando.set(true);
    this.error.set('');
    this.inventarioService
      .listarTransferencias(this.filtroSucursalId())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => this.transferencias.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo procesar la transferencia.';
  }
}
