import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CatalogoService } from '../../../administracion/services/catalogo.service';
import { ProductoService } from '../../../administracion/services/producto.service';
import { UsuarioAdminService } from '../../../autenticacion/services/usuario-admin.service';

interface DashboardCard {
  label: string;
  value: number;
  icon: string;
  note: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  styleUrl: './admin-dashboard.page.css',
  templateUrl: './admin-dashboard.page.html',
})
export class AdminDashboardPage implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly usuarioService = inject(UsuarioAdminService);

  protected readonly totalProductos = signal(0);
  protected readonly productosActivos = signal(0);
  protected readonly totalCategorias = signal(0);
  protected readonly totalUsuarios = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  protected readonly cards = computed<DashboardCard[]>(() => [
    {
      label: 'Productos',
      value: this.totalProductos(),
      icon: 'pi pi-shopping-bag',
      note: `${this.productosActivos()} activos en catalogo`,
    },
    {
      label: 'Categorias',
      value: this.totalCategorias(),
      icon: 'pi pi-tags',
      note: 'Organizacion visible de tienda',
    },
    {
      label: 'Usuarios',
      value: this.totalUsuarios(),
      icon: 'pi pi-users',
      note: 'Cuentas registradas en el sistema',
    },
    {
      label: 'Revision',
      value: this.productosInactivos(),
      icon: 'pi pi-eye',
      note: 'Productos inactivos o pendientes',
    },
  ]);

  protected readonly productosInactivos = computed(() =>
    Math.max(this.totalProductos() - this.productosActivos(), 0)
  );

  ngOnInit(): void {
    this.cargarResumen();
  }

  protected cargarResumen(): void {
    this.cargando.set(true);
    this.error.set('');

    let pendientes = 3;
    const terminar = () => {
      pendientes -= 1;
      if (pendientes === 0) {
        this.cargando.set(false);
      }
    };

    this.productoService
      .listarProductos()
      .pipe(finalize(terminar))
      .subscribe({
        next: (productos) => {
          this.totalProductos.set(productos.length);
          this.productosActivos.set(productos.filter((producto) => producto.activo).length);
        },
        error: (error: HttpErrorResponse) => this.registrarError(error),
      });

    this.catalogoService
      .listarCategorias()
      .pipe(finalize(terminar))
      .subscribe({
        next: (categorias) => this.totalCategorias.set(categorias.length),
        error: (error: HttpErrorResponse) => this.registrarError(error),
      });

    this.usuarioService
      .listarUsuarios()
      .pipe(finalize(terminar))
      .subscribe({
        next: (usuarios) => this.totalUsuarios.set(usuarios.length),
        error: (error: HttpErrorResponse) => this.registrarError(error),
      });
  }

  private registrarError(error: HttpErrorResponse): void {
    const detail = this.obtenerDetail(error.error);
    this.error.set(detail || 'No se pudo cargar todo el resumen del panel.');
  }

  private obtenerDetail(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'detail' in error &&
      typeof error.detail === 'string'
    ) {
      return error.detail;
    }

    return '';
  }
}
