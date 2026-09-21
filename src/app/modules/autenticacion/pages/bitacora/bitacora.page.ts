import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  BitacoraDetalle,
  BitacoraFiltros,
  BitacoraItem,
} from '../../models/bitacora.models';
import { BitacoraService } from '../../services/bitacora.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-bitacora-page',
  styleUrl: './bitacora.page.css',
  templateUrl: './bitacora.page.html',
})
export class BitacoraPage implements OnInit {
  private readonly bitacoraService = inject(BitacoraService);

  protected readonly registros = signal<BitacoraItem[]>([]);
  protected readonly totalRegistros = signal(0);
  protected readonly paginaActual = signal(1);
  protected readonly porPagina = signal(25);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  protected readonly registroSeleccionado = signal<BitacoraDetalle | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly modalDetalleAbierto = signal(false);

  protected readonly modulosDisponibles = [
    { valor: '', etiqueta: 'Todos los módulos' },
    { valor: 'AUTENTICACION', etiqueta: 'Autenticación' },
    { valor: 'USUARIOS', etiqueta: 'Usuarios' },
    { valor: 'ROLES_PERMISOS', etiqueta: 'Roles y Permisos' },
    { valor: 'PERFIL', etiqueta: 'Perfil' },
    { valor: 'CIUDADES_SUCURSALES', etiqueta: 'Ciudades y Sucursales' },
    { valor: 'EMPLEADOS', etiqueta: 'Empleados' },
    { valor: 'PROVEEDORES', etiqueta: 'Proveedores' },
    { valor: 'CATALOGO', etiqueta: 'Catálogo (Cat/Tallas/Colores/Marcas)' },
    { valor: 'TEMPORADAS', etiqueta: 'Temporadas' },
    { valor: 'COLECCIONES', etiqueta: 'Colecciones' },
    { valor: 'PRODUCTOS', etiqueta: 'Productos' },
    { valor: 'VARIANTES', etiqueta: 'Variantes y Precios' },
  ];

  protected readonly resultadosDisponibles = [
    { valor: '', etiqueta: 'Todos los resultados' },
    { valor: 'EXITOSO', etiqueta: 'Exitoso' },
    { valor: 'FALLIDO', etiqueta: 'Fallido' },
    { valor: 'BLOQUEADO', etiqueta: 'Bloqueado' },
  ];

  protected readonly filtrosForm = new FormGroup({
    accion: new FormControl('', { nonNullable: true }),
    modulo: new FormControl('', { nonNullable: true }),
    resultado: new FormControl('', { nonNullable: true }),
    usuarioId: new FormControl<number | null>(null),
    fechaDesde: new FormControl('', { nonNullable: true }),
    fechaHasta: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.cargarBitacora(1);
  }

  protected cargarBitacora(pagina: number = 1): void {
    this.cargando.set(true);
    this.error.set('');

    const val = this.filtrosForm.getRawValue();
    const filtros: BitacoraFiltros = {
      pagina,
      por_pagina: this.porPagina(),
      accion: val.accion.trim() || undefined,
      modulo: val.modulo || undefined,
      resultado: val.resultado || undefined,
      usuario_id: val.usuarioId ?? undefined,
      fecha_desde: val.fechaDesde || undefined,
      fecha_hasta: val.fechaHasta || undefined,
    };

    this.bitacoraService
      .listarBitacora(filtros)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => {
          this.registros.set(res.registros);
          this.totalRegistros.set(res.total);
          this.paginaActual.set(res.pagina);
          this.porPagina.set(res.por_pagina);
          this.totalPaginas.set(res.total_paginas);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            err.error?.detail || 'No se pudo obtener la bitácora del sistema.'
          );
        },
      });
  }

  protected aplicarFiltros(): void {
    this.cargarBitacora(1);
  }

  protected limpiarFiltros(): void {
    this.filtrosForm.reset({
      accion: '',
      modulo: '',
      resultado: '',
      usuarioId: null,
      fechaDesde: '',
      fechaHasta: '',
    });
    this.cargarBitacora(1);
  }

  protected cambiarPorPagina(nuevoPorPagina: number): void {
    this.porPagina.set(nuevoPorPagina);
    this.cargarBitacora(1);
  }

  protected irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas() && pagina !== this.paginaActual()) {
      this.cargarBitacora(pagina);
    }
  }

  protected verDetalle(item: BitacoraItem): void {
    this.modalDetalleAbierto.set(true);
    this.cargandoDetalle.set(true);
    this.registroSeleccionado.set(null);

    this.bitacoraService
      .obtenerRegistro(item.id)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: (detalle) => {
          this.registroSeleccionado.set(detalle);
        },
        error: () => {
          // Fallback a la info básica del item si falla el endpoint específico
          this.registroSeleccionado.set({
            ...item,
            usuario_correo: null,
          });
        },
      });
  }

  protected cerrarModal(): void {
    this.modalDetalleAbierto.set(false);
    this.registroSeleccionado.set(null);
  }

  protected obtenerBadgeClase(resultado: string): string {
    const res = resultado.toUpperCase();
    if (res === 'EXITOSO') return 'badge-exitoso';
    if (res === 'FALLIDO') return 'badge-fallido';
    if (res === 'BLOQUEADO') return 'badge-bloqueado';
    return 'badge-info';
  }

  protected formatearFecha(isoDate: string | null): string {
    if (!isoDate) return '-';
    try {
      const fecha = new Date(isoDate);
      return fecha.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoDate;
    }
  }
}
