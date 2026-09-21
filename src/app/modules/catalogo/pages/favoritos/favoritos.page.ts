import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiendaStateService, TiendaProductoItem } from '../../../../core/services/tienda-state.service';
import { RecomendacionesService } from '../../../inteligencia/services/recomendaciones.service';

@Component({
  imports: [RouterLink],
  selector: 'app-favoritos-page',
  styleUrl: './favoritos.page.css',
  templateUrl: './favoritos.page.html',
})
export class FavoritosPage {
  private readonly tiendaState = inject(TiendaStateService);
  private readonly recomendacionesService = inject(RecomendacionesService);

  protected readonly favoritos = this.tiendaState.favoritos;

  protected agregarAlCarrito(item: TiendaProductoItem): void {
    this.tiendaState.agregarAlCarrito(item);
  }

  protected quitarFavorito(item: TiendaProductoItem): void {
    this.recomendacionesService.quitarFavorito(item.id).subscribe({
      next: (items) => this.tiendaState.reemplazarFavoritos(items.map((prenda) => ({
        id: prenda.producto_id, nombre: prenda.nombre, categoria: prenda.categoria,
        precio: Number(prenda.precio_final ?? prenda.precio_vigente ?? 0),
      }))),
    });
  }

  protected formatPrecio(precio: number): string {
    return precio > 0 ? `Bs ${precio.toFixed(2)}` : 'Precio pendiente';
  }
}
