import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormRecord,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { mensajeApi } from '../../../../core/services/error-api';
import { FocoService } from '../../../../core/services/foco.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { CatalogoPlan } from '../../../../core/models/capacidades-plan.models';
import {
  HistorialPlan,
  Plan,
  PlanAlta,
  PlanCambio,
  PreviaPlan,
  ResumenPlan,
} from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';

@Component({
  selector: 'app-saas-planes',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, KeyValuePipe],
  styleUrl: './saas.css',
  templateUrl: './planes.page.html',
})
export class PlanesPage {
  private readonly api = inject(SaasService);
  private readonly foco = inject(FocoService);
  private readonly destroy = inject(DestroyRef);
  protected readonly catalogo = signal<CatalogoPlan | null>(null);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly resumen = signal<ResumenPlan[]>([]);
  protected readonly comparacion = signal<Plan[]>([]);
  protected readonly historial = signal<HistorialPlan[] | null>(null);
  protected readonly nombreHistorial = signal('');
  protected readonly previa = signal<PreviaPlan | null>(null);
  protected readonly editando = signal<Plan | null>(null);
  protected readonly cargando = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  private cambiosConfirmados: PlanCambio | null = null;
  protected readonly limites = new FormRecord<FormControl<number | null>>({});
  protected readonly funciones = new FormRecord<FormControl<boolean>>({});
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
    descripcion: new FormControl('', { nonNullable: true, validators: Validators.maxLength(4000) }),
    stripe_price_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255), Validators.pattern(/^price_[A-Za-z0-9]+$/)],
    }),
    condiciones: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(10000),
    }),
    precio: new FormControl(0, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(0),
        Validators.max(9999999999.99),
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ],
    }),
    moneda: new FormControl('BOB', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)],
    }),
    activo: new FormControl(true, { nonNullable: true }),
    publico: new FormControl(false, { nonNullable: true }),
    limites: this.limites,
    funciones: this.funciones,
  });
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.invalidarPrevia());
    inject(CambioContextoService)
      .cambio$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.planes.set([]);
        this.comparacion.set([]);
        this.resumen.set([]);
        this.historial.set(null);
        this.catalogo.set(null);
        this.editando.set(null);
        this.invalidarPrevia();
        this.form.reset();
      });
    this.cargar();
  }
  protected cargar(): void {
    if (this.ocupado() || this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      planes: this.api.planes(),
      catalogo: this.api.catalogoPlanes(),
      resumen: this.api.resumenPlanes(),
      comparacion: this.api.comparacionPlanes(),
    })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.planes.set(r.planes);
          this.resumen.set(r.resumen);
          this.comparacion.set(r.comparacion.planes);
          if (!this.catalogo()) {
            this.catalogo.set(r.catalogo);
            for (const l of r.catalogo.limites)
              this.limites.addControl(
                l.clave,
                new FormControl<number | null>(null, [
                  Validators.min(l.minimo),
                  Validators.max(
                    ['retencion_respaldos_dias', 'frecuencia_respaldo_dias'].includes(l.clave)
                      ? 3650
                      : 2147483647,
                  ),
                  Validators.pattern(/^\d+$/),
                ]),
              );
            for (const f of r.catalogo.funciones)
              this.funciones.addControl(f.clave, new FormControl(false, { nonNullable: true }));
            this.nuevo(false);
          }
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  protected editar(p: Plan): void {
    this.editando.set(p);
    this.invalidarPrevia();
    this.form.reset({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      condiciones: p.condiciones,
      precio: Number(p.precio),
      stripe_price_id: p.stripe_price_id ?? '',
      moneda: p.moneda,
      activo: p.activo,
      publico: p.publico,
    });
    for (const l of this.catalogo()?.limites ?? [])
      this.limites.controls[l.clave].setValue(p.limites[l.clave] ?? null);
    for (const f of this.catalogo()?.funciones ?? [])
      this.funciones.controls[f.clave].setValue(p.funciones[f.clave] ?? true);
    this.foco.llevar('plan-codigo');
  }
  protected nuevo(enfocar = true): void {
    this.editando.set(null);
    this.invalidarPrevia();
    this.form.reset({
      codigo: '',
      nombre: '',
      precio: 0,
      moneda: 'BOB',
      activo: true,
      publico: false,
    });
    // Valores de creación explícitos; no infieren capacidades a partir del nombre de un plan.
    for (const l of this.catalogo()?.limites ?? [])
      this.limites.controls[l.clave].setValue(
        (
          {
            respaldos_manuales_semana: 5,
            retencion_respaldos_dias: 30,
            frecuencia_respaldo_dias: 1,
          } as Record<string, number>
        )[l.clave] ?? null,
      );
    if (enfocar) this.foco.llevar('plan-codigo');
  }
  private invalidarPrevia(): void {
    this.previa.set(null);
    this.cambiosConfirmados = null;
  }
  protected volver(): void {
    this.invalidarPrevia();
    this.foco.llevar('plan-codigo');
  }
  private datos(): PlanAlta & { activo: boolean } {
    const f = this.form.getRawValue();
    const limites: Record<string, number> = {};
    for (const [k, v] of Object.entries(f.limites)) if (v !== null) limites[k] = v;
    return {
      codigo: f.codigo.trim(),
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim(),
      condiciones: f.condiciones.trim(),
      precio: f.precio,
      stripe_price_id: f.stripe_price_id.trim() || null,
      moneda: f.moneda,
      activo: f.activo,
      publico: f.publico,
      limites,
      funciones: f.funciones,
    };
  }
  private validar(): boolean {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa el código, nombre, precio y los límites indicados.');
      return false;
    }
    const f = this.funciones.getRawValue(),
      l = this.limites.getRawValue();
    for (const c of this.catalogo()?.funciones ?? []) {
      if (
        f[c.clave] &&
        (c.dependencias.some((k) => !f[k]) ||
          (c.requiere_alguna.length > 0 && !c.requiere_alguna.some((k) => f[k])))
      ) {
        this.error.set('Revisa las dependencias de ' + c.nombre + '.');
        return false;
      }
    }
    if (
      (f['reportes_programacion'] && l['reportes_programados'] === 0) ||
      (f['respaldos_manuales'] && (l['respaldos_manuales_semana'] ?? 0) < 1)
    ) {
      this.error.set('La función habilitada necesita un cupo mayor que cero.');
      return false;
    }
    if (
      this.editando() &&
      Object.entries(this.editando()!.limites).some(([k]) => k in l && l[k] === null)
    ) {
      this.error.set(
        'Un límite existente no puede eliminarse dejando el campo vacío. Conserva un número válido.',
      );
      return false;
    }
    return true;
  }
  private cambios(completos: PlanAlta & { activo: boolean }): PlanCambio {
    const datos: PlanCambio = {};
    for (const clave of [
      'codigo',
      'nombre',
      'descripcion',
      'condiciones',
      'precio',
      'stripe_price_id',
      'moneda',
      'activo',
      'publico',
    ] as const) {
      if (this.form.controls[clave].dirty) Object.assign(datos, { [clave]: completos[clave] });
    }
    const limites = Object.fromEntries(
      Object.entries(completos.limites).filter(([k]) => this.limites.controls[k]?.dirty),
    );
    const funciones = Object.fromEntries(
      Object.entries(completos.funciones).filter(([k]) => this.funciones.controls[k]?.dirty),
    );
    if (Object.keys(limites).length) datos.limites = limites;
    if (Object.keys(funciones).length) datos.funciones = funciones;
    return datos;
  }
  protected guardar(): void {
    if (this.ocupado() || this.cargando() || !this.catalogo() || !this.validar()) return;
    this.error.set('');
    this.mensaje.set('');
    this.ocupado.set(true);
    const completos = this.datos(),
      datos = this.editando() ? this.cambios(completos) : completos,
      id = this.editando()?.id;
    if (id !== undefined) {
      this.api
        .previsualizarPlan(id, datos)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.ocupado.set(false)),
        )
        .subscribe({
          next: (p) => {
            this.cambiosConfirmados = datos;
            this.previa.set(p);
            this.foco.llevar('impacto-plan');
          },
          error: (e) => this.error.set(mensajeApi(e)),
        });
    } else {
      const { activo: _, ...alta } = completos;
      this.api
        .crearPlan(alta)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.ocupado.set(false)),
        )
        .subscribe({ next: () => this.guardado(), error: (e) => this.error.set(mensajeApi(e)) });
    }
  }
  protected confirmar(): void {
    const id = this.editando()?.id,
      p = this.previa(),
      datos = this.cambiosConfirmados;
    if (id === undefined || !p || !datos || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.api
      .editarPlan(id, { ...datos, token_previsualizacion: p.token_previsualizacion })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: () => this.guardado(),
        error: (e) => {
          this.invalidarPrevia();
          this.error.set(mensajeApi(e) + ' Vuelve a revisar el impacto antes de confirmar.');
          this.foco.llevar('plan-codigo');
        },
      });
  }
  private guardado(): void {
    this.nuevo();
    this.mensaje.set('Plan guardado. Las programaciones pausadas no se reactivan automáticamente.');
    // Finalize mantiene ocupado hasta terminar la notificación de éxito.
    this.ocupado.set(false);
    this.cargar();
  }
  protected verHistorial(p: Plan): void {
    if (this.ocupado()) return;
    this.historial.set(null);
    this.nombreHistorial.set(p.nombre);
    this.ocupado.set(true);
    this.api
      .historialPlan(p.id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: (h) => {
          this.historial.set(h);
          this.foco.llevar('historial-plan');
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
}
