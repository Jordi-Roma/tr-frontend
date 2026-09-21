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
import { finalize } from 'rxjs';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';
import { DireccionResponse, PerfilResponse } from '../../models/perfil.models';
import { PerfilService } from '../../services/perfil.service';
import { CiudadResponse } from '../../../administracion/models/ciudad-sucursal.models';
import { CiudadSucursalService } from '../../../administracion/services/ciudad-sucursal.service';

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
  const nuevo = control.get('passwordNuevo')?.value;
  const confirmar = control.get('confirmarPasswordNuevo')?.value;

  if (nuevo === confirmar) {
    return null;
  }

  return { passwordsNoCoinciden: true };
};

@Component({
  imports: [ReactiveFormsModule, AppDrawerComponent],
  selector: 'app-perfil-page',
  styleUrl: './perfil.page.css',
  templateUrl: './perfil.page.html',
})
export class PerfilPage {
  private readonly perfilService = inject(PerfilService);
  private readonly ciudadSucursalService = inject(CiudadSucursalService);

  protected readonly perfil = signal<PerfilResponse | null>(null);
  protected readonly direcciones = signal<DireccionResponse[]>([]);
  protected readonly ciudades = signal<CiudadResponse[]>([]);
  protected readonly cargandoPerfil = signal(false);
  protected readonly guardandoPerfil = signal(false);
  protected readonly cambiandoPassword = signal(false);
  protected readonly guardandoDireccion = signal(false);
  protected readonly direccionEditandoId = signal<number | null>(null);
  protected readonly perfilFormAbierto = signal(false);
  protected readonly passwordFormAbierto = signal(false);
  protected readonly direccionFormAbierto = signal(false);
  protected readonly mensajePerfil = signal('');
  protected readonly mensajePassword = signal('');
  protected readonly mensajeDireccion = signal('');
  protected readonly errorPerfil = signal('');
  protected readonly errorPassword = signal('');
  protected readonly errorDireccion = signal('');
  protected readonly passwordNuevoValor = signal('');

  protected readonly passwordRequirements = computed<PasswordRequirement[]>(() => {
    const password = this.passwordNuevoValor();

    return [
      {
        texto: 'Mínimo 8 caracteres',
        cumplido: password.length >= 8,
      },
      {
        texto: 'Una letra mayúscula',
        cumplido: MAYUSCULA_PATTERN.test(password),
      },
      {
        texto: 'Una letra minúscula',
        cumplido: MINUSCULA_PATTERN.test(password),
      },
      {
        texto: 'Un número',
        cumplido: NUMERO_PATTERN.test(password),
      },
      {
        texto: 'Un símbolo',
        cumplido: SIMBOLO_PATTERN.test(password),
      },
    ];
  });

