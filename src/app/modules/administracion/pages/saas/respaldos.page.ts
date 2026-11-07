import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';
import { mensajeApi } from '../../../../core/services/error-api';
import { FocoService } from '../../../../core/services/foco.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { EstadoPlanService } from '../../../../core/services/estado-plan.service';
import { AuthService } from '../../../autenticacion/services/auth.service';
import {
  ConfiguracionRespaldos,
  Empresa,
  PreviaRespaldo,
  Respaldo,
} from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';
import { RespaldosEmpresaService } from '../../services/respaldos-empresa.service';

@Component({
  selector: 'app-respaldos',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, KeyValuePipe],
  styleUrl: './saas.css',
  templateUrl: './respaldos.page.html',
})
export class RespaldosPage {
  private recargando = false;
  protected readonly plataforma = inject(ActivatedRoute).snapshot.data['ambito'] === 'PLATAFORMA';
  private readonly api = inject(SaasService);
  private readonly empresaApi = inject(RespaldosEmpresaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly foco = inject(FocoService);
  protected readonly plan = inject(EstadoPlanService);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly copias = signal<Respaldo[]>([]);
  protected readonly previa = signal<PreviaRespaldo | null>(null);
  protected readonly configuracion = signal<ConfiguracionRespaldos | null>(null);
  protected readonly estadoEmpresa = signal('');
  protected readonly ocupado = signal(false);
  protected readonly incierto = signal(false);
  protected readonly proceso = signal('');
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly form = new FormGroup({ empresa_id: new FormControl<number | null>(null) });
  protected readonly confirmacion = new FormControl('', { nonNullable: true });
  protected readonly restauracion = new FormGroup({ confirmacion: this.confirmacion });
  protected readonly programacion = new FormGroup({
    activa: new FormControl(false, { nonNullable: true }),
    fecha_inicio: new FormControl('', { nonNullable: true, validators: Validators.required }),
    hora_local: new FormControl('02:00', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)],
    }),
    zona_horaria: new FormControl('America/La_Paz', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
  });
  protected readonly horarioEditable = computed(
    () => this.plan.capacidades()?.funciones['horario_respaldo_configurable']?.incluida === true,
  );
  protected readonly automaticosIncluidos = computed(
    () => this.plan.capacidades()?.funciones['respaldos_automaticos']?.incluida === true,
  );
  protected readonly puedeCrear = computed(
    () =>
      this.plataforma ||
      (this.plan.habilita('respaldos_manuales') &&
        this.plan.capacidades()?.cupos['respaldos_manuales_semana']?.agotado !== true),
  );
  constructor() {
    inject(CambioContextoService)
      .cambio$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.empresas.set([]);
        this.copias.set([]);
        this.configuracion.set(null);
        this.estadoEmpresa.set('');
        this.cerrarPrevia();
        this.form.reset();
        this.programacion.reset();
        this.error.set('');
        this.mensaje.set('');
        this.incierto.set(false);
      });
    this.cargar();
  }
  private explicar(e: unknown): string {
    if (e instanceof HttpErrorResponse && e.status === 503)
      return 'El servicio de respaldos no está disponible. Contacta a la administración de plataforma para revisar su configuración.';
    return mensajeApi(e);
  }
  protected cargar(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.recargando = true;
    this.proceso.set('Consultando respaldos');
    this.cerrarPrevia();
    const datos = this.plataforma
      ? forkJoin({
          empresas: this.api.empresas(),
          copias: this.api.respaldos(),
          config: of(null),
          estado: of(null),
          capacidades: of(null),
        })
      : forkJoin({
          empresas: of([] as Empresa[]),
          copias: this.empresaApi.listar(),
          config: this.empresaApi.programacion().pipe(
            catchError((e) => {
              this.error.set(this.explicar(e));
              return of(null);
            }),
          ),
          estado: this.empresaApi.estadoEmpresa().pipe(
            catchError((e) => {
              this.error.set(this.explicar(e));
              return of(null);
            }),
          ),
          capacidades: this.plan.refrescar().pipe(
            catchError((e) => {
              this.error.set(this.explicar(e));
              return of(null);
            }),
          ),
        });
    datos
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.recargando = false;
          this.ocupado.set(false);
        }),
      )
      .subscribe({
        next: (r) => {
          this.empresas.set(r.empresas);
          this.copias.set(r.copias);
          this.configuracion.set(r.config);
          this.estadoEmpresa.set(r.estado?.empresa_estado ?? '');
          if (this.plataforma || r.capacidades) this.incierto.set(false);
          if (r.config) {
            const p = r.config.programacion;
            this.programacion.reset({
              activa: p.activa,
              fecha_inicio: p.fecha_inicio,
              hora_local: r.config.politica.horario_editable ? p.hora_local.slice(0, 5) : '02:00',
              zona_horaria: r.config.politica.horario_editable ? p.zona_horaria : 'America/La_Paz',
            });
          }
        },
        error: (e) => this.error.set(this.explicar(e)),
      });
  }
  protected nombreEmpresa(id: number | null): string {
    return this.empresas().find((e) => e.id === id)?.nombre ?? `Empresa ${id ?? ''}`;
  }
  protected origen(origen: Respaldo['origen']): string {
    return {
      MANUAL: 'Manual',
      AUTOMATICO: 'Automático',
      PRE_RESTAURACION: 'Preventivo antes de restaurar',
    }[origen];
  }
  protected puedeRestaurar(p: PreviaRespaldo): boolean {
    return p.tipo === 'GLOBAL'
      ? this.plataforma
      : (this.plataforma
          ? this.empresas().find((e) => e.id === p.empresa_id)?.estado
          : this.estadoEmpresa()) === 'SUSPENDIDA';
  }
  protected motivoManual(): string {
    if (this.plan.capacidades()?.cupos['respaldos_manuales_semana']?.agotado)
      return 'Cupo manual agotado en los últimos siete días. Eliminar copias no libera ese cupo.';
    return this.plan.motivo('respaldos_manuales');
  }
  protected crear(): void {
    if (this.ocupado() || this.incierto() || !this.puedeCrear()) return;
    this.ejecutar(
      this.plataforma
        ? this.api.crearRespaldo(this.form.controls.empresa_id.value)
        : this.empresaApi.crear(),
      'Creando copia cifrada',
      'Respaldo creado.',
    );
  }
  protected guardarProgramacion(): void {
    if (
      this.ocupado() ||
      this.incierto() ||
      !this.configuracion() ||
      !this.plan.capacidades()?.operaciones_habilitadas
    )
      return;
    const f = this.programacion.getRawValue();
    if (!this.automaticosIncluidos() && f.activa) {
      this.error.set('El plan no incluye respaldos automáticos.');
      return;
    }
    const editable = this.horarioEditable();
    if (!f.fecha_inicio || (editable && this.programacion.invalid)) {
      this.programacion.markAllAsTouched();
      this.error.set('Revisa la fecha, hora y zona horaria.');
      return;
    }
    this.ejecutar(
      this.empresaApi.guardarProgramacion({
        ...f,
        hora_local: editable ? f.hora_local : '02:00',
        zona_horaria: editable ? f.zona_horaria : 'America/La_Paz',
      }),
      'Guardando programación',
      'Programación guardada.',
    );
  }
  protected purgar(): void {
    if (
      this.plataforma &&
      !this.ocupado() &&
      !this.incierto() &&
      globalThis.confirm('¿Eliminar las copias vencidas de la plataforma?')
    )
      this.ejecutar(this.api.purgar(), 'Eliminando copias vencidas', 'Copias vencidas procesadas.');
  }
  protected eliminar(r: Respaldo): void {
    if (
      !this.ocupado() &&
      !this.incierto() &&
      r.estado === 'DISPONIBLE' &&
      globalThis.confirm(
        '¿Eliminar definitivamente esta copia? Eliminarla no devuelve el cupo manual consumido.',
      )
    )
      this.ejecutar(
        this.plataforma ? this.api.eliminarRespaldo(r.id) : this.empresaApi.eliminar(r.id),
        'Eliminando copia',
        'Copia eliminada.',
      );
  }
  protected previsualizar(r: Respaldo): void {
    if (this.ocupado() || this.incierto() || r.estado !== 'DISPONIBLE') return;
    this.cerrarPrevia();
    this.error.set('');
    this.ocupado.set(true);
    this.proceso.set('Revisando restauración');
    const lectura: Observable<{
      previa: PreviaRespaldo;
      empresas: Empresa[];
      estado: { empresa_estado: string } | null;
    }> = this.plataforma
      ? forkJoin({
          previa: this.api.previsualizar(r.id),
          empresas: this.api.empresas(),
          estado: of(null),
        })
      : forkJoin({
          previa: this.empresaApi.previsualizar(r.id),
          empresas: of([] as Empresa[]),
          estado: this.empresaApi.estadoEmpresa(),
        });
    lectura
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.previa.set(r.previa);
          this.empresas.set(r.empresas);
          if (r.estado) this.estadoEmpresa.set(r.estado.empresa_estado);
          this.foco.llevar('previa-title');
        },
        error: (e) => this.error.set(this.explicar(e)),
      });
  }
  protected cerrarPrevia(): void {
    this.previa.set(null);
    this.confirmacion.reset();
  }
  protected restaurar(): void {
    const p = this.previa();
    if (
      !p ||
      this.ocupado() ||
      this.incierto() ||
      !this.puedeRestaurar(p) ||
      this.confirmacion.value !== p.confirmacion
    )
      return;
    this.ejecutar(
      this.plataforma
        ? this.api.restaurar(p.id, this.confirmacion.value)
        : this.empresaApi.restaurar(p.id, this.confirmacion.value),
      'Restaurando copia revisada',
      p.tipo === 'GLOBAL'
        ? 'Copia restaurada en el entorno de ensayo.'
        : 'Empresa restaurada; permanece suspendida para revisión.',
      !this.plataforma,
    );
  }
  private ejecutar(
    operacion: Observable<unknown>,
    proceso: string,
    mensaje: string,
    cerrarSesion = false,
  ): void {
    this.ocupado.set(true);
    this.proceso.set(proceso);
    this.error.set('');
    this.mensaje.set('');
    operacion
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (!this.recargando) this.ocupado.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.cerrarPrevia();
          if (cerrarSesion) {
            this.auth.limpiarSesion();
            void this.router.navigate(['/login'], {
              queryParams: { motivo: 'empresa_restaurada' },
            });
            return;
          }
          this.mensaje.set(mensaje);
          this.ocupado.set(false);
          this.cargar();
        },
        error: (e) => {
          const incierto = e instanceof HttpErrorResponse && [0, 408, 502, 504].includes(e.status);
          this.incierto.set(incierto);
          this.cerrarPrevia();
          this.error.set(
            incierto
              ? 'No se pudo confirmar el resultado. No repitas la operación todavía: pulsa Actualizar para revisar las copias y el uso antes de volver a intentarlo.'
              : this.explicar(e),
          );
          this.foco.llevar('error-respaldos');
        },
      });
  }
}
