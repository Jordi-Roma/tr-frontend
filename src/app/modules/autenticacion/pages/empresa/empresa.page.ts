import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  EmpresaContextoService,
  EmpresaPublica,
} from '../../../../core/services/empresa-contexto.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-empresa-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="entrada">
      <section aria-labelledby="empresa-title" class="tarjeta">
        <p class="marca">StyleAR</p>
        <h1 id="empresa-title">Entrar a una empresa</h1>
        <p>Introduce el código que te compartió la tienda.</p>
        <form [formGroup]="form" (ngSubmit)="buscar()">
          <label for="codigo-empresa">Código de empresa</label>
          <input
            id="codigo-empresa"
            formControlName="codigo"
            autocomplete="organization"
            required
            aria-describedby="codigo-ayuda"
            [attr.aria-invalid]="form.controls.codigo.touched && form.controls.codigo.invalid"
          />
          <small id="codigo-ayuda"
            >Usa entre 2 y 40 letras, números o guiones. Por ejemplo: stylear.</small
          >
          <button type="submit" [disabled]="cargando()">
            {{ cargando() ? 'Buscando…' : 'Continuar' }}
          </button>
        </form>
        @if (error()) {
          <p role="alert" class="error">{{ error() }}</p>
        }
        @if (pendiente(); as empresa) {
          <section class="cambio" aria-labelledby="cambio-title">
            <h2 id="cambio-title">Entrar a {{ empresa.nombre }}</h2>
            <p>
              Hay una sesión abierta. Para cambiar de empresa se cerrará esa sesión y se limpiarán
              sus datos de este dispositivo.
            </p>
            <button type="button" (click)="confirmarCambio()" [disabled]="cargando()">
              Cerrar sesión y entrar
            </button>
            <button type="button" class="secundario" (click)="cancelar()">
              Conservar mi sesión
            </button>
          </section>
        }
        <a routerLink="/saas/login">Administración de la plataforma</a>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
    .entrada {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .tarjeta {
      width: min(100%, 520px);
      background: white;
      border: 1px solid #d5d5ce;
      padding: 36px;
      border-radius: 12px;
    }
    .marca {
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    h1 {
      font-size: 2rem;
    }
    h2 {
      font-size: 1.2rem;
    }
    form {
      display: grid;
      gap: 12px;
      margin: 28px 0;
    }
    label {
      font-weight: 600;
    }
    input {
      padding: 12px;
      border: 1px solid #767670;
      border-radius: 6px;
      font-size: 1rem;
    }
    small {
      color: #4f4f49;
    }
    button {
      padding: 12px 18px;
      background: #171717;
      color: white;
      border: 1px solid #171717;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
    }
    button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .secundario {
      background: white;
      color: #171717;
      margin-top: 10px;
    }
    a {
      color: #292924;
      text-underline-offset: 3px;
    }
    .error {
      color: #9b2424;
    }
    .cambio {
      border-top: 1px solid #ddd;
      padding: 18px 0;
    }
    :is(button, input, a):focus-visible {
      outline: 3px solid #426621;
      outline-offset: 3px;
    }
  `,
})
export class EmpresaPage {
  private readonly contexto = inject(EmpresaContextoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private solicitud = 0;
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly pendiente = signal<EmpresaPublica | null>(null);
  protected readonly form = new FormGroup({
    codigo: new FormControl(this.contexto.codigoRecordado() ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,39}$/)],
    }),
  });

  constructor() {
    const route = inject(ActivatedRoute);
    if (route.snapshot.queryParamMap.has('error'))
      this.error.set('La empresa guardada ya no está disponible. Introduce un código válido.');
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const codigo = params.get('codigo');
      if (codigo !== null) {
        this.form.controls.codigo.setValue(codigo);
        this.buscar();
      }
    });
  }
  protected buscar(): void {
    this.form.controls.codigo.setValue(this.form.controls.codigo.value.trim().toLowerCase());
    this.error.set('');
    this.pendiente.set(null);
    const solicitud = ++this.solicitud;
    if (this.form.invalid) {
      if (!this.auth.estaAutenticado()) this.contexto.limpiar();
      this.form.markAllAsTouched();
      this.error.set('Introduce un código de empresa válido.');
      return;
    }
    this.cargando.set(true);
    this.contexto
      .resolver(this.form.controls.codigo.value)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (solicitud === this.solicitud) this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (empresa) => {
          if (solicitud !== this.solicitud) return;
          if (this.auth.estaAutenticado() && this.auth.usuarioActual()?.empresa_id !== empresa.id)
            this.pendiente.set(empresa);
          else this.entrar(empresa);
        },
        error: (error: unknown) => {
          if (solicitud !== this.solicitud) return;
          if (!this.auth.estaAutenticado()) this.contexto.limpiar();
          this.error.set(mensajeApi(error, 'No se encontró la empresa. Revisa su código.'));
        },
      });
  }
  protected confirmarCambio(): void {
    const empresa = this.pendiente();
    if (!empresa) return;
    this.cargando.set(true);
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
