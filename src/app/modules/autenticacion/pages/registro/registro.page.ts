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

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
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

const passwordsCoinciden: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmarPassword = control.get('confirmarPassword')?.value;

  if (password === confirmarPassword) {
    return null;
  }

  return { passwordsNoCoinciden: true };
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro-page',
  styleUrl: './registro.page.css',
  templateUrl: './registro.page.html',
})
export class RegistroPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly mensajeError = signal('');
  protected readonly mensajeExito = signal('');
  protected readonly passwordValor = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly confirmarPasswordVisible = signal(false);

  protected readonly passwordRequirements = computed<PasswordRequirement[]>(() => {
    const password = this.passwordValor();

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

  protected readonly registroForm = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      apellido: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      username: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(4),
          Validators.pattern(USERNAME_PATTERN),
        ],
      }),
      correo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordSeguro],
      }),
      confirmarPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsCoinciden }
  );

  protected registrar(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.normalizarUsername();

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const { nombre, apellido, username, correo, password } =
      this.registroForm.getRawValue();

    this.authService
      .registrar({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        username: username.trim().toLowerCase(),
        correo: correo.trim(),
        password,
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => {
          this.registroForm.reset();
          this.passwordValor.set('');
          this.mensajeExito.set(
            'Registro realizado correctamente. Ya puedes iniciar sesion.'
          );
          setTimeout(() => {
            void this.router.navigateByUrl('/login');
          }, 900);
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected usernameTieneEspacios(): boolean {
    return /\s/.test(this.registroForm.controls.username.value);
  }

  protected actualizarPasswordChecklist(): void {
    this.passwordValor.set(this.registroForm.controls.password.value);
  }

  protected alternarPasswordVisible(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected alternarConfirmarPasswordVisible(): void {
    this.confirmarPasswordVisible.update((visible) => !visible);
  }

  protected passwordsNoCoinciden(): boolean {
    return (
      this.registroForm.hasError('passwordsNoCoinciden') &&
      this.registroForm.controls.confirmarPassword.touched
    );
  }

  private normalizarUsername(): void {
    const username = this.registroForm.controls.username.value.trim().toLowerCase();
    this.registroForm.controls.username.setValue(username);
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const detail = this.obtenerDetail(error.error);

    if (detail !== '') {
      return detail;
    }

    return 'No se pudo registrar el usuario. Verifica los datos ingresados.';
  }

  private obtenerDetail(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'detail' in error &&
      typeof error.detail === 'string'
    ) {
      return error.detail;
    }

    return '';
  }
}
