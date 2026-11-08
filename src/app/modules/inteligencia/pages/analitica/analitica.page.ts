import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize, takeUntil } from 'rxjs';
import { AnaliticaService } from '../../services/analitica.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { mensajeApi } from '../../../../core/services/error-api';
import {
  EstadoAnalitica,
  FiltrosAnalitica,
  OrigenAnalitica,
  PrediccionesAnalitica,
  SegmentosAnalitica,
  SolicitudReporteAnalitica,
} from '../../models/analitica.models';
import { SerieAnaliticaComponent } from './serie-analitica.component';
import { SolicitudAnaliticaComponent } from './solicitud-analitica.component';

@Component({
  selector: 'app-analitica-page',
  imports: [ReactiveFormsModule, DecimalPipe, SerieAnaliticaComponent, SolicitudAnaliticaComponent],
  templateUrl: './analitica.page.html',
  styleUrl: './analitica.page.css',
})
export class AnaliticaPage {
  private readonly api = inject(AnaliticaService);
  private readonly contexto = inject(CambioContextoService);
  private readonly destroy = inject(DestroyRef);
  private peticion?: Subscription;
  private revision = 0;
  protected readonly estado = signal<EstadoAnalitica | null>(null);
  protected readonly origen = signal<OrigenAnalitica>('OFICIAL');
  protected readonly vista = signal('predicciones');
  protected readonly prediccion = signal<PrediccionesAnalitica | null>(null);
  protected readonly segmentacion = signal<SegmentosAnalitica | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly exportando = signal(false);
  protected readonly aviso = signal('');
  protected readonly bloqueado = signal(false);
  protected readonly productos = signal<string[]>([]);
  protected readonly fuente = computed(() =>
    this.estado()?.fuentes.find((f) => f.origen === this.origen()),
  );
  protected readonly resultado = computed(() =>
    this.vista() === 'predicciones' ? this.prediccion() : this.segmentacion(),
  );
  protected readonly aplicado = signal<FiltrosAnalitica>({ origen: 'OFICIAL' });
  protected readonly form = new FormGroup({
    origen: new FormControl<OrigenAnalitica>('OFICIAL', { nonNullable: true }),
    vista: new FormControl('predicciones', { nonNullable: true }),
    sucursal: new FormControl(0, { nonNullable: true }),
    producto: new FormControl('', { nonNullable: true }),
    desde: new FormControl('', { nonNullable: true }),
    hasta: new FormControl('', { nonNullable: true }),
    grupo: new FormControl(0, { nonNullable: true }),
  });
  constructor() {
    this.destroy.onDestroy(() => this.peticion?.unsubscribe());
    this.contexto.cambio$.pipe(takeUntilDestroyed()).subscribe(() => {
      ++this.revision;
      this.peticion?.unsubscribe();
      this.estado.set(null);
      this.limpiar();
      this.productos.set([]);
      this.form.reset(undefined, { emitEvent: false });
      this.origen.set('OFICIAL');
      this.vista.set('predicciones');
      this.bloqueado.set(true);
      this.cargando.set(false);
      this.exportando.set(false);
      this.aviso.set('');
      this.error.set('La sesión cambió. Vuelve a abrir Analítica inteligente.');
    });
    this.form.controls.origen.valueChanges.pipe(takeUntilDestroyed()).subscribe((o) => {
      this.origen.set(o);
      this.reiniciarFiltros();
      this.consultar();
    });
    this.form.controls.vista.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.vista.set(v);
      this.reiniciarFiltros();
      this.consultar();
    });
    this.cargarEstado();
  }
  private limpiar() {
    this.prediccion.set(null);
    this.segmentacion.set(null);
  }
  private reiniciarFiltros() {
    this.form.patchValue(
      { sucursal: 0, producto: '', desde: '', hasta: '', grupo: 0 },
      { emitEvent: false },
    );
    this.limpiar();
    this.productos.set([]);
  }
  protected cargarEstado() {
    if (this.bloqueado()) return;
    this.error.set('');
    this.cargando.set(true);
    this.api
      .estado()
      .pipe(takeUntil(this.contexto.cambio$), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (e) => {
          this.estado.set(e);
          this.consultar();
        },
        error: (e) => {
          this.error.set(mensajeApi(e));
          this.cargando.set(false);
        },
      });
  }
  protected consultar(pagina = 1, reutilizar = false) {
    if (this.bloqueado() || !this.estado()) return;
    if (this.vista() === 'segmentos' && !this.estado()?.segmentacion_permitida) return;
    const f = this.form.getRawValue();
    if (!reutilizar && f.desde && f.hasta && f.desde > f.hasta) {
      this.error.set('Revisa el rango de fechas de corte.');
      return;
    }
    let parametros: FiltrosAnalitica;
    if (reutilizar) parametros = { ...this.aplicado(), pagina };
    else {
      parametros = { origen: f.origen, pagina: 1, tamano: 25 };
      if (this.vista() === 'predicciones') {
        if (f.sucursal) parametros['sucursal_id'] = f.sucursal;
        if (f.producto) parametros['producto_id'] = f.producto;
        if (f.desde) parametros['corte_desde'] = f.desde;
        if (f.hasta) parametros['corte_hasta'] = f.hasta;
      } else if (f.grupo) parametros['grupo'] = f.grupo;
    }
    const revision = ++this.revision;
    this.peticion?.unsubscribe();
    if (!reutilizar) this.limpiar();
    this.cargando.set(true);
    this.error.set('');
    this.aplicado.set(parametros);
    const terminar = () => {
      if (revision === this.revision) this.cargando.set(false);
    };
    if (this.vista() === 'predicciones') {
      this.peticion = this.api
        .predicciones(parametros)
        .pipe(finalize(terminar))
        .subscribe({
          next: (r) => {
            if (revision === this.revision) {
              this.prediccion.set(r);
              this.productos.set(r.productos);
            }
          },
          error: (e) => {
            if (revision === this.revision) this.error.set(mensajeApi(e));
          },
        });
    } else {
      this.peticion = this.api
        .segmentos(parametros)
        .pipe(finalize(terminar))
        .subscribe({
          next: (r) => {
            if (revision === this.revision) this.segmentacion.set(r);
          },
          error: (e) => {
            if (revision === this.revision) this.error.set(mensajeApi(e));
          },
        });
    }
  }
  protected pagina(delta: number) {
    const r = this.resultado();
    if (r) this.consultar(r.pagina + delta, true);
  }
  protected aplicarSolicitud(s: SolicitudReporteAnalitica) {
    if (this.bloqueado() || (s.tipo === 'SEGMENTOS' && !this.estado()?.segmentacion_permitida))
      return;
    this.form.patchValue(
      {
        origen: s.origen,
        vista: s.tipo === 'PREDICCIONES' ? 'predicciones' : 'segmentos',
        sucursal: s.sucursal_id ?? 0,
        producto: s.producto_id ?? '',
        desde: s.corte_desde ?? '',
        hasta: s.corte_hasta ?? '',
        grupo: s.grupo ?? 0,
      },
      { emitEvent: false },
    );
    this.origen.set(s.origen);
    this.vista.set(s.tipo === 'PREDICCIONES' ? 'predicciones' : 'segmentos');
    this.consultar();
  }
  protected exportar(formato: 'pdf' | 'excel') {
    if (this.exportando() || this.cargando() || this.bloqueado() || !this.resultado()) return;
    const { pagina: _pagina, tamano: _tamano, ...filtros } = this.aplicado();
    const solicitud = {
      ...filtros,
      tipo: this.vista() === 'predicciones' ? 'PREDICCIONES' : 'SEGMENTOS',
    } as SolicitudReporteAnalitica;
    const revision = this.revision;
    this.exportando.set(true);
    this.aviso.set('');
    this.error.set('');
    this.api
      .exportar(solicitud, formato)
      .pipe(
        takeUntil(this.contexto.cambio$),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.exportando.set(false)),
      )
      .subscribe({
        next: (blob) => {
          if (revision !== this.revision || this.bloqueado()) return;
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `analitica_${solicitud.tipo.toLowerCase()}_${solicitud.origen.toLowerCase()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
          enlace.click();
          setTimeout(() => URL.revokeObjectURL(url), 0);
          this.aviso.set('Reporte del filtro completo descargado.');
        },
        error: (e) => {
          if (revision === this.revision)
            this.error.set(
              mensajeApi(e, 'No se pudo descargar el reporte. Revisa permisos y filtros.'),
            );
        },
      });
  }
  protected etiquetaEstado(estado: string) {
    return estado === 'HISTORIAL_INSUFICIENTE'
      ? 'Historial insuficiente'
      : estado === 'DISPONIBLE'
        ? 'Resultados disponibles'
        : 'Sin configuración de modelos';
  }
}
