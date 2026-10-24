import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';
import { mensajeApi } from '../../../../core/services/error-api';
import {
  BitacoraDetalle,
  BitacoraFiltros,
  BitacoraItem,
  BitacoraListResponse,
} from '../../models/bitacora.models';
import { BitacoraService } from '../../services/bitacora.service';

@Component({
  selector: 'app-bitacora-page',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, AppDrawerComponent],
  templateUrl: './bitacora.page.html',
  styleUrl: '../acceso-admin.css',
})
export class BitacoraPage implements OnDestroy {
  private readonly api = inject(BitacoraService);
  protected readonly plataforma = inject(ActivatedRoute).snapshot.data['plataforma'] === true;
  protected readonly datos = signal<BitacoraListResponse>({
    registros: [],
    total: 0,
    pagina: 1,
    por_pagina: 25,
    total_paginas: 1,
  });
  protected readonly opciones = signal<{
    modulos: string[];
    actores: { id: number; nombre: string }[];
  }>({ modulos: [], actores: [] });
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly detalle = signal<BitacoraDetalle | null>(null);
  protected readonly detalleAbierto = signal(false);
  protected readonly cargandoDetalle = signal(false);
  protected readonly errorDetalle = signal('');
  protected readonly filtros = new FormGroup({
    accion: new FormControl('', { nonNullable: true }),
    modulo: new FormControl('', { nonNullable: true }),
    resultado: new FormControl('', { nonNullable: true }),
    usuarioId: new FormControl<number | null>(null),
    fechaDesde: new FormControl('', { nonNullable: true }),
    fechaHasta: new FormControl('', { nonNullable: true }),
  });
  protected readonly tamano = new FormControl(25, { nonNullable: true });
  private carga?: Subscription;
  private cargaDetalle?: Subscription;
  constructor() {
    this.api
      .opciones(this.plataforma)
      .subscribe({
        next: (r) => this.opciones.set(r),
        error: (e) => this.error.set(mensajeApi(e)),
      });
    this.cargar();
  }
  ngOnDestroy() {
    this.carga?.unsubscribe();
    this.cargaDetalle?.unsubscribe();
  }
  protected cargar(n = 1) {
    const v = this.filtros.getRawValue();
    this.error.set('');
    if (v.fechaDesde && v.fechaHasta && v.fechaDesde > v.fechaHasta) {
      this.error.set('La fecha inicial no puede superar la final.');
      return;
    }
    this.carga?.unsubscribe();
    this.cargando.set(true);
    const f: BitacoraFiltros = {
      accion: v.accion,
      modulo: v.modulo,
      resultado: v.resultado,
      usuario_id: v.usuarioId,
      fecha_desde: v.fechaDesde,
      fecha_hasta: v.fechaHasta,
      pagina: n,
      por_pagina: this.tamano.value,
    };
    this.carga = this.api
      .listarBitacora(f, this.plataforma)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (r) => this.datos.set(r), error: (e) => this.error.set(mensajeApi(e)) });
  }
  protected limpiar() {
    this.filtros.reset();
    this.cargar();
  }
  protected abrir(item: BitacoraItem) {
    this.cargaDetalle?.unsubscribe();
    this.detalle.set(null);
    this.errorDetalle.set('');
    this.detalleAbierto.set(true);
    this.cargandoDetalle.set(true);
    this.cargaDetalle = this.api
      .obtenerRegistro(item.id, this.plataforma)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: (r) => this.detalle.set(r),
        error: (e) => this.errorDetalle.set(mensajeApi(e)),
      });
  }
  protected cerrar() {
    this.cargaDetalle?.unsubscribe();
    this.detalleAbierto.set(false);
    this.detalle.set(null);
    this.errorDetalle.set('');
  }
}
