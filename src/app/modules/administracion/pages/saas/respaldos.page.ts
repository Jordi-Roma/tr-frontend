import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import { mensajeApi } from '../../../../core/services/error-api';
import { FocoService } from '../../../../core/services/foco.service';
import { Empresa, PreviaRespaldo, Respaldo } from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';

@Component({
  selector: 'app-saas-respaldos',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, KeyValuePipe],
  styleUrl: './saas.css',
  template: `
    <header class="encabezado">
      <div>
        <p class="ceja">Plataforma</p>
        <h1>Respaldos</h1>
        <p>Copias cifradas en almacenamiento privado, con operaciones auditadas.</p>
      </div>
      <button class="secundario" (click)="cargar()" [disabled]="ocupado()">Actualizar</button>
    </header>
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    @if (mensaje()) {
      <p role="status" class="exito">{{ mensaje() }}</p>
    }
    @if (ocupado()) {
      <p role="status">
        {{ proceso() || 'Procesando…' }} No cierres esta página hasta recibir el resultado.
      </p>
    }
    <section class="panel">
      <h2>Crear respaldo</h2>
      <form [formGroup]="form" (ngSubmit)="crear()">
        <label for="respaldo-empresa"
          >Alcance<select id="respaldo-empresa" formControlName="empresa_id">
            <option [ngValue]="null">Global: todas las empresas</option>
            @for (empresa of empresas(); track empresa.id) {
              <option [ngValue]="empresa.id">{{ empresa.nombre }} ({{ empresa.codigo }})</option>
            }
          </select></label
        >
        <p>
          La copia global incluye toda la base. La copia de empresa conserva sus registros y
          archivos locales referenciados.
        </p>
        <div class="acciones">
          <button [disabled]="ocupado()">Crear copia cifrada</button
          ><button type="button" class="secundario" (click)="purgar()" [disabled]="ocupado()">
            Eliminar copias vencidas
          </button>
        </div>
      </form>
    </section>
    <section class="panel tabla">
      <table>
        <caption>
          Últimos respaldos registrados
        </caption>
        <thead>
          <tr>
            <th scope="col">Copia</th>
            <th scope="col">Fecha y conservación</th>
            <th scope="col">Tamaño</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (r of copias(); track r.id) {
            <tr>
              <td>
                {{ r.tipo === 'GLOBAL' ? 'Global' : nombreEmpresa(r.empresa_id)
                }}<small class="codigo">{{ r.id }}</small
                ><small>{{ r.estado }}</small>
              </td>
              <td>
                {{ r.fecha | date: 'dd/MM/yyyy HH:mm' : '-0400'
                }}<small>Vence: {{ r.vence_en | date: 'dd/MM/yyyy HH:mm' : '-0400' }}</small>
              </td>
              <td>{{ r.bytes / 1024 | number: '1.0-1' }} KB</td>
              <td>
                <div class="acciones">
                  <button
                    class="secundario"
                    (click)="previsualizar(r)"
                    [disabled]="ocupado() || r.estado !== 'DISPONIBLE'"
                    [attr.aria-label]="'Previsualizar respaldo ' + r.id"
                  >
                    Previsualizar</button
                  ><button
                    class="peligro"
                    (click)="eliminar(r)"
                    [disabled]="ocupado() || r.estado !== 'DISPONIBLE'"
                    [attr.aria-label]="'Eliminar respaldo ' + r.id"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">No hay respaldos disponibles.</td>
            </tr>
          }
        </tbody>
      </table>
    </section>
    @if (previa(); as p) {
      <section class="panel" aria-labelledby="previa-title">
        <h2 id="previa-title" tabindex="-1">Revisar restauración</h2>
        <p class="codigo">Copia: {{ p.id }}</p>
        <p class="aviso">{{ p.destino }}</p>
        @if (p.tipo === 'GLOBAL') {
          <p>
            Esta acción restaura una copia global en un destino de ensayo vacío configurado por el
            operador. No reemplaza la base activa de producción.
          </p>
        } @else {
          <p>
            La empresa original debe estar suspendida. Sus registros se reemplazarán y sus sesiones
            se cerrarán. Las otras empresas se conservan.
          </p>
        }
        <p>Archivos incluidos: {{ p.archivos }}.</p>
        @if (p.conteos) {
          <div class="tabla">
            <table>
              <caption>
                Impacto por tabla
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tabla</th>
                  <th scope="col">En la copia</th>
                  <th scope="col">Actuales</th>
                </tr>
              </thead>
              <tbody>
                @for (fila of p.conteos | keyvalue; track fila.key) {
                  <tr>
                    <th scope="row">{{ fila.key }}</th>
                    <td>{{ fila.value }}</td>
                    <td>{{ p.conteos_actuales?.[fila.key] ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <form [formGroup]="restauracion" (ngSubmit)="restaurar()">
          <label for="confirmar-restauracion"
            >Confirmación explícita<input
              id="confirmar-restauracion"
              [formControl]="confirmacion"
              autocomplete="off"
              aria-describedby="frase-confirmacion"
          /></label>
          <p id="frase-confirmacion" class="codigo">
            Escribe exactamente: <strong>{{ p.confirmacion }}</strong>
          </p>
          <div class="acciones">
            <button class="peligro" [disabled]="ocupado() || confirmacion.value !== p.confirmacion">
              Restaurar copia revisada</button
            ><button
              type="button"
              class="secundario"
              (click)="cerrarPrevia()"
              [disabled]="ocupado()"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    }
  `,
})
export class RespaldosPage {
  private readonly api = inject(SaasService);
  private readonly foco = inject(FocoService);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly copias = signal<Respaldo[]>([]);
  protected readonly previa = signal<PreviaRespaldo | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly proceso = signal('');
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly form = new FormGroup({ empresa_id: new FormControl<number | null>(null) });
  protected readonly confirmacion = new FormControl('', { nonNullable: true });
  protected readonly restauracion = new FormGroup({ confirmacion: this.confirmacion });
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    this.ocupado.set(true);
    this.proceso.set('Consultando respaldos');
    forkJoin({ empresas: this.api.empresas(), copias: this.api.respaldos() })
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (r) => {
          this.empresas.set(r.empresas);
          this.copias.set(r.copias);
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  protected nombreEmpresa(id: number | null): string {
    return this.empresas().find((e) => e.id === id)?.nombre ?? `Empresa ${id ?? ''}`;
  }
  protected crear(): void {
    if (!this.ocupado())
      this.ejecutar(
        this.api.crearRespaldo(this.form.controls.empresa_id.value),
        'Creando respaldo cifrado',
        'Respaldo creado.',
      );
  }
  protected purgar(): void {
    if (
      !this.ocupado() &&
      globalThis.confirm('¿Eliminar las copias cuyo plazo de conservación ya venció?')
    )
      this.ejecutar(
        this.api.purgar(),
        'Aplicando conservación',
        'Se procesaron las copias vencidas.',
      );
  }
  protected eliminar(r: Respaldo): void {
    if (!this.ocupado() && globalThis.confirm(`¿Eliminar definitivamente la copia ${r.id}?`))
      this.ejecutar(this.api.eliminarRespaldo(r.id), 'Eliminando copia', 'Copia eliminada.');
  }
  protected previsualizar(r: Respaldo): void {
    if (this.ocupado()) return;
    this.cerrarPrevia();
    this.error.set('');
    this.ocupado.set(true);
    this.proceso.set('Verificando copia e impacto');
    this.api
      .previsualizar(r.id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (p) => {
          this.previa.set(p);
          this.foco.llevar('previa-title');
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  protected cerrarPrevia(): void {
    this.previa.set(null);
    this.confirmacion.reset();
  }
  protected restaurar(): void {
    const p = this.previa();
    if (!p || this.ocupado() || this.confirmacion.value !== p.confirmacion) return;
    this.ejecutar(
      this.api.restaurar(p.id, this.confirmacion.value),
      'Restaurando copia verificada',
      p.tipo === 'GLOBAL'
        ? 'Copia restaurada en el entorno de ensayo.'
        : 'Empresa restaurada; permanece suspendida para su revisión.',
    );
  }
  private ejecutar(operacion: Observable<unknown>, proceso: string, mensaje: string): void {
    this.ocupado.set(true);
    this.proceso.set(proceso);
    this.error.set('');
    this.mensaje.set('');
    operacion.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: () => {
        this.cerrarPrevia();
        this.mensaje.set(mensaje);
        this.cargar();
      },
      error: (e) =>
        this.error.set(
          mensajeApi(
            e,
            'No se pudo completar. Revisa también la configuración privada de respaldos.',
          ),
        ),
    });
  }
}
