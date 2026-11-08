import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize, takeUntil } from 'rxjs';
import { AnaliticaService } from '../../services/analitica.service';
import {
  InterpretacionAnalitica,
  OrigenAnalitica,
  SolicitudReporteAnalitica,
} from '../../models/analitica.models';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { mensajeApi } from '../../../../core/services/error-api';

interface MotorVoz {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
@Component({
  selector: 'app-solicitud-analitica',
  imports: [ReactiveFormsModule],
  template: `<section class="panel" aria-label="Solicitar reporte de analítica">
    <h2>Solicitar reporte por texto o voz</h2>
    <p>
      Ejemplo: «Muéstrame la evaluación de predicciones de mi sucursal con datos sintéticos en PDF».
    </p>
    <label
      >Solicitud de analítica<textarea [formControl]="texto" rows="3" maxlength="1200"></textarea>
    </label>
    <div class="acciones">
      <button type="button" (click)="dictar()" [disabled]="bloqueado()">
        {{ escuchando() ? 'Detener dictado' : 'Dictar solicitud' }}
      </button>
      <button
        type="button"
        (click)="interpretar()"
        [disabled]="ocupado() || bloqueado() || texto.value.trim().length < 3"
      >
        Revisar solicitud
      </button>
    </div>
    @if (ocupado()) {
      <p role="status">Interpretando la solicitud…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (preview(); as p) {
      <section aria-label="Vista previa de la solicitud">
        <h3>Vista previa · Interpretación local por reglas</h3>
        <p>{{ p.mensaje }}</p>
        @if (p.solicitud; as s) {
          <p>
            Análisis:
            {{
              s.tipo === 'PREDICCIONES'
                ? 'Evaluación histórica de predicciones'
                : 'Segmentación de clientes'
            }}
            · Origen:
            {{ s.origen === 'DEMOSTRACION' ? 'Demostración sintética' : 'Historial oficial' }}.
          </p>
          <p>
            Sucursal: {{ s.sucursal_id ?? 'Todas las autorizadas' }} · Producto:
            {{ s.producto_id ?? 'Todos' }} · Grupo: {{ s.grupo ?? 'Todos' }}.
          </p>
          <p>
            Fechas de corte: {{ s.corte_desde ?? 'Sin límite inicial' }} a
            {{ s.corte_hasta ?? 'Sin límite final' }} · Formato sugerido: {{ p.formato_sugerido }}.
          </p>
          <button type="button" (click)="aplicar.emit(s)" [disabled]="bloqueado()">
            Aplicar solicitud revisada
          </button>
          <p>Se mostrarán los resultados; la descarga se elige después con PDF o Excel.</p>
        }
      </section>
    }
  </section>`,
  styles: `
    .panel {
      background: #fff;
      border: 1px solid #b6bdad;
      border-radius: 14px;
      padding: 1.2rem;
      margin: 1rem 0;
    }
    label {
      display: grid;
      gap: 0.5rem;
      font-weight: 600;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      border: 1px solid #78836c;
      border-radius: 8px;
      padding: 0.7rem;
    }
    .acciones {
      display: flex;
      gap: 0.7rem;
      flex-wrap: wrap;
      margin-top: 0.8rem;
    }
    button {
      min-height: 44px;
      padding: 0.7rem 1rem;
      border: 1px solid #344c2b;
      border-radius: 8px;
      background: #344c2b;
      color: #fff;
      font: inherit;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    :focus-visible {
      outline: 3px solid #245a81;
      outline-offset: 3px;
    }
    p {
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    [role='alert'] {
      color: #84251e;
    }
  `,
})
export class SolicitudAnaliticaComponent {
  readonly origen = input.required<OrigenAnalitica>();
  readonly bloqueado = input(false);
  readonly aplicar = output<SolicitudReporteAnalitica>();
  private readonly api = inject(AnaliticaService);
  private readonly contexto = inject(CambioContextoService);
  private readonly destroy = inject(DestroyRef);
  private peticion?: Subscription;
  private motor?: MotorVoz;
  private revision = 0;
  private entrada: 'TEXTO' | 'VOZ' = 'TEXTO';
  protected readonly texto = new FormControl('', { nonNullable: true });
  protected readonly preview = signal<InterpretacionAnalitica | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly escuchando = signal(false);
  protected readonly error = signal('');
  constructor() {
    this.destroy.onDestroy(() => {
      this.peticion?.unsubscribe();
      this.motor?.stop();
    });
    this.texto.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      ++this.revision;
      this.peticion?.unsubscribe();
      this.preview.set(null);
      this.ocupado.set(false);
      this.entrada = 'TEXTO';
    });
    effect(() => {
      this.origen();
      this.bloqueado();
      this.invalidar();
    });
    this.contexto.cambio$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.invalidar();
      this.texto.setValue('');
    });
  }
  private invalidar() {
    ++this.revision;
    this.peticion?.unsubscribe();
    this.preview.set(null);
    this.ocupado.set(false);
    this.motor?.stop();
    this.escuchando.set(false);
    this.error.set('');
  }
  protected interpretar() {
    if (this.bloqueado() || this.ocupado()) return;
    const revision = ++this.revision;
    this.preview.set(null);
    this.error.set('');
    this.ocupado.set(true);
    this.peticion = this.api
      .interpretar(this.texto.value, this.origen(), this.entrada)
      .pipe(
        takeUntil(this.contexto.cambio$),
        finalize(() => {
          if (revision === this.revision) this.ocupado.set(false);
        }),
      )
      .subscribe({
        next: (p) => {
          if (revision === this.revision) this.preview.set(p);
        },
        error: (e) => {
          if (revision === this.revision) this.error.set(mensajeApi(e));
        },
      });
  }
  protected dictar() {
    if (this.escuchando()) {
      this.motor?.stop();
      return;
    }
    const host = window as typeof window & {
      SpeechRecognition?: new () => MotorVoz;
      webkitSpeechRecognition?: new () => MotorVoz;
    };
    const Fabrica = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!Fabrica) {
      this.error.set('Este navegador no admite dictado. Escribe la solicitud.');
      return;
    }
    const generacion = this.contexto.generacion();
    this.invalidar();
    const revisionVoz = this.revision;
    this.motor = new Fabrica();
    this.motor.lang = 'es-BO';
    this.motor.interimResults = false;
    this.motor.onresult = (e) => {
      if (
        this.destroy.destroyed ||
        revisionVoz !== this.revision ||
        generacion !== this.contexto.generacion() ||
        this.bloqueado()
      )
        return;
      this.texto.setValue(e.results[0]?.[0]?.transcript ?? '');
      this.entrada = 'VOZ';
      this.escuchando.set(false);
    };
    this.motor.onerror = () => {
      if (
        !this.destroy.destroyed &&
        revisionVoz === this.revision &&
        generacion === this.contexto.generacion()
      ) {
        this.error.set('No se pudo usar el micrófono. Revisa el permiso o escribe la solicitud.');
        this.escuchando.set(false);
      }
    };
    this.motor.onend = () => {
      if (!this.destroy.destroyed && revisionVoz === this.revision) this.escuchando.set(false);
    };
    try {
      this.motor.start();
      this.escuchando.set(true);
    } catch {
      this.error.set('No se pudo iniciar el dictado.');
    }
  }
}
