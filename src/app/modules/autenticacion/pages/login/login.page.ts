import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TiendaStateService } from '../../../../core/services/tienda-state.service';
import { AuthService } from '../../services/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login-page',
  styleUrl: './login.page.css',
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tiendaState = inject(TiendaStateService);

  protected readonly cargando = signal(false);
  protected readonly mensajeError = signal('');
  protected readonly passwordVisible = signal(false);

  protected readonly loginForm = new FormGroup({
    identificador: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected iniciarSesion(): void {
    this.mensajeError.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const { identificador, password } = this.loginForm.getRawValue();
    this.tiendaState.vaciarCarrito();
    this.tiendaState.seleccionarSucursalCarrito(null);
    this.tiendaState.reemplazarFavoritos([]);

    this.authService
      .login({ identificador, password })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.obtenerRutaDestino());
        },
        error: () => {
          this.mensajeError.set('Credenciales incorrectas o usuario no disponible.');
        },
      });
  }

  protected alternarPasswordVisible(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  private obtenerRutaDestino(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const roles = this.authService.usuarioActual()?.roles ?? [];

    if (returnUrl !== null && this.rutaPermitidaParaRoles(returnUrl, roles)) {
      return returnUrl;
    }

    if (roles.includes('ADMINISTRADOR')) {
      return '/dashboard';
    }

    if (roles.includes('CAJERO')) {
      return '/venta-presencial';
    }

    if (roles.includes('ENCARGADO_SUCURSAL')) {
      return '/inventario';
    }

    if (roles.includes('PROVEEDOR')) {
      return '/panel-proveedor';
    }

    return '/inicio';
  }

  private rutaPermitidaParaRoles(returnUrl: string, roles: string[]): boolean {
    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return false;
    }

    if (roles.includes('CLIENTE')) {
      return true;
    }

    if (roles.includes('PROVEEDOR')) {
      return returnUrl === '/panel-proveedor' || returnUrl.startsWith('/panel-proveedor/');
    }

    return ![
      '/favoritos',
      '/carrito',
      '/reservas',
      '/para-ti',
    ].some((rutaCliente) => returnUrl === rutaCliente || returnUrl.startsWith(`${rutaCliente}/`));
  }
}
