import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { OperacionNuevaDirective } from '../../../../core/directives/operacion-nueva.directive';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CatalogoPrendaItem } from '../../../catalogo/models/catalogo-publico.models';
import { CatalogoPublicoService } from '../../../catalogo/services/catalogo-publico.service';
import { CatalogoOpcion } from '../../../catalogo/models/catalogo-publico.models';
import {
  PreferenciasIA,
  RecomendacionPrenda,
  RecomendacionesService,
} from '../../../inteligencia/services/recomendaciones.service';

@Component({
  selector: 'app-para-ti-page',
  imports: [OperacionNuevaDirective, RouterLink],
  templateUrl: './para-ti.page.html',
  styleUrl: './para-ti.page.css',
})
export class ParaTiPage implements OnInit {
  private readonly destroy = inject(DestroyRef);
  protected readonly listo = signal(false);
  constructor() {
    inject(CambioContextoService)
      .cambio$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.items.set([]);
        this.preferencias.set({ categorias: [], usar_historial: true });
        this.categorias.set([]);
        this.listo.set(false);
        this.mensaje.set('');
      });
  }
  private readonly recomendaciones = inject(RecomendacionesService);
  private readonly catalogo = inject(CatalogoPublicoService);
  protected readonly items = signal<RecomendacionPrenda[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly categorias = signal<CatalogoOpcion[]>([]);
  protected readonly preferencias = signal<PreferenciasIA>({
    categorias: [],
    usar_historial: true,
  });
  protected readonly guardando = signal(false);
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    forkJoin({
      filtros: this.catalogo.obtenerFiltros(),
      preferencias: this.recomendaciones.leerPreferencias(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ filtros, preferencias }) => {
          this.listo.set(true);
          this.categorias.set(filtros.categorias);
          this.preferencias.set(preferencias);
        },
        error: () =>
          this.mensaje.set(
            'No se pudieron cargar las preferencias. Vuelve a entrar para reintentar.',
          ),
      });
    this.cargar();
  }

  protected alternarCategoria(id: number): void {
    if (
      !this.preferencias().categorias.includes(id) &&
      this.preferencias().categorias.length >= 10
    ) {
      this.mensaje.set('Selecciona como máximo 10 categorías.');
      return;
    }
    this.preferencias.update((actual) => ({
      ...actual,
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
    if (this.guardando() || !this.listo()) return;
    this.guardando.set(true);
    this.recomendaciones
      .guardarPreferencias(this.preferencias())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (preferencias) => {
          this.preferencias.set(preferencias);
          this.mensaje.set('Preferencias guardadas.');
          this.cargar();
        },
        error: () => this.mensaje.set('No se pudieron guardar las preferencias.'),
      });
  }

  protected cargar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.recomendaciones
      .paraMi()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.error.set('No se pudieron cargar tus recomendaciones.'),
      });
  }

  protected precio(item: CatalogoPrendaItem): string {
    const raw = item.precio_final ?? item.precio_vigente;
    if (raw == null) return 'Precio pendiente';
    const valor = Number(raw);
    return Number.isFinite(valor) ? `Bs ${valor.toFixed(2)}` : 'Precio pendiente';
  }
}
