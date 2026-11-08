import { TestBed } from '@angular/core/testing';
import { SerieAnaliticaComponent } from './serie-analitica.component';

describe('Gráfico de comparación semanal', () => {
  it('ajusta la escala sin excluir puntos y deja la referencia como opción', () => {
    const fixture = TestBed.createComponent(SerieAnaliticaComponent);
    fixture.componentRef.setInput('datos', [
      {
        fecha_corte: '2026-01-01',
        unidades_reales: 430,
        unidades_predichas: 450,
        referencia_semana_anterior: 100,
      },
      {
        fecha_corte: '2026-01-08',
        unidades_reales: 480,
        unidades_predichas: 470,
        referencia_semana_anterior: 120,
      },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.minimo()).toBeGreaterThan(0);
    expect(fixture.componentInstance.minimo()).toBeLessThan(430);
    expect(fixture.componentInstance.maximo()).toBeGreaterThan(480);
    expect(fixture.nativeElement.querySelectorAll('path.area').length).toBe(2);
    fixture.nativeElement.querySelector('input').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('path.area').length).toBe(3);
    expect(fixture.componentInstance.minimo()).toBeLessThan(100);
  });
  it('no divide entre cero con una serie vacía o constante', () => {
    const fixture = TestBed.createComponent(SerieAnaliticaComponent);
    fixture.componentRef.setInput('datos', []);
    fixture.detectChanges();
    expect(fixture.componentInstance.maximo()).toBeGreaterThan(fixture.componentInstance.minimo());
    fixture.componentRef.setInput('datos', [
      {
        fecha_corte: '2026-01-01',
        unidades_reales: 0,
        unidades_predichas: 0,
        referencia_semana_anterior: 0,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.componentInstance
        .lineas()
        .every((l) => !l.puntos.includes('NaN') && !l.puntos.includes('Infinity')),
    ).toBe(true);
  });
});
