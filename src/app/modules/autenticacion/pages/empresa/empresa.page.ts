import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  EmpresaContextoService,
  EmpresaPublica,
} from '../../../../core/services/empresa-contexto.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { FocoService } from '../../../../core/services/foco.service';
import { AuthService } from '../../services/auth.service';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}

@Component({
  selector: 'app-empresa-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './empresa.page.html',
  styleUrl: './empresa.page.css',
})
export class EmpresaPage {
  private readonly contexto = inject(EmpresaContextoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly foco = inject(FocoService);
  private solicitud = 0;
  protected readonly empresas = signal<EmpresaPublica[]>([]);
  protected readonly cargando = signal(false);
  protected readonly abriendo = signal(false);
  protected readonly errorDirectorio = signal('');
  protected readonly errorEntrada = signal('');
  protected readonly pendiente = signal<EmpresaPublica | null>(null);
  protected readonly busquedaControl = new FormControl('', { nonNullable: true });
  private readonly busqueda = toSignal(this.busquedaControl.valueChanges, { initialValue: '' });
  protected readonly filtradas = computed(() => {
    const busqueda = normalizar(this.busqueda());
    return this.empresas().filter((empresa) => normalizar(empresa.nombre).includes(busqueda));
  });

  constructor() {
    const route = inject(ActivatedRoute);
    if (route.snapshot.queryParamMap.has('error'))
      this.errorEntrada.set('La empresa anterior ya no está disponible. Elige otra tienda.');
    this.cargar();
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const codigo = params.get('codigo');
      if (codigo !== null) this.abrir(codigo);
    });
  }

  protected cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorDirectorio.set('');
    this.contexto
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (empresas) => this.empresas.set(empresas),
        error: (error: unknown) =>
          this.errorDirectorio.set(
            mensajeApi(error, 'No se pudieron cargar las empresas. Inténtalo de nuevo.'),
          ),
      });
  }

  protected iniciales(nombre: string): string {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0] ?? '')
      .join('')
      .toLocaleUpperCase('es');
  }

  protected abrir(codigo: string): void {
    const solicitud = ++this.solicitud;
    this.abriendo.set(true);
    this.errorEntrada.set('');
    this.pendiente.set(null);
    // Revalidate a listed company in case its availability has changed.
    this.contexto
      .resolver(codigo)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (solicitud === this.solicitud) this.abriendo.set(false);
        }),
      )
      .subscribe({
        next: (empresa) => {
          if (solicitud !== this.solicitud) return;
          if (this.auth.estaAutenticado() && this.auth.usuarioActual()?.empresa_id !== empresa.id) {
            this.pendiente.set(empresa);
            this.foco.llevar('cambio-title');
          } else this.entrar(empresa);
        },
        error: (error: unknown) => {
          if (solicitud !== this.solicitud) return;
          if (!this.auth.estaAutenticado()) this.contexto.limpiar();
          this.errorEntrada.set(
            mensajeApi(error, 'Esta tienda ya no está disponible. Elige otra empresa.'),
          );
        },
      });
  }

  protected confirmarCambio(): void {
    const empresa = this.pendiente();
    if (!empresa || this.abriendo()) return;
    this.abriendo.set(true);
    this.auth
      .logout()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.entrar(empresa));
  }

  protected cancelar(): void {
    void this.router.navigateByUrl(this.auth.tieneRol('ADMIN_SAAS') ? '/saas/empresas' : '/inicio');
  }

  private entrar(empresa: EmpresaPublica): void {
    this.contexto.seleccionar(empresa);
    void this.router.navigateByUrl(this.auth.tieneRol('ADMINISTRADOR') ? '/dashboard' : '/inicio');
  }
}
