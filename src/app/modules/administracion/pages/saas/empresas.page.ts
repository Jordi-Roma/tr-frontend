import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CapacidadesPlan } from '../../../../core/models/capacidades-plan.models';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { CapacidadesPlanComponent } from './capacidades-plan.component';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { mensajeApi } from '../../../../core/services/error-api';
import { FocoService } from '../../../../core/services/foco.service';
import { Empresa, Plan, Suscripcion } from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';

function hoy(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
const texto = (min = 1, max = 150) =>
  new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(min), Validators.maxLength(max)],
  });

@Component({
  selector: 'app-saas-empresas',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CapacidadesPlanComponent],
  styleUrl: './saas.css',
  template: `
    <header class="encabezado">
      <div>
        <p class="ceja">Plataforma</p>
        <h1>Empresas</h1>
        <p>Gestiona el acceso y la suscripción de cada empresa.</p>
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
      <p role="status">Cargando empresas y planes…</p>
    }
    <section class="panel">
      <h2>Buscar empresas</h2>
      <form [formGroup]="filtros" (ngSubmit)="buscar()">
        <div class="grid">
          <label for="filtro-plan"
            >Plan<select id="filtro-plan" formControlName="plan_id">
              <option value="">Todos</option>
              @for (p of planes(); track p.id) {
                <option [value]="p.id">{{ p.nombre }}</option>
              }
            </select></label
          >
          <label for="filtro-estado"
            >Estado<select id="filtro-estado" formControlName="estado">
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="SUSPENDIDA">Suspendida</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CANCELADA">Cancelada</option>
            </select></label
          >
          <label for="filtro-buscar"
            >Nombre o código<input id="filtro-buscar" formControlName="buscar" maxlength="150"
          /></label>
        </div>
        <button [disabled]="cargando() || ocupado()">Buscar empresas</button>
      </form>
    </section>
    <section class="panel tabla">
      <table>
        <caption>
          Empresas contratantes
        </caption>
        <thead>
          <tr>
            <th scope="col">Empresa</th>
            <th scope="col">Estado</th>
            <th scope="col">Plan y vigencia</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (empresa of empresas(); track empresa.id) {
            <tr>
              <td>
                <strong>{{ empresa.nombre }}</strong
                ><small>{{ empresa.codigo }}</small>
                @if (empresa.estado === 'ACTIVA' || empresa.estado === 'SUSPENDIDA') {
                  <a [routerLink]="['/e', empresa.codigo]">Abrir entrada pública</a>
                }
                @if (empresa.correo_contacto) {
                  <small>Responsable: {{ empresa.responsable }}</small>
                  <small>Contacto: {{ empresa.correo_contacto }} (correo sin verificar)</small>
                }
              </td>
              <td>
                <span class="estado">{{ empresa.estado }}</span>
              </td>
              <td>
                {{ empresa.plan_nombre || 'Sin plan'
                }}<small
                  >{{ empresa.fecha_inicio | date: 'dd/MM/yyyy' : 'UTC' }} →
                  {{
                    empresa.fecha_vencimiento
                      ? (empresa.fecha_vencimiento | date: 'dd/MM/yyyy' : 'UTC')
                      : 'Sin vencimiento'
                  }}</small
                ><small>{{ empresa.suscripcion_estado || 'Sin suscripción' }}</small>
              </td>
              <td>
                <button
                  class="secundario"
                  (click)="seleccionar(empresa)"
                  [disabled]="ocupado()"
                  [attr.aria-label]="'Configurar ' + empresa.nombre"
                >
                  Configurar
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">{{ cargando() ? 'Cargando…' : 'No hay empresas disponibles.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <nav class="acciones" aria-label="Páginas de empresas">
      <button
        class="secundario"
        [disabled]="pagina() <= 1 || cargando() || ocupado()"
        (click)="irPagina(pagina() - 1)"
      >
        Anterior
      </button>
      <p role="status">Página {{ pagina() }} · {{ total() }} empresas</p>
      <button
        class="secundario"
        [disabled]="pagina() * 20 >= total() || cargando() || ocupado()"
        (click)="irPagina(pagina() + 1)"
      >
        Siguiente
      </button>
    </nav>
    @if (seleccionada(); as empresa) {
      <section class="panel" aria-labelledby="config-title">
        <h2 id="config-title">Configurar {{ empresa.nombre }}</h2>
        <p>El código {{ empresa.codigo }} es estable y conserva sus enlaces.</p>
        <form [formGroup]="edicion" (ngSubmit)="guardarNombre()">
          <label for="empresa-nombre"
            >Nombre de empresa<input
              id="empresa-nombre"
              formControlName="nombre"
              required
              maxlength="150"
          /></label>
          <div class="acciones">
            <button [disabled]="ocupado() || edicion.invalid">Guardar nombre</button
            ><button type="button" class="secundario" (click)="seleccionada.set(null)">
              Cerrar configuración
            </button>
          </div>
        </form>
        @if (empresa.correo_contacto) {
          <p>
            Responsable: {{ empresa.responsable }} · {{ empresa.correo_contacto }} (correo sin
            verificar)
          </p>
        }
        <h3>Plan y política actuales</h3>
        @if (detalleCargando()) {
          <p role="status">Consultando historial y política…</p>
        }
        @if (detalleError()) {
          <p class="error" role="alert">{{ detalleError() }}</p>
          <button class="secundario" (click)="seleccionar(empresa)" [disabled]="ocupado()">
            Reintentar detalle
          </button>
        }
        @if (capacidades(); as c) {
          <app-capacidades-plan [datos]="c" />
        }
        <h3>Historial de suscripciones</h3>
        <ul>
          @for (s of historial(); track s.id) {
            <li>
              {{ s.plan_nombre }} · {{ s.estado }} ·
              {{ s.fecha_inicio | date: 'dd/MM/yyyy' : 'UTC' }} →
              {{
                s.fecha_vencimiento
                  ? (s.fecha_vencimiento | date: 'dd/MM/yyyy' : 'UTC')
                  : 'Sin vencimiento'
              }}
            </li>
          } @empty {
            <li>Sin suscripciones registradas.</li>
          }
        </ul>
        <h3>Estado de acceso</h3>
        @if (empresa.estado === 'PENDIENTE') {
          <p class="aviso">
            Solicitud de registro público. Revisa el contacto, elige plan y vigencia y aprueba la
            empresa en la sección de suscripción. El correo no fue verificado.
          </p>
        }
        <form [formGroup]="estadoForm" (ngSubmit)="guardarEstado()">
          <label for="empresa-estado"
            >Estado<select id="empresa-estado" formControlName="estado">
              @if (empresa.estado === 'PENDIENTE') {
                <option value="PENDIENTE" disabled>Pendiente de aprobación</option>
              } @else {
                <option value="ACTIVA">Activa</option>
                <option value="SUSPENDIDA">Suspendida</option>
              }
              <option value="CANCELADA">Cancelada</option>
            </select></label
          >
          <p class="aviso">
            Suspender bloquea operaciones nuevas y conserva consultas y pendientes. Cancelar impide
            el acceso.
          </p>
          <button [disabled]="ocupado() || estadoForm.controls.estado.value === 'PENDIENTE'">
            Aplicar estado
          </button>
        </form>
        <h3>
          {{
            empresa.estado === 'PENDIENTE'
              ? 'Aprobar empresa y activar suscripción'
              : 'Asignar o renovar suscripción'
          }}
        </h3>
        <form [formGroup]="suscripcion" (ngSubmit)="asignar()">
          <div class="grid">
            <label for="sus-plan"
              >Plan<select id="sus-plan" formControlName="plan_id" required>
                <option [ngValue]="null">Elegir plan</option>
                @for (plan of activos(); track plan.id) {
                  <option [ngValue]="plan.id">{{ plan.nombre }}</option>
                }
              </select></label
            ><label for="sus-inicio"
              >Inicio<input
                id="sus-inicio"
                type="date"
                formControlName="fecha_inicio"
                required /></label
            ><label for="sus-fin"
              >Vencimiento opcional<input
                id="sus-fin"
                type="date"
                formControlName="fecha_vencimiento"
                [min]="suscripcion.controls.fecha_inicio.value"
            /></label>
          </div>
          <p>Esta asignación reemplaza la suscripción activa y conserva su historial.</p>
          <button [disabled]="ocupado() || suscripcion.invalid">
            {{
              empresa.estado === 'PENDIENTE' ? 'Aprobar y activar empresa' : 'Guardar suscripción'
            }}
          </button>
        </form>
      </section>
    }

    <section class="panel" aria-labelledby="alta-title">
      <h2 id="alta-title">Registrar empresa</h2>
      <p>La empresa, su suscripción y la cuenta administradora se crean juntas.</p>
      <form [formGroup]="alta" (ngSubmit)="crear()">
        <div class="grid">
          <label for="alta-codigo"
            >Código público<input
              id="alta-codigo"
              formControlName="codigo"
              required
              maxlength="40"
              aria-describedby="codigo-ayuda"
            /><small id="codigo-ayuda"
              >De 2 a 40 letras minúsculas, números o guiones.</small
            ></label
          >
          <label for="alta-nombre"
            >Nombre<input id="alta-nombre" formControlName="nombre" required maxlength="150"
          /></label>
          <label for="alta-plan"
            >Plan<select id="alta-plan" formControlName="plan_id" required>
              <option [ngValue]="null">Elegir plan</option>
              @for (plan of activos(); track plan.id) {
                <option [ngValue]="plan.id">{{ plan.nombre }}</option>
              }
            </select></label
          >
          <label for="alta-inicio"
            >Inicio<input
              id="alta-inicio"
              type="date"
              formControlName="fecha_inicio"
              required /></label
          ><label for="alta-fin"
            >Vencimiento opcional<input
              id="alta-fin"
              type="date"
              formControlName="fecha_vencimiento"
              [min]="alta.controls.fecha_inicio.value"
          /></label>
        </div>
        <fieldset>
          <legend>Administrador inicial</legend>
          <div class="grid">
            <label for="ad-nombre"
              >Nombre<input
                id="ad-nombre"
                formControlName="admin_nombre"
                autocomplete="off"
                required
                maxlength="120" /></label
            ><label for="ad-apellido"
              >Apellido<input
                id="ad-apellido"
                formControlName="admin_apellido"
                autocomplete="off"
                required
                maxlength="120"
            /></label>
            <label for="ad-usuario"
              >Usuario<input
                id="ad-usuario"
                formControlName="username"
                autocomplete="off"
                required
                minlength="4"
                maxlength="80" /></label
            ><label for="ad-correo"
              >Correo<input
                id="ad-correo"
                type="email"
                formControlName="correo"
                autocomplete="off"
                required
                maxlength="150" /></label
            ><label for="ad-password"
              >Contraseña inicial<input
                id="ad-password"
                type="password"
                formControlName="password"
                autocomplete="new-password"
                required
                minlength="8"
            /></label>
          </div>
        </fieldset>
        <div class="acciones">
          <button [disabled]="ocupado() || alta.invalid || !activos().length">Crear empresa</button
          ><a routerLink="/saas/planes">Gestionar planes</a>
        </div>
      </form>
    </section>
  `,
})
export class EmpresasPage {
  private readonly api = inject(SaasService);
  private readonly foco = inject(FocoService);
  private readonly destroy = inject(DestroyRef);
  protected readonly pagina = signal(1);
  protected readonly total = signal(0);
  protected readonly historial = signal<Suscripcion[]>([]);
  protected readonly capacidades = signal<CapacidadesPlan | null>(null);
  protected readonly detalleCargando = signal(false);
  protected readonly detalleError = signal('');
  private detalleRevision = 0;
  private listaRevision = 0;
  protected readonly filtros = new FormGroup({
    plan_id: new FormControl('', { nonNullable: true }),
    estado: new FormControl('', { nonNullable: true }),
    buscar: new FormControl('', { nonNullable: true }),
  });
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly activos = computed(() => this.planes().filter((p) => p.activo));
  protected readonly seleccionada = signal<Empresa | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly alta = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{1,39}$/)],
    }),
    nombre: texto(2),
    plan_id: new FormControl<number | null>(null, Validators.required),
    fecha_inicio: new FormControl(hoy(), { nonNullable: true, validators: Validators.required }),
    fecha_vencimiento: new FormControl('', { nonNullable: true }),
    admin_nombre: texto(1, 120),
    admin_apellido: texto(1, 120),
    username: texto(4, 80),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(150)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  protected readonly edicion = new FormGroup({ nombre: texto(2) });
  protected readonly estadoForm = new FormGroup({
    estado: new FormControl<Empresa['estado']>('ACTIVA', { nonNullable: true }),
  });
  protected readonly suscripcion = new FormGroup({
    plan_id: new FormControl<number | null>(null, Validators.required),
    fecha_inicio: new FormControl(hoy(), { nonNullable: true, validators: Validators.required }),
    fecha_vencimiento: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    inject(CambioContextoService)
      .cambio$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.empresas.set([]);
        this.planes.set([]);
        this.seleccionada.set(null);
        this.capacidades.set(null);
        this.historial.set([]);
        this.alta.reset();
        this.suscripcion.reset();
        this.detalleRevision++;
        this.listaRevision++;
        this.edicion.reset();
        this.estadoForm.reset();
        this.filtros.reset();
        this.total.set(0);
        this.error.set('');
        this.mensaje.set('');
      });
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.filtros.controls.plan_id.setValue(params.get('plan_id') ?? '');
        this.pagina.set(1);
        this.cargar();
      });
  }
  protected buscar(): void {
    this.pagina.set(1);
    this.cargar();
  }
  protected irPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }
  protected cargar(): void {
    const revision = ++this.listaRevision;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      empresas: this.api.empresasPorPlan({
        pagina: this.pagina(),
        tamano: 20,
        ...Object.fromEntries(
          Object.entries(this.filtros.getRawValue()).filter(([, v]) => v !== ''),
        ),
      }),
      planes: this.api.planes(),
    })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (revision === this.listaRevision) this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (r) => {
          if (revision !== this.listaRevision) return;
          this.empresas.set(r.empresas.empresas);
          this.total.set(r.empresas.total);
          this.planes.set(r.planes);
        },
        error: (e) => {
          if (revision === this.listaRevision) this.error.set(mensajeApi(e));
        },
      });
  }
  protected seleccionar(empresa: Empresa): void {
    this.seleccionada.set(empresa);
    this.capacidades.set(null);
    this.historial.set([]);
    this.detalleError.set('');
    this.detalleCargando.set(true);
    const revision = ++this.detalleRevision;
    forkJoin({
      politica: this.api.capacidadesEmpresa(empresa.id),
      historial: this.api.suscripciones(empresa.id),
      contactos: this.api.empresas(),
    })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (revision === this.detalleRevision) this.detalleCargando.set(false);
        }),
      )
      .subscribe({
        next: (r) => {
          if (revision !== this.detalleRevision || this.seleccionada()?.id !== empresa.id) return;
          this.capacidades.set(r.politica);
          this.historial.set(r.historial);
          const contacto = r.contactos.find((e) => e.id === empresa.id);
          if (contacto) this.seleccionada.set(contacto);
        },
        error: (e) => {
          if (revision === this.detalleRevision) this.detalleError.set(mensajeApi(e));
        },
      });
    this.edicion.reset({ nombre: empresa.nombre });
    this.estadoForm.reset({ estado: empresa.estado });
    this.suscripcion.reset({
      plan_id: empresa.plan_id,
      fecha_inicio: hoy(),
      fecha_vencimiento: '',
    });
    this.foco.llevar('empresa-nombre');
  }
  protected crear(): void {
    if (this.alta.invalid || this.ocupado()) {
      this.alta.markAllAsTouched();
      return;
    }
    const f = this.alta.getRawValue();
    if (!f.plan_id || !this.fechas(f.fecha_inicio, f.fecha_vencimiento)) return;
    this.ocupado.set(true);
    this.error.set('');
    this.api
      .crearEmpresa({
        codigo: f.codigo.trim().toLowerCase(),
        nombre: f.nombre.trim(),
        plan_id: f.plan_id,
        fecha_inicio: f.fecha_inicio,
        fecha_vencimiento: f.fecha_vencimiento || null,
        administrador: {
          nombre: f.admin_nombre.trim(),
          apellido: f.admin_apellido.trim(),
          username: f.username.trim(),
          correo: f.correo.trim(),
          password: f.password,
        },
      })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: () => {
          this.alta.reset({ fecha_inicio: hoy() });
          this.mensaje.set('Empresa y administrador creados.');
          this.cargar();
        },
        error: (e) => {
          this.alta.controls.password.reset();
          this.error.set(mensajeApi(e));
        },
      });
  }
  protected guardarNombre(): void {
    const e = this.seleccionada();
    if (!e || this.edicion.invalid || this.ocupado()) return;
    this.ejecutar(
      this.api.editarEmpresa(e.id, this.edicion.controls.nombre.value.trim()),
      'Nombre actualizado.',
    );
  }
  protected guardarEstado(): void {
    const e = this.seleccionada();
    if (!e || this.ocupado()) return;
    if (
      this.estadoForm.controls.estado.value === 'CANCELADA' &&
      !globalThis.confirm(`¿Cancelar el acceso de ${e.nombre}?`)
    )
      return;
    this.ejecutar(
      this.api.estadoEmpresa(e.id, this.estadoForm.controls.estado.value),
      'Estado actualizado.',
    );
  }
  protected asignar(): void {
    const e = this.seleccionada();
    const f = this.suscripcion.getRawValue();
    if (!e || !f.plan_id || this.ocupado() || !this.fechas(f.fecha_inicio, f.fecha_vencimiento))
      return;
    this.ejecutar(
      this.api.suscribir(e.id, f.plan_id, f.fecha_inicio, f.fecha_vencimiento || null),
      e.estado === 'PENDIENTE'
        ? 'Empresa aprobada y suscripción activada.'
        : 'Suscripción actualizada.',
    );
  }
  private ejecutar(operacion: import('rxjs').Observable<unknown>, mensaje: string): void {
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');
    operacion
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: () => {
          this.seleccionada.set(null);
          this.mensaje.set(mensaje);
          this.cargar();
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  private fechas(inicio: string, fin: string): boolean {
    if (!inicio || (fin && fin < inicio)) {
      this.error.set('El vencimiento debe ser igual o posterior al inicio.');
      return false;
    }
    return true;
  }
}
