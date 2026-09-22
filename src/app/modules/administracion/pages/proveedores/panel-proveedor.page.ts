import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import {
  ProveedorEntregaPanel,
  ProveedorPerfil,
  ProveedorProductoPanel,
  ProveedorStockPanel,
} from '../../models/proveedor.models';
import { ProveedorService } from '../../services/proveedor.service';

type TabProveedor = 'perfil' | 'productos' | 'stock' | 'entregas';

@Component({
  selector: 'app-panel-proveedor-page',
  styleUrl: './panel-proveedor.page.css',
  templateUrl: './panel-proveedor.page.html',
})
export class PanelProveedorPage implements OnInit {
  private readonly proveedorService = inject(ProveedorService);

  protected readonly perfil = signal<ProveedorPerfil | null>(null);
  protected readonly productos = signal<ProveedorProductoPanel[]>([]);
  protected readonly stock = signal<ProveedorStockPanel[]>([]);
  protected readonly entregas = signal<ProveedorEntregaPanel[]>([]);
  protected readonly tab = signal<TabProveedor>('perfil');
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  protected readonly productosActivos = computed(() => this.productos().filter((producto) => producto.activo).length);
  protected readonly stockTotal = computed(() => this.stock().reduce((total, item) => total + item.stock_real, 0));
  protected readonly bajoStock = computed(() => this.stock().filter((item) => item.bajo_stock).length);

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarTab(tab: TabProveedor): void {
    this.tab.set(tab);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      perfil: this.proveedorService.obtenerPerfilPanel(),
      productos: this.proveedorService.listarProductosPanel(),
      stock: this.proveedorService.listarStockPanel(),
      entregas: this.proveedorService.listarEntregasPanel(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ perfil, productos, stock, entregas }) => {
          this.perfil.set(perfil);
          this.productos.set(productos);
          this.stock.set(stock);
          this.entregas.set(entregas);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected formatPrecio(value: number | string | null | undefined): string {
    const number = Number(value ?? 0);
    return `Bs ${Number.isFinite(number) ? number.toFixed(2) : '0.00'}`;
  }

  protected formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-BO');
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string'
      ? error.error.detail
      : 'No se pudo cargar el panel proveedor.';
  }
}
