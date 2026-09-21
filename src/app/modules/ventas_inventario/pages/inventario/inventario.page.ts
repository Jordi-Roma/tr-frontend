import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { CatalogoSucursal } from '../../../catalogo/models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { InventarioResponse } from '../../models/inventario.models';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-inventario-page',
  styleUrls: ['../../../administracion/pages/admin-crud.shared.css', './inventario.page.css'],
  templateUrl: './inventario.page.html',
})
export class InventarioPage implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoPublicoService);

  protected readonly inventario = signal<InventarioResponse[]>([]);
  protected readonly sucursales = signal<CatalogoSucursal[]>([]);
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly soloBajoStock = signal(false);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    this.cargarDatos();
  }

  protected cambiarSucursal(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sucursalId.set(value === '' ? null : Number(value));
    this.cargarInventario();
  }

  protected cambiarBajoStock(event: Event): void {
    this.soloBajoStock.set((event.target as HTMLInputElement).checked);
    this.cargarInventario();
  }

  protected actualizarMinimo(item: InventarioResponse, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 0) return;
    this.inventarioService.actualizarStockMinimo(item.id, value).subscribe({
      next: (actualizado) => {
        this.inventario.update((items) => items.map((row) => (row.id === actualizado.id ? actualizado : row)));
        this.mensaje.set('Stock mínimo actualizado.');
      },
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  private cargarDatos(): void {
    this.cargando.set(true);
    forkJoin({
      filtros: this.catalogoService.obtenerFiltros(),
      inventario: this.inventarioService.listarInventario(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ filtros, inventario }) => {
          this.sucursales.set(filtros.sucursales);
          this.inventario.set(inventario);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private cargarInventario(): void {
    this.cargando.set(true);
    this.error.set('');
    this.inventarioService
      .listarInventario({
        sucursal_id: this.sucursalId(),
        solo_bajo_stock: this.soloBajoStock(),
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => this.inventario.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo cargar inventario.';
  }
}
