import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

const MAYUSCULA_PATTERN = /[A-Z]/;
const MINUSCULA_PATTERN = /[a-z]/;
const NUMERO_PATTERN = /\d/;
const SIMBOLO_PATTERN = /[^A-Za-z0-9]/;

interface PasswordRequirement {
  texto: string;
  cumplido: boolean;
}

const passwordSeguro: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const valor = String(control.value ?? '');

  if (valor.length === 0) {
    return null;
  }

  if (
    valor.length >= 8 &&
    MAYUSCULA_PATTERN.test(valor) &&
    MINUSCULA_PATTERN.test(valor) &&
    NUMERO_PATTERN.test(valor) &&
    SIMBOLO_PATTERN.test(valor)
  ) {
    return null;
  }

  return { passwordInseguro: true };
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-recuperar-password-page',
  styleUrl: '../login/login.page.css',
  templateUrl: './recuperar-password.page.html',
})
export class RecuperarPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly codigoEnviado = signal(false);
  protected readonly cargandoSolicitud = signal(false);
  protected readonly cargandoConfirmacion = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');
  protected readonly passwordNuevoValor = signal('');
  protected readonly passwordNuevoVisible = signal(false);
  protected readonly confirmarPasswordNuevoVisible = signal(false);

  protected readonly passwordRequirements = computed<PasswordRequirement[]>(() => {
    const password = this.passwordNuevoValor();

    return [
      {
        texto: 'Minimo 8 caracteres',
        cumplido: password.length >= 8,
      },
      {
        texto: 'Una letra mayuscula',
        cumplido: MAYUSCULA_PATTERN.test(password),
      },
      {
        texto: 'Una letra minuscula',
        cumplido: MINUSCULA_PATTERN.test(password),
      },
      {
        texto: 'Un numero',
        cumplido: NUMERO_PATTERN.test(password),
      },
      {
        texto: 'Un simbolo',
        cumplido: SIMBOLO_PATTERN.test(password),
      },
    ];
  });

  protected readonly solicitudForm = new FormGroup({
    identificador: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly resetForm = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
    passwordNuevo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordSeguro],
    }),
    confirmarPasswordNuevo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected solicitarCodigo(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      return;
    }

    this.cargandoSolicitud.set(true);
    const { identificador } = this.solicitudForm.getRawValue();

    this.authService
      .solicitarPasswordReset({ identificador })
      .pipe(finalize(() => this.cargandoSolicitud.set(false)))
      .subscribe({
        next: (response) => {
          this.codigoEnviado.set(true);
          this.mensaje.set(response.mensaje);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected cambiarPassword(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.solicitudForm.invalid || this.resetForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      this.resetForm.markAllAsTouched();
      return;
    }

    const { identificador } = this.solicitudForm.getRawValue();
    const { codigo, passwordNuevo, confirmarPasswordNuevo } = this.resetForm.getRawValue();

    if (passwordNuevo !== confirmarPasswordNuevo) {
      this.error.set('Las contrasenas no coinciden.');
      return;
    }

    this.cargandoConfirmacion.set(true);
    this.authService
      .confirmarPasswordReset({
        identificador,
        codigo,
        password_nuevo: passwordNuevo,
        confirmar_password_nuevo: confirmarPasswordNuevo,
      })
      .pipe(finalize(() => this.cargandoConfirmacion.set(false)))
      .subscribe({
        next: (response) => {
          this.mensaje.set(response.mensaje);
          setTimeout(() => void this.router.navigateByUrl('/login'), 900);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected actualizarPasswordChecklist(): void {
    this.passwordNuevoValor.set(this.resetForm.controls.passwordNuevo.value);
  }

  protected alternarPasswordNuevoVisible(): void {
    this.passwordNuevoVisible.update((visible) => !visible);
  }

  protected alternarConfirmarPasswordNuevoVisible(): void {
    this.confirmarPasswordNuevoVisible.update((visible) => !visible);
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;
      if (typeof detail === 'string') return detail;
    }

    return 'No se pudo procesar la solicitud.';
  }
}
