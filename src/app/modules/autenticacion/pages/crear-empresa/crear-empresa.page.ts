import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FocoService } from '../../../../core/services/foco.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { CUOTAS, FUNCIONES } from '../../../administracion/models/saas.models';
import {
  PlanRegistro,
  RegistroEmpresaService,
  ResultadoRegistroEmpresa,
} from '../../services/registro-empresa.service';

const texto = (min: number, max: number) =>
  new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.minLength(min),
      Validators.maxLength(max),
      Validators.pattern(/\S/),
    ],
  });
const passwordSeguro = (c: AbstractControl) =>
  /[a-z]/.test(c.value) &&
  /[A-Z]/.test(c.value) &&
  /\d/.test(c.value) &&
  /[^A-Za-z0-9]/.test(c.value)
    ? null
    : { passwordInseguro: true };

@Component({
  selector: 'app-crear-empresa',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './crear-empresa.page.html',
  styleUrls: ['../../../administracion/pages/saas/saas.css', './crear-empresa.page.css'],
})
export class CrearEmpresaPage {
  private readonly api = inject(RegistroEmpresaService);
  private readonly foco = inject(FocoService);
  private reintento: { huella: string; clave: string } | null = null;
  protected readonly planes = signal<PlanRegistro[]>([]);
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorPlanes = signal('');
  protected readonly error = signal('');
  protected readonly resultado = signal<ResultadoRegistroEmpresa | null>(null);
  protected readonly cuotas = CUOTAS;
  protected readonly funciones = FUNCIONES;
  protected readonly etiquetas = {
    usuarios: 'Cuentas',
    empleados: 'Empleados',
    productos: 'Productos',
    sucursales: 'Sucursales',
    recomendaciones: 'Recomendaciones',
    asistente: 'Asistente virtual',
    reportes: 'Reportes',
    vestidor: 'Probador virtual',
  };
  protected readonly form = new FormGroup(
    {
      empresa_nombre: texto(2, 150),
      empresa_codigo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{1,39}$/)],
      }),
      plan_id: new FormControl<number | null>(null, Validators.required),
      nombre: texto(1, 120),
      apellido: texto(1, 120),
      username: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(80),
          Validators.pattern(/^[a-zA-Z0-9_.]+$/),
        ],
      }),
      correo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(150)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          passwordSeguro,
        ],
      }),
      confirmar_password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(72)],
      }),
    },
    {
      validators: (c) =>
        c.get('password')?.value === c.get('confirmar_password')?.value
          ? null
          : { noCoinciden: true },
    },
  );

  constructor() {
    this.cargarPlanes();
  }

  protected cargarPlanes(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorPlanes.set('');
    this.api
      .planes()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (planes) => this.planes.set(planes),
        error: (e) => this.errorPlanes.set(mensajeApi(e, 'No se pudieron cargar los planes.')),
      });
  }

  protected enviar(): void {
    if (this.enviando()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid) {
      this.error.set('Revisa los datos obligatorios, el usuario y las contraseñas.');
      this.foco.llevar('registro-error');
      return;
    }
    const f = this.form.getRawValue();
    if (!f.plan_id || !this.planes().some((p) => p.id === f.plan_id)) {
      this.error.set('Selecciona un plan disponible.');
      return;
    }
    const datos = {
      ...f,
      plan_id: f.plan_id,
      empresa_nombre: f.empresa_nombre.trim(),
      empresa_codigo: f.empresa_codigo.trim().toLowerCase(),
      nombre: f.nombre.trim(),
      apellido: f.apellido.trim(),
      correo: f.correo.trim().toLowerCase(),
      username: f.username.trim().toLowerCase(),
    };
    const huella = JSON.stringify(datos);
    if (this.reintento?.huella !== huella) this.reintento = { huella, clave: crypto.randomUUID() };
    this.enviando.set(true);
    this.api
      .registrar(datos, this.reintento.clave)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.reintento = null;
          this.form.reset();
          this.foco.llevar('registro-listo');
        },
        error: (e: HttpErrorResponse) => {
          if (e.status >= 400 && e.status < 500 && ![408, 429].includes(e.status))
            this.reintento = null;
          this.error.set(mensajeApi(e, 'No se pudo enviar la solicitud. Puedes reintentar.'));
          this.foco.llevar('registro-error');
        },
      });
  }
}
