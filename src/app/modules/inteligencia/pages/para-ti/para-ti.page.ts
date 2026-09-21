import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CatalogoPrendaItem } from '../../../catalogo/models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { CatalogoOpcion } from '../../../catalogo/models/catalogo-publico.models';
import { PreferenciasIA, RecomendacionPrenda, RecomendacionesService } from '../../../inteligencia/services/recomendaciones.service';

@Component({
  selector: 'app-para-ti-page',
  imports: [RouterLink],
  templateUrl: './para-ti.page.html',
  styleUrl: './para-ti.page.css',
})
export class ParaTiPage implements OnInit {
  private readonly recomendaciones = inject(RecomendacionesService);
  private readonly catalogo = inject(CatalogoPublicoService);
  protected readonly items = signal<RecomendacionPrenda[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly categorias = signal<CatalogoOpcion[]>([]);
  protected readonly preferencias = signal<PreferenciasIA>({ categorias: [], usar_historial: true });
  protected readonly guardando = signal(false);
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    forkJoin({ filtros: this.catalogo.obtenerFiltros(), preferencias: this.recomendaciones.leerPreferencias() })
      .subscribe({
        next: ({ filtros, preferencias }) => {
          this.categorias.set(filtros.categorias);
          this.preferencias.set(preferencias);
        },
      });
    this.cargar();
  }

  protected alternarCategoria(id: number): void {
    this.preferencias.update((actual) => ({ ...actual,
      categorias: actual.categorias.includes(id)
        ? actual.categorias.filter((valor) => valor !== id)
        : [...actual.categorias, id],
    }));
  }

  protected alternarHistorial(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.preferencias.update((actual) => ({ ...actual, usar_historial: checked }));
  }

  protected guardarGustos(): void {
    this.guardando.set(true);
    this.recomendaciones.guardarPreferencias(this.preferencias())
      .pipe(finalize(() => this.guardando.set(false))).subscribe({
        next: (preferencias) => {
          this.preferencias.set(preferencias);
          this.mensaje.set('Preferencias guardadas.');
          this.cargar();
        },
        error: () => this.mensaje.set('No se pudieron guardar las preferencias.'),
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.recomendaciones.paraMi().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (items) => this.items.set(items),
      error: () => this.error.set('No se pudieron cargar tus recomendaciones.'),
    });
  }

  protected precio(item: CatalogoPrendaItem): string {
    const valor = Number(item.precio_final ?? item.precio_vigente ?? 0);
    return valor > 0 ? `Bs ${valor.toFixed(2)}` : 'Precio pendiente';
  }
}
