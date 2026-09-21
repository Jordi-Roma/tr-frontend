import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { TiendaProductoItem, TiendaStateService } from '../../../../core/services/tienda-state.service';
import { AuthService } from '../../../autenticacion/services/auth.service';
import {
  CatalogoPrendaItem,
  CatalogoOpcion,
  CatalogoSucursal,
  CatalogoColor,
} from '../../models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { RecomendacionesService } from '../../../inteligencia/services/recomendaciones.service';

type OrdenCatalogo = 'relevancia' | 'nombre' | 'precio-asc' | 'precio-desc';

@Component({
  imports: [RouterLink],
  selector: 'app-catalogo-page',
  styleUrl: './catalogo.page.css',
  templateUrl: './catalogo.page.html',
})
export class CatalogoPage implements OnInit {
  private readonly catalogoService = inject(CatalogoPublicoService);
  private readonly tiendaState = inject(TiendaStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recomendacionesService = inject(RecomendacionesService);
  private readonly authService = inject(AuthService);

  protected readonly productos = signal<CatalogoPrendaItem[]>([]);
  protected readonly categorias = signal<CatalogoOpcion[]>([]);
  protected readonly tallas = signal<CatalogoOpcion[]>([]);
  protected readonly colores = signal<CatalogoColor[]>([]);
  protected readonly temporadas = signal<CatalogoOpcion[]>([]);
  protected readonly colecciones = signal<CatalogoOpcion[]>([]);
  protected readonly sucursales = signal<CatalogoSucursal[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly busqueda = signal('');
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly tallaId = signal<number | null>(null);
  protected readonly colorId = signal<number | null>(null);
  protected readonly temporadaId = signal<number | null>(null);
  protected readonly coleccionId = signal<number | null>(null);
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly precioMin = signal<number | null>(null);
  protected readonly precioMax = signal<number | null>(null);
  protected readonly soloDisponibles = signal(false);
  protected readonly orden = signal<OrdenCatalogo>('relevancia');
  protected readonly favoritos = this.tiendaState.favoritos;

  ngOnInit(): void {
    const categoriaRuta = this.route.snapshot.data['categoria'];
    const busquedaRuta =
      typeof categoriaRuta === 'string' && categoriaRuta.trim() !== ''
        ? categoriaRuta
        : '';

    this.route.queryParamMap.subscribe((params) => {
      this.busqueda.set(params.get('q')?.trim() || busquedaRuta);
      this.cargarCatalogo();
    });
  }

  protected seleccionarCategoria(id: number | null): void {
    this.categoriaId.set(id);
    this.cargarCatalogo();
  }

  protected actualizarTalla(event: Event): void {
    this.tallaId.set(this.toNullableNumber((event.target as HTMLSelectElement).value));
    this.cargarCatalogo();
  }

  protected actualizarColor(event: Event): void {
    this.colorId.set(this.toNullableNumber((event.target as HTMLSelectElement).value));
    this.cargarCatalogo();
  }

  protected actualizarSucursal(event: Event): void {
    this.sucursalId.set(this.toNullableNumber((event.target as HTMLSelectElement).value));
    this.cargarCatalogo();
  }

  protected actualizarTemporada(event: Event): void {
    this.temporadaId.set(this.toNullableNumber((event.target as HTMLSelectElement).value));
    this.cargarCatalogo();
  }

  protected actualizarColeccion(event: Event): void {
    this.coleccionId.set(this.toNullableNumber((event.target as HTMLSelectElement).value));
    this.cargarCatalogo();
  }

  protected actualizarPrecioMin(event: Event): void {
    this.precioMin.set(this.toNullableNumber((event.target as HTMLInputElement).value));
  }

  protected actualizarPrecioMax(event: Event): void {
    this.precioMax.set(this.toNullableNumber((event.target as HTMLInputElement).value));
  }

  protected aplicarRangoPrecio(): void {
    this.cargarCatalogo();
  }

  protected alternarSoloDisponibles(event: Event): void {
    this.soloDisponibles.set((event.target as HTMLInputElement).checked);
    this.cargarCatalogo();
  }

  protected actualizarOrden(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.orden.set(select.value as OrdenCatalogo);
    this.cargarCatalogo();
  }

  protected limpiarFiltros(): void {
    this.categoriaId.set(null);
    this.tallaId.set(null);
    this.colorId.set(null);
    this.temporadaId.set(null);
    this.coleccionId.set(null);
    this.sucursalId.set(null);
    this.precioMin.set(null);
    this.precioMax.set(null);
    this.soloDisponibles.set(false);
    this.orden.set('relevancia');
    this.cargarCatalogo();
  }

  protected agregarAlCarrito(item: CatalogoPrendaItem): void {
    void this.router.navigate(['/producto', item.producto_id]);
  }

  protected alternarFavorito(item: CatalogoPrendaItem): void {
    if (!this.authService.estaAutenticado()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const llamada = this.tiendaState.esFavorito(item.producto_id)
      ? this.recomendacionesService.quitarFavorito(item.producto_id)
      : this.recomendacionesService.guardarFavorito(item.producto_id);
    llamada.subscribe({
      next: (items) => this.tiendaState.reemplazarFavoritos(items.map((prenda) => this.toTiendaItem(prenda))),
      error: () => this.error.set('No se pudo actualizar el favorito.'),
    });
  }

  protected esFavorito(productoId: number): boolean {
    return this.tiendaState.esFavorito(productoId);
  }

  protected formatPrecio(precio: number | string | null | undefined): string {
    const value = this.toNumber(precio);
    return value > 0 ? `Bs ${value.toFixed(2)}` : 'Precio pendiente';
  }

  protected inicialesCategoria(item: CatalogoPrendaItem): string {
    return (item.categoria || 'ST').slice(0, 2).toUpperCase();
  }

  private cargarCatalogo(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      catalogo: this.catalogoService.listarPrendas({
        q: this.busqueda().trim() || undefined,
        categoria_id: this.categoriaId(),
        talla_id: this.tallaId(),
        color_id: this.colorId(),
        temporada_id: this.temporadaId(),
        coleccion_id: this.coleccionId(),
        sucursal_id: this.sucursalId(),
        precio_min: this.precioMin(),
        precio_max: this.precioMax(),
        orden: this.orden(),
        solo_disponibles: this.soloDisponibles(),
        por_pagina: 60,
      }),
      filtros: this.catalogoService.obtenerFiltros(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ catalogo, filtros }) => {
          this.productos.set(catalogo.items);
          this.total.set(catalogo.total);
          this.categorias.set(filtros.categorias);
          this.tallas.set(filtros.tallas);
          this.colores.set(filtros.colores);
          this.temporadas.set(filtros.temporadas);
          this.colecciones.set(filtros.colecciones);
          this.sucursales.set(filtros.sucursales);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  private toTiendaItem(item: CatalogoPrendaItem): TiendaProductoItem {
    return {
      id: item.producto_id,
      nombre: item.nombre,
      categoria: item.categoria,
      precio: this.toNumber(item.precio_final ?? item.precio_vigente),
    };
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNullableNumber(value: string): number | null {
    if (value.trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;

      if (typeof detail === 'string') {
        return detail;
      }
    }

    return 'No se pudo cargar el catalogo. Verifica que el backend este levantado y que la migracion de inventario este aplicada.';
  }
}
