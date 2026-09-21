import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import Chart from 'chart.js/auto';
import { finalize } from 'rxjs';
import { ReporteCatalogo, ReporteFiltros, ReporteResultado, TipoReporte } from '../../models/reporte.models';
import { ReportesService } from '../../services/reportes.service';

interface SpeechResult { results: ArrayLike<ArrayLike<{ transcript: string }>>; }
interface SpeechEngine {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechFactory = new () => SpeechEngine;

@Component({
  selector: 'app-reportes-page',
  templateUrl: './reportes.page.html',
  styleUrl: './reportes.page.css',
})
export class ReportesPage implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart?: Chart;
  private speech?: SpeechEngine;

  protected readonly catalogo = signal<ReporteCatalogo | null>(null);
  protected readonly modo = signal<'filtros' | 'voz'>('filtros');
  protected readonly soportaVoz = signal(false);
  protected readonly escuchando = signal(false);
  protected readonly textoVoz = signal('');
  protected readonly interpretado = signal(false);
  protected readonly filtros = signal<ReporteFiltros>({
    tipo: 'VENTAS',
    fecha_desde: this.fechaMes(),
    fecha_hasta: this.fechaHoy(),
    sucursal_id: null,
    agrupacion: 'DIA',
    solo_bajo_stock: false,
    estado: null,
    metodo_pago: null,
    proveedor_pago: null,
    tipo_entrega: null,
    rol: null,
    activo: null,
  });
  protected readonly resultado = signal<ReporteResultado | null>(null);
  private readonly filtrosResultado = signal<ReporteFiltros | null>(null);
  protected readonly cargando = signal(false);
  protected readonly descargando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly pagina = signal(1);
  private readonly tiposBase: { id: TipoReporte; nombre: string }[] = [
    { id: 'VENTAS', nombre: 'Ventas presenciales' },
    { id: 'PRODUCTOS_MAS_VENDIDOS', nombre: 'Productos más vendidos' },
    { id: 'INVENTARIO', nombre: 'Inventario por sucursal' },
    { id: 'RESERVAS', nombre: 'Reservas' },
    { id: 'MOVIMIENTOS', nombre: 'Movimientos de inventario' },
    { id: 'TRANSFERENCIAS', nombre: 'Transferencias de stock' },
    { id: 'PAGOS', nombre: 'Historial de pagos' },
    { id: 'DELIVERIES', nombre: 'Pedidos con delivery' },
    { id: 'USUARIOS', nombre: 'Usuarios registrados' },
  ];
  protected readonly filasPagina = computed(() => this.resultado()?.filas.slice((this.pagina() - 1) * 20, this.pagina() * 20) ?? []);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil((this.resultado()?.total_filas ?? 0) / 20)));
  protected readonly tiposCatalogo = computed(() => {
    const merged = new Map<TipoReporte, string>();
    for (const tipo of this.tiposBase) merged.set(tipo.id, tipo.nombre);
    for (const tipo of this.catalogo()?.tipos ?? []) merged.set(tipo.id, tipo.nombre || this.nombreTipo(tipo.id));
    return [...merged.entries()].map(([id, nombre]) => ({ id, nombre }));
  });

  ngOnInit(): void {
    const host = window as typeof window & { SpeechRecognition?: SpeechFactory; webkitSpeechRecognition?: SpeechFactory };
    this.soportaVoz.set(Boolean(host.SpeechRecognition || host.webkitSpeechRecognition));
    this.service.catalogo().subscribe({
      next: (items) => this.catalogo.set(items),
      error: (error: HttpErrorResponse) => this.error.set(this.mensajeError(error)),
    });
  }

  ngOnDestroy(): void { this.speech?.stop(); this.chart?.destroy(); }

  protected cambiarModo(modo: 'filtros' | 'voz'): void { this.modo.set(modo); this.error.set(''); }
  protected actualizarFiltro(campo: keyof ReporteFiltros, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const siguiente =
      campo === 'sucursal_id' ? (value ? Number(value) : null) :
      campo === 'activo' ? (value === '' ? null : value === 'true') :
      value || null;
    this.filtros.update((actual) => {
      const base = { ...actual, [campo]: siguiente } as ReporteFiltros;
      return campo === 'tipo'
        ? { ...base, estado: null, metodo_pago: null, proveedor_pago: null, tipo_entrega: null, rol: null, activo: null }
        : base;
    });
  }
  protected actualizarTexto(event: Event): void { this.textoVoz.set((event.target as HTMLTextAreaElement).value); this.interpretado.set(false); }
  protected cambiarBajoStock(event: Event): void { this.filtros.update((actual) => ({ ...actual, solo_bajo_stock: (event.target as HTMLInputElement).checked })); }

  protected dictar(): void {
    if (this.escuchando()) { this.speech?.stop(); return; }
    const host = window as typeof window & { SpeechRecognition?: SpeechFactory; webkitSpeechRecognition?: SpeechFactory };
    const Factory = host.SpeechRecognition || host.webkitSpeechRecognition;
    if (!Factory) { this.error.set('Tu navegador no admite dictado. Usa los filtros manuales.'); return; }
    this.speech = new Factory();
    this.speech.lang = 'es-BO';
    this.speech.interimResults = false;
    this.speech.onresult = (event) => { this.textoVoz.set(event.results[0]?.[0]?.transcript ?? ''); this.interpretado.set(false); };
    this.speech.onerror = () => this.error.set('No se pudo usar el micrófono. Revisa el permiso o usa los filtros.');
    this.speech.onend = () => this.escuchando.set(false);
    try { this.speech.start(); this.escuchando.set(true); this.error.set(''); }
    catch { this.error.set('No se pudo iniciar el dictado.'); }
  }

  protected interpretar(): void {
    if (this.textoVoz().trim().length < 3) { this.error.set('Dicta o escribe una consulta primero.'); return; }
    this.cargando.set(true); this.error.set(''); this.aviso.set('');
    this.service.interpretar(this.textoVoz()).pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (respuesta) => {
        if (!respuesta.interpretado || !respuesta.filtros) { this.error.set(respuesta.advertencias.join(' ')); return; }
        this.filtros.set(respuesta.filtros); this.interpretado.set(true);
        this.aviso.set('Consulta interpretada. Revisa los filtros y confirma para generar el reporte.');
      },
      error: (error: HttpErrorResponse) => this.error.set(this.mensajeError(error)),
    });
  }

  protected generar(): void {
    const f = this.filtros();
    if (!f.fecha_desde || !f.fecha_hasta || f.fecha_desde > f.fecha_hasta) { this.error.set('Revisa el rango de fechas.'); return; }
    this.cargando.set(true); this.error.set(''); this.aviso.set('');
    this.service.generar(f).pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (reporte) => { this.resultado.set(reporte); this.filtrosResultado.set({ ...f }); this.pagina.set(1); setTimeout(() => this.dibujarGrafico(reporte), 0); },
      error: (error: HttpErrorResponse) => this.error.set(this.mensajeError(error)),
    });
  }

  protected descargar(formato: 'pdf' | 'excel'): void {
    if (!this.resultado()) return;
    this.descargando.set(true); this.error.set('');
    const consulta = this.filtrosResultado();
    if (!consulta) { this.descargando.set(false); return; }
    this.service.exportar(consulta, formato).pipe(finalize(() => this.descargando.set(false))).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${consulta.tipo.toLowerCase()}_${consulta.fecha_desde}_${consulta.fecha_hasta}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        enlace.click(); URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => this.error.set(this.mensajeError(error)),
    });
  }

  protected cambiarPagina(delta: number): void { this.pagina.set(Math.min(this.totalPaginas(), Math.max(1, this.pagina() + delta))); }

  private dibujarGrafico(reporte: ReporteResultado): void {
    this.chart?.destroy();
    const canvas = this.chartCanvas()?.nativeElement;
    if (!canvas || reporte.serie_grafico.length === 0) return;
    const serie = reporte.serie_grafico.slice(0, 20);
    this.chart = new Chart(canvas, {
      type: reporte.tipo === 'PRODUCTOS_MAS_VENDIDOS' ? 'bar' : 'line',
      data: { labels: serie.map((item) => item.label), datasets: [{ label: reporte.titulo, data: serie.map((item) => item.valor), borderColor: '#829165', backgroundColor: 'rgba(130,145,101,.35)', fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, indexAxis: reporte.tipo === 'PRODUCTOS_MAS_VENDIDOS' ? 'y' : 'x' },
    });
  }

  private mensajeError(error: HttpErrorResponse): string { return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo procesar el reporte.'; }
  private fechaHoy(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  private fechaMes(): string { return `${this.fechaHoy().slice(0, 7)}-01`; }
  protected nombreTipo(tipo: TipoReporte): string { return this.tiposBase.find((item) => item.id === tipo)?.nombre ?? tipo; }
}
