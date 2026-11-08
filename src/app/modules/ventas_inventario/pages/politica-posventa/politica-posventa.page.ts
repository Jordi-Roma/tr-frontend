import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { mensajeApi } from '../../../../core/services/error-api';
export interface PoliticaPosventa {
  version: number;
  cambios_habilitados: boolean;
  plazo_cambios: number | null;
  condiciones_cambios: string;
  devoluciones_habilitadas: boolean;
  plazo_devoluciones: number | null;
  condiciones_devoluciones: string;
}
@Component({
  selector: 'app-politica-posventa',
  imports: [ReactiveFormsModule],
  styleUrl: '../../../reservas/pages/mayorista/mayorista.css',
  template: ` <h1>Políticas de cambios y devoluciones</h1>
    <p>Los plazos cuentan desde la compra en tienda o la entrega a domicilio.</p>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (aviso()) {
      <p role="status">{{ aviso() }}</p>
    }
    <button type="button" (click)="cargar()" [disabled]="ocupado()">Actualizar política</button>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <fieldset [disabled]="ocupado() || !cargada()" style="border:0;margin:0;padding:0">
        <section>
          <h2>Cambios</h2>
          <label
            ><input type="checkbox" formControlName="cambios_habilitados" /> Habilitar política de
            cambios</label
          >
          <label for="plazo-cambios">Plazo de cambios (días)</label
          ><input
            id="plazo-cambios"
            type="number"
            min="1"
            max="365"
            formControlName="plazo_cambios"
          />
          <label for="condiciones-cambios">Condiciones de cambios</label
          ><textarea
            id="condiciones-cambios"
            formControlName="condiciones_cambios"
            maxlength="2000"
          ></textarea>
        </section>
        <section>
          <h2>Devoluciones</h2>
          <label
            ><input type="checkbox" formControlName="devoluciones_habilitadas" /> Habilitar
            devoluciones</label
          >
          <label for="plazo-devoluciones">Plazo de devoluciones (días)</label
          ><input
            id="plazo-devoluciones"
            type="number"
            min="1"
            max="365"
            formControlName="plazo_devoluciones"
          />
          <label for="condiciones-devoluciones">Condiciones de devoluciones</label
          ><textarea
            id="condiciones-devoluciones"
            formControlName="condiciones_devoluciones"
            maxlength="2000"
          ></textarea>
        </section>
        <button type="submit" [disabled]="ocupado() || form.invalid">Guardar política</button>
      </fieldset>
    </form>`,
})
export class PoliticaPosventaPage {
  private readonly http = inject(HttpClient);
  private readonly url = API_BASE_URL + '/api/v1/posventa/politica';
  private version = 0;
  protected readonly cargada = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly form = new FormGroup({
    cambios_habilitados: new FormControl(false, { nonNullable: true }),
    plazo_cambios: new FormControl<number | null>(null, [Validators.min(1), Validators.max(365)]),
    condiciones_cambios: new FormControl('', { nonNullable: true }),
    devoluciones_habilitadas: new FormControl(false, { nonNullable: true }),
    plazo_devoluciones: new FormControl<number | null>(null, [
      Validators.min(1),
      Validators.max(365),
    ]),
    condiciones_devoluciones: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    this.cargada.set(false);
    this.error.set('');
    this.aviso.set('');
    this.ocupado.set(true);
    this.http
      .get<PoliticaPosventa>(this.url)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (p) => {
          this.cargada.set(true);
          this.version = p.version;
          this.form.setValue({
            cambios_habilitados: p.cambios_habilitados,
            plazo_cambios: p.plazo_cambios,
            condiciones_cambios: p.condiciones_cambios,
            devoluciones_habilitadas: p.devoluciones_habilitadas,
            plazo_devoluciones: p.plazo_devoluciones,
            condiciones_devoluciones: p.condiciones_devoluciones,
          });
        },
        error: (e: unknown) => this.error.set(mensajeApi(e)),
      });
  }
  protected guardar(): void {
    if (this.ocupado() || !this.cargada() || this.form.invalid) return;
    this.ocupado.set(true);
    this.error.set('');
    this.http
      .put<PoliticaPosventa>(this.url, { ...this.form.getRawValue(), version: this.version })
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (p) => {
          this.version = p.version;
          this.aviso.set('Política guardada para tu empresa.');
        },
        error: (e: unknown) => this.error.set(mensajeApi(e)),
      });
  }
}