  protected readonly perfilForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    apellido: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    telefono: new FormControl<string | null>(null),
  });

  protected readonly passwordForm = new FormGroup(
    {
      passwordActual: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      passwordNuevo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordSeguro],
      }),
      confirmarPasswordNuevo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsCoinciden }
  );

  protected readonly direccionForm = new FormGroup({
    ciudadId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    direccion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    referencia: new FormControl<string | null>(null),
    esPrincipal: new FormControl(false, {
      nonNullable: true,
    }),
  });

  constructor() {
    this.cargarPerfil();
    this.cargarDirecciones();
    this.cargarCiudades();
  }

  protected nombreCiudad(ciudadId: number): string {
    return this.ciudades().find((ciudad) => ciudad.id === ciudadId)?.nombre ?? `Ciudad ${ciudadId}`;
  }

  protected abrirPerfilForm(): void {
    const perfil = this.perfil();
    if (perfil) {
      this.cargarFormularioPerfil(perfil);
    }
    this.limpiarMensajesPerfil();
    this.perfilFormAbierto.set(true);
  }

  protected cerrarPerfilForm(): void {
    this.perfilFormAbierto.set(false);
  }

  protected abrirPasswordForm(): void {
    this.passwordForm.reset();
    this.passwordNuevoValor.set('');
    this.mensajePassword.set('');
    this.errorPassword.set('');
    this.passwordFormAbierto.set(true);
  }

  protected cerrarPasswordForm(): void {
    this.passwordForm.reset();
    this.passwordNuevoValor.set('');
    this.passwordFormAbierto.set(false);
  }

  protected abrirNuevaDireccion(): void {
    this.cancelarEdicionDireccion();
    this.mensajeDireccion.set('');
    this.errorDireccion.set('');
    this.direccionFormAbierto.set(true);
  }

  protected cerrarDireccionForm(): void {
    this.cancelarEdicionDireccion();
    this.direccionFormAbierto.set(false);
  }

  protected guardarPerfil(): void {
    this.limpiarMensajesPerfil();

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    this.guardandoPerfil.set(true);
    const { nombre, apellido, telefono } = this.perfilForm.getRawValue();

    this.perfilService
      .actualizarPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: this.limpiarTextoOpcional(telefono),
      })
      .pipe(finalize(() => this.guardandoPerfil.set(false)))
      .subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.cargarFormularioPerfil(perfil);
          this.mensajePerfil.set('Perfil actualizado correctamente.');
          this.perfilFormAbierto.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorPerfil.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected cambiarPassword(): void {
    this.mensajePassword.set('');
    this.errorPassword.set('');

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.cambiandoPassword.set(true);
    const { passwordActual, passwordNuevo, confirmarPasswordNuevo } =
      this.passwordForm.getRawValue();

    this.perfilService
      .cambiarPassword({
        password_actual: passwordActual,
        password_nuevo: passwordNuevo,
        confirmar_password_nuevo: confirmarPasswordNuevo,
      })
      .pipe(finalize(() => this.cambiandoPassword.set(false)))
      .subscribe({
        next: (response) => {
          this.passwordForm.reset();
          this.passwordNuevoValor.set('');
          this.mensajePassword.set(response.mensaje);
          this.passwordFormAbierto.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorPassword.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected guardarDireccion(): void {
    this.mensajeDireccion.set('');
    this.errorDireccion.set('');

    if (this.direccionForm.invalid) {
      this.direccionForm.markAllAsTouched();
      return;
    }

    const { ciudadId, direccion, referencia, esPrincipal } =
      this.direccionForm.getRawValue();

    if (ciudadId === null) {
      this.errorDireccion.set('La ciudad es obligatoria.');
      return;
    }

    this.guardandoDireccion.set(true);
    const request = {
      ciudad_id: ciudadId,
      direccion: direccion.trim(),
      referencia: this.limpiarTextoOpcional(referencia),
      es_principal: esPrincipal,
    };
    const direccionId = this.direccionEditandoId();
    const operacion =
      direccionId === null
        ? this.perfilService.crearDireccion(request)
        : this.perfilService.actualizarDireccion(direccionId, request);

    operacion.pipe(finalize(() => this.guardandoDireccion.set(false))).subscribe({
      next: () => {
        this.direccionForm.reset({
          ciudadId: null,
          direccion: '',
          referencia: null,
          esPrincipal: false,
        });
        this.direccionEditandoId.set(null);
        this.mensajeDireccion.set('Direccion guardada correctamente.');
        this.direccionFormAbierto.set(false);
        this.cargarDirecciones();
      },
      error: (error: HttpErrorResponse) => {
        this.errorDireccion.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected editarDireccion(direccion: DireccionResponse): void {
    this.direccionEditandoId.set(direccion.id);
    this.direccionForm.setValue({
      ciudadId: direccion.ciudad_id,
      direccion: direccion.direccion,
      referencia: direccion.referencia,
      esPrincipal: direccion.es_principal,
    });
    this.direccionFormAbierto.set(true);
    this.mensajeDireccion.set('');
    this.errorDireccion.set('');
  }

  protected cancelarEdicionDireccion(): void {
    this.direccionEditandoId.set(null);
    this.direccionForm.reset({
      ciudadId: null,
      direccion: '',
      referencia: null,
      esPrincipal: false,
    });
  }

  protected desactivarDireccion(direccionId: number): void {
    this.mensajeDireccion.set('');
    this.errorDireccion.set('');
    this.guardandoDireccion.set(true);

    this.perfilService
      .desactivarDireccion(direccionId)
      .pipe(finalize(() => this.guardandoDireccion.set(false)))
      .subscribe({
        next: (response) => {
          this.mensajeDireccion.set(response.mensaje);
          this.cargarDirecciones();
        },
        error: (error: HttpErrorResponse) => {
          this.errorDireccion.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected passwordsNoCoinciden(): boolean {
    return (
      this.passwordForm.hasError('passwordsNoCoinciden') &&
      this.passwordForm.controls.confirmarPasswordNuevo.touched
    );
  }

  protected actualizarPasswordChecklist(): void {
    this.passwordNuevoValor.set(this.passwordForm.controls.passwordNuevo.value);
  }

  private cargarPerfil(): void {
    this.cargandoPerfil.set(true);
    this.perfilService
      .obtenerPerfil()
      .pipe(finalize(() => this.cargandoPerfil.set(false)))
      .subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.cargarFormularioPerfil(perfil);
        },
        error: (error: HttpErrorResponse) => {
          this.errorPerfil.set(this.obtenerMensajeError(error));
        },
      });
  }

  private cargarDirecciones(): void {
    this.perfilService.listarDirecciones().subscribe({
      next: (response) => {
        this.direcciones.set(response.direcciones);
      },
      error: (error: HttpErrorResponse) => {
        this.errorDireccion.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarCiudades(): void {
    this.ciudadSucursalService.listarCiudades().subscribe({
      next: (ciudades) => this.ciudades.set(ciudades.filter((ciudad) => ciudad.activo)),
      error: (error: HttpErrorResponse) => this.errorDireccion.set(this.obtenerMensajeError(error)),
    });
  }

  private cargarFormularioPerfil(perfil: PerfilResponse): void {
    this.perfilForm.setValue({
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      telefono: perfil.telefono,
    });
  }

  private limpiarMensajesPerfil(): void {
    this.mensajePerfil.set('');
    this.errorPerfil.set('');
  }

  private limpiarTextoOpcional(valor: string | null): string | null {
    if (valor === null) {
      return null;
    }

    const limpio = valor.trim();
    return limpio === '' ? null : limpio;
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const detail = this.obtenerDetail(error.error);

    if (detail !== '') {
      return detail;
    }

    return 'No se pudo completar la operación. Intenta nuevamente.';
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
