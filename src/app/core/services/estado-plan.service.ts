import { computed, inject, Service, signal } from '@angular/core';
import { CambioContextoService } from './cambio-contexto.service';
import { EmpresaContextoService } from './empresa-contexto.service';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, shareReplay, takeUntil, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CapacidadesPlan } from '../models/capacidades-plan.models';

@Service()
export class EstadoPlanService {
  private readonly contexto = inject(EmpresaContextoService);
  private readonly http = inject(HttpClient);
  private readonly cambios = inject(CambioContextoService);
  private readonly datos = signal<CapacidadesPlan | null>(null);
  readonly capacidades = this.datos.asReadonly();
  private pendiente?: Observable<CapacidadesPlan>;
  private readonly vigente = signal<boolean | null>(null);
  private readonly aviso = signal('');
  readonly mensaje = this.aviso.asReadonly();
  readonly operacionesPermitidas = computed(
    () => this.vigente() ?? this.contexto.empresa()?.estado !== 'SUSPENDIDA',
  );

  constructor() {
    this.cambios.cambio$.subscribe(() => {
      this.datos.set(null);
      this.pendiente = undefined;
      this.vigente.set(null);
      this.aviso.set('');
    });
  }

  refrescar(): Observable<CapacidadesPlan> {
    if (this.pendiente) return this.pendiente;
    const empresaId = this.contexto.empresa()?.id;
    const consulta = this.http
      .get<CapacidadesPlan>(API_BASE_URL + '/api/v1/mi-empresa/capacidades')
      .pipe(
        takeUntil(this.cambios.cambio$),
        tap((p) => {
          if (empresaId === this.contexto.empresa()?.id && p.empresa_id === empresaId) {
            this.datos.set(p);
            this.aplicar(p.operaciones_habilitadas);
          }
        }),
        finalize(() => {
          if (this.pendiente === consulta) this.pendiente = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    this.pendiente = consulta;
    return consulta;
  }
  habilita(clave: string): boolean {
    return this.datos()?.funciones[clave]?.habilitada === true;
  }
  motivo(clave: string): string {
    switch (this.datos()?.funciones[clave]?.motivo ?? this.datos()?.cupos[clave]?.motivo) {
      case 'FUNCION_NO_INCLUIDA':
        return 'No incluido en tu plan.';
      case 'SUSCRIPCION_NO_VIGENTE':
        return 'La suscripción no está vigente.';
      case 'CUPO_AGOTADO':
        return 'Se alcanzó el cupo de tu plan.';
      default:
        return 'Actualiza la información de tu plan.';
    }
  }

  aplicar(vigente: boolean): void {
    this.vigente.set(vigente);
  }
  restringir(): void {
    this.vigente.set(false);
  }
  notificar(mensaje: string): void {
    this.aviso.set(mensaje);
  }
  cerrarAviso(): void {
    this.aviso.set('');
  }
}
