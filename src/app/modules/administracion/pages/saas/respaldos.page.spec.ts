import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RespaldosPage } from './respaldos.page';
import { RespaldosEmpresaService } from '../../services/respaldos-empresa.service';
import { SaasService } from '../../services/saas.service';
import { EstadoPlanService } from '../../../../core/services/estado-plan.service';
import { AuthService } from '../../../autenticacion/services/auth.service';
const id = '12345678-1234-1234-1234-123456789abc';
const copia = {
  id,
  tipo: 'EMPRESA',
  origen: 'AUTOMATICO',
  empresa_id: 1,
  fecha: '2026-11-06T12:00:00Z',
  vence_en: '2026-12-06T12:00:00Z',
  bytes: 1024,
  estado: 'DISPONIBLE',
};
const politica = {
  politica: {
    manuales_semana: 1,
    retencion_dias: 7,
    frecuencia_dias: 7,
    horario_editable: false,
    manuales_habilitados: true,
  },
  programacion: {
    activa: true,
    fecha_inicio: '2026-11-06',
    hora_local: '18:30:00',
    zona_horaria: 'UTC',
  },
};
describe('Respaldos por ámbito', () => {
  let fixture: ComponentFixture<RespaldosPage>;
  const manual = signal(true);
  const limpiar = vi.fn(),
    navegar = vi.fn();
  const datos = signal({
    empresa_id: 1,
    operaciones_habilitadas: true,
    funciones: {
      horario_respaldo_configurable: { incluida: false },
      respaldos_automaticos: { incluida: true },
    },
    cupos: { respaldos_manuales_semana: { uso: 0, limite: 1, disponibles: 1, agotado: false } },
    limites: { retencion_respaldos_dias: 7, frecuencia_respaldo_dias: 7 },
  });
  const empresa = {
    listar: vi.fn(() => of([copia])),
    programacion: vi.fn(() => of(politica)),
    estadoEmpresa: vi.fn(() => of({ empresa_estado: 'SUSPENDIDA' })),
    crear: vi.fn(() => of(copia)),
    guardarProgramacion: vi.fn(() => of(politica.programacion)),
    previsualizar: vi.fn(() =>
      of({
        id,
        tipo: 'EMPRESA',
        empresa_id: 1,
        archivos: 0,
        confirmacion: 'RESTAURAR ' + id,
        destino: 'Empresa suspendida',
      }),
    ),
    restaurar: vi.fn(() => of({ estado: 'RESTAURADO' })),
    eliminar: vi.fn(() => of({})),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    manual.set(true);
    TestBed.configureTestingModule({
      imports: [RespaldosPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { ambito: 'EMPRESA' } } } },
        { provide: Router, useValue: { navigate: navegar } },
        { provide: AuthService, useValue: { limpiarSesion: limpiar } },
        {
          provide: EstadoPlanService,
          useValue: {
            capacidades: datos,
            habilita: () => manual(),
            motivo: () => 'No incluido en tu plan.',
            refrescar: () => of(datos()),
          },
        },
        { provide: RespaldosEmpresaService, useValue: empresa },
        { provide: SaasService, useValue: {} },
      ],
    });
    empresa.crear.mockImplementation(() => of(copia));
    fixture = TestBed.createComponent(RespaldosPage);
    fixture.detectChanges();
  });
  function boton(texto: string): HTMLButtonElement {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === texto,
    )!;
  }
  function input(texto: string) {
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(texto)!;
    return el;
  }
  it('sin creación mantiene consulta y no ofrece selector ni purga de plataforma', () => {
    manual.set(false);
    fixture.detectChanges();
    expect(boton('Crear copia cifrada').disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Automático');
    expect((fixture.nativeElement as HTMLElement).querySelector('#respaldo-empresa')).toBeNull();
    expect(empresa.listar).toHaveBeenCalledOnce();
  });
  it('envía hora fija al guardar y no permite editar la frecuencia', () => {
    boton('Guardar programación').click();
    fixture.detectChanges();
    expect(empresa.guardarProgramacion).toHaveBeenCalledWith({
      activa: true,
      fecha_inicio: '2026-11-06',
      hora_local: '02:00',
      zona_horaria: 'America/La_Paz',
    });
  });
  it('resultado incierto no reintenta creación y exige una actualización', () => {
    empresa.crear.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    boton('Crear copia cifrada').click();
    fixture.detectChanges();
    expect(empresa.crear).toHaveBeenCalledOnce();
    expect(boton('Crear copia cifrada').disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo confirmar el resultado',
    );
    boton('Actualizar').click();
    fixture.detectChanges();
    expect(boton('Crear copia cifrada').disabled).toBe(false);
    expect(empresa.crear).toHaveBeenCalledOnce();
  });
  it('frase exacta y restauración de empresa cierran sesión y piden ingreso', () => {
    boton('Previsualizar').click();
    fixture.detectChanges();
    const campo = input('#confirmar-restauracion');
    expect(campo.value).toBe('');
    expect(boton('Restaurar copia revisada').disabled).toBe(true);
    campo.value = 'RESTAURAR ' + id;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(boton('Restaurar copia revisada').disabled).toBe(false);
    boton('Restaurar copia revisada').click();
    fixture.detectChanges();
    expect(empresa.restaurar).toHaveBeenCalledWith(id, 'RESTAURAR ' + id);
    expect(limpiar).toHaveBeenCalledOnce();
    expect(navegar).toHaveBeenCalledWith(['/login'], {
      queryParams: { motivo: 'empresa_restaurada' },
    });
  });
});
