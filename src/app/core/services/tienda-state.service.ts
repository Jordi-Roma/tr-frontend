import { Injectable, signal } from '@angular/core';

export interface TiendaProductoItem {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
}

export interface CarritoItem extends TiendaProductoItem {
  cantidad: number;
}

const CART_STORAGE_KEY = 'stylear_cart';
const CART_BRANCH_STORAGE_KEY = 'stylear_cart_branch';

interface BackendCarritoItemLike {
  producto_id: number;
  producto: string;
  categoria: string;
  precio_unitario: number | string;
  cantidad: number;
}

@Injectable({
  providedIn: 'root',
})
export class TiendaStateService {
  private readonly carritoSignal = signal<CarritoItem[]>(this.leerCarrito());
  private readonly sucursalCarritoSignal = signal<number | null>(this.leerSucursalCarrito());
  private readonly favoritosSignal = signal<TiendaProductoItem[]>([]);

  readonly carrito = this.carritoSignal.asReadonly();
  readonly sucursalCarrito = this.sucursalCarritoSignal.asReadonly();
  readonly favoritos = this.favoritosSignal.asReadonly();

  agregarAlCarrito(producto: TiendaProductoItem): void {
    this.carritoSignal.update((items) => {
      const existente = items.find((item) => item.id === producto.id);

      if (existente === undefined) {
        return this.persistirCarrito([...items, { ...producto, cantidad: 1 }]);
      }

      return this.persistirCarrito(
        items.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    });
  }

  cambiarCantidad(productoId: number, cantidad: number): void {
    const cantidadNormalizada = Math.max(1, cantidad);

    this.carritoSignal.update((items) =>
      this.persistirCarrito(
        items.map((item) =>
          item.id === productoId ? { ...item, cantidad: cantidadNormalizada } : item
        )
      )
    );
  }

  quitarDelCarrito(productoId: number): void {
    this.carritoSignal.update((items) =>
      this.persistirCarrito(items.filter((item) => item.id !== productoId))
    );
  }

  vaciarCarrito(): void {
    this.carritoSignal.set(this.persistirCarrito([]));
  }

  reemplazarCarritoDesdeBackend(items: BackendCarritoItemLike[]): void {
    const carrito = items.map((item) => ({
      id: item.producto_id,
      nombre: item.producto,
      categoria: item.categoria,
      precio: this.toNumber(item.precio_unitario),
      cantidad: item.cantidad,
    }));

    this.carritoSignal.set(this.persistirCarrito(carrito));
  }

  seleccionarSucursalCarrito(sucursalId: number | null): void {
    this.sucursalCarritoSignal.set(sucursalId);

    if (sucursalId === null) {
      localStorage.removeItem(CART_BRANCH_STORAGE_KEY);
      return;
    }

    localStorage.setItem(CART_BRANCH_STORAGE_KEY, String(sucursalId));
  }

  alternarFavorito(producto: TiendaProductoItem): void {
    this.favoritosSignal.update((items) => {
      const existe = items.some((item) => item.id === producto.id);
      const next = existe
        ? items.filter((item) => item.id !== producto.id)
        : [...items, producto];

      return next;
    });
  }

  reemplazarFavoritos(items: TiendaProductoItem[]): void {
    this.favoritosSignal.set(items);
  }

  esFavorito(productoId: number): boolean {
    return this.favoritosSignal().some((item) => item.id === productoId);
  }

  private leerCarrito(): CarritoItem[] {
    return this.leerStorage<CarritoItem[]>(CART_STORAGE_KEY, []);
  }

  private leerSucursalCarrito(): number | null {
    const value = localStorage.getItem(CART_BRANCH_STORAGE_KEY);
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }


  private leerStorage<T>(key: string, fallback: T): T {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }

  private persistirCarrito(items: CarritoItem[]): CarritoItem[] {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    return items;
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

}
