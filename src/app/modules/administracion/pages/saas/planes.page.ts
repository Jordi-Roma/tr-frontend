import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { mensajeApi } from '../../../../core/services/error-api';
import { FocoService } from '../../../../core/services/foco.service';
import { CUOTAS, FUNCIONES, Funciones, Limites, Plan } from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';

const cupo = () =>
  new FormControl<number | null>(null, [Validators.min(0), Validators.pattern(/^\d+$/)]);
const funcion = () => new FormControl<boolean | null>(null);
@Component({
  selector: 'app-saas-planes',
  imports: [ReactiveFormsModule],
  styleUrl: './saas.css',
  template: `
    <header class="encabezado">
      <div>
        <p class="ceja">Plataforma</p>
        <h1>Planes</h1>
        <p>Configura cuotas y funciones sin fijar precios comerciales.</p>
      </div>
      <button class="secundario" (click)="cargar()" [disabled]="ocupado()">Actualizar</button>
    </header>
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    @if (mensaje()) {
      <p role="status" class="exito">{{ mensaje() }}</p>
    }
    @if (cargando()) {
      <p role="status">Cargando planes…</p>
    }
    <section class="panel tabla">
      <table>
        <caption>
          Planes de la plataforma
        </caption>
        <thead>
          <tr>
            <th scope="col">Plan</th>
            <th scope="col">Estado</th>
            <th scope="col">Cuotas</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (plan of planes(); track plan.id) {
            <tr>
              <td>
                <strong>{{ plan.nombre }}</strong
                ><small>{{ plan.codigo }}</small>
              </td>
              <td>
                {{ plan.activo ? 'Activo' : 'Inactivo'
                }}<small>{{ plan.publico ? 'Disponible para registro' : 'Privado' }}</small>
              </td>
              <td>
                @for (clave of cuotas; track clave) {
                  <small>{{ etiquetas[clave] }}: {{ plan.limites[clave] ?? 'Sin límite' }}</small>
                }
              </td>
              <td>
                <button
                  class="secundario"
                  (click)="editar(plan)"
                  [disabled]="ocupado()"
                  [attr.aria-label]="'Editar plan ' + plan.nombre"
                >
                  Editar
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">No hay planes disponibles.</td>
            </tr>
          }
        </tbody>
      </table>
    </section>
    <section class="panel" aria-labelledby="plan-title">
      <h2 id="plan-title">{{ editando() ? 'Editar plan' : 'Crear plan' }}</h2>
      @if (editando()) {
        <p class="aviso">
          Los cambios afectan a todas las empresas suscritas a este plan. Desactivarlo bloquea sus
          operaciones nuevas.
        </p>
      }
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div class="grid">
          <label for="plan-codigo"
            >Código<input
              id="plan-codigo"
              formControlName="codigo"
              required
              [readOnly]="legado()"
              maxlength="50"
            /><small>De 2 a 50 letras mayúsculas, números o guion bajo.</small></label
          ><label for="plan-nombre"
            >Nombre<input
              id="plan-nombre"
              formControlName="nombre"
              required
              maxlength="120" /></label
          ><label class="check" for="plan-activo"
            ><input id="plan-activo" type="checkbox" formControlName="activo" />Plan activo</label
          >
          <label class="check" for="plan-publico"
            ><input id="plan-publico" type="checkbox" formControlName="publico" />Disponible en el
            registro de empresas</label
          >
        </div>
        <fieldset>
          <legend>Cuotas de registros activos</legend>
          <p>
            Dejar vacío significa sin límite. Cero impide nuevas altas de ese tipo. Las cuentas
            incluyen clientes y personal.
          </p>
          <div class="grid">
            @for (clave of cuotas; track clave) {
              <label [for]="'cupo-' + clave"
                >{{ etiquetas[clave]
                }}<input
                  [id]="'cupo-' + clave"
                  type="number"
                  [formControlName]="clave"
                  min="0"
                  step="1"
              /></label>
            }
          </div>
        </fieldset>
        <fieldset>
          <legend>Funciones</legend>
          <p>
            En un plan normal, Predeterminado significa deshabilitada. El plan de transición
            conserva las funciones predeterminadas.
          </p>
          <div class="grid">
            @for (clave of funciones; track clave) {
              <label [for]="'funcion-' + clave"
                >{{ etiquetas[clave]
                }}<select [id]="'funcion-' + clave" [formControlName]="clave">
                  <option [ngValue]="null">Predeterminado</option>
                  <option [ngValue]="true">Habilitada</option>
                  <option [ngValue]="false">Deshabilitada</option>
                </select></label
              >
            }
          </div>
        </fieldset>
        <div class="acciones">
          <button [disabled]="form.invalid || ocupado()">
            {{ ocupado() ? 'Guardando…' : 'Guardar plan' }}</button
          ><button type="button" class="secundario" (click)="nuevo()" [disabled]="ocupado()">
            {{ editando() ? 'Cancelar edición' : 'Limpiar formulario' }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class PlanesPage {
  private readonly api = inject(SaasService);
  private readonly foco = inject(FocoService);
  protected readonly cuotas = CUOTAS;
  protected readonly funciones = FUNCIONES;
  protected readonly etiquetas = {
    usuarios: 'Cuentas',
    empleados: 'Empleados',
    productos: 'Productos',
    sucursales: 'Sucursales',
    recomendaciones: 'Recomendaciones',
    asistente: 'Asistente',
    reportes: 'Reportes',
    vestidor: 'Vestidor',
  };
  protected readonly planes = signal<Plan[]>([]);
  protected readonly editando = signal<number | null>(null);
  protected readonly legado = signal(false);
  protected readonly cargando = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z0-9_]{2,50}$/)],
    }),
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
        Validators.pattern(/\S/),
      ],
    }),
    activo: new FormControl(true, { nonNullable: true }),
    publico: new FormControl(false, { nonNullable: true }),
    usuarios: cupo(),
    empleados: cupo(),
    productos: cupo(),
    sucursales: cupo(),
    recomendaciones: funcion(),
    asistente: funcion(),
    reportes: funcion(),
    vestidor: funcion(),
  });
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    this.cargando.set(true);
    this.api
      .planes()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (planes) => this.planes.set(planes),
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  protected editar(plan: Plan): void {
    this.editando.set(plan.id);
    this.legado.set(plan.codigo === 'STYLEAR_LEGADO');
    this.form.reset({
      codigo: plan.codigo,
      nombre: plan.nombre,
      activo: plan.activo,
      publico: plan.publico,
      usuarios: plan.limites.usuarios ?? null,
      empleados: plan.limites.empleados ?? null,
      productos: plan.limites.productos ?? null,
      sucursales: plan.limites.sucursales ?? null,
      recomendaciones: plan.funciones.recomendaciones ?? null,
      asistente: plan.funciones.asistente ?? null,
      reportes: plan.funciones.reportes ?? null,
      vestidor: plan.funciones.vestidor ?? null,
    });
    this.foco.llevar('plan-codigo');
  }
  protected nuevo(): void {
    this.editando.set(null);
    this.legado.set(false);
    this.form.reset({ activo: true });
    this.foco.llevar('plan-codigo');
  }
  protected guardar(): void {
    if (this.form.invalid || this.ocupado()) {
      this.form.markAllAsTouched();
      return;
    }
    if (
      this.editando() &&
      !globalThis.confirm('¿Aplicar estos cambios a todas las empresas suscritas al plan?')
    )
      return;
    const f = this.form.getRawValue();
    const limites: Limites = {};
    const funciones: Funciones = {};
    for (const clave of CUOTAS) if (f[clave] !== null) limites[clave] = f[clave];
    for (const clave of FUNCIONES) if (f[clave] !== null) funciones[clave] = f[clave];
    const datos = {
      codigo: f.codigo.trim(),
      nombre: f.nombre.trim(),
      limites,
      funciones,
      activo: f.activo,
      publico: f.publico,
    };
    const id = this.editando();
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');
    (id === null ? this.api.crearPlan(datos) : this.api.editarPlan(id, datos))
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: () => {
          this.nuevo();
          this.mensaje.set('Plan guardado.');
          this.cargar();
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
}
