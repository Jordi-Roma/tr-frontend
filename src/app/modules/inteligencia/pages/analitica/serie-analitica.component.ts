import { Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SerieAnalitica } from '../../models/analitica.models';

@Component({
  selector: 'app-serie-analitica',
  imports: [DecimalPipe],
  template: ` <label class="comparar"
      ><input type="checkbox" [checked]="referencia()" (change)="referencia.set(!referencia())" />
      Comparar con la semana anterior</label
    >
    <div class="areas">
      @for (serie of lineas(); track serie.nombre) {
        <figure [style.--serie-color]="serie.color">
          <figcaption>
            <span class="muestra" aria-hidden="true"></span><strong>{{ serie.nombre }}</strong>
          </figcaption>
          <svg
            viewBox="0 0 400 240"
            role="img"
            [attr.aria-label]="
              serie.nombre +
              ': unidades por semana. Escala ajustada y valores exactos disponibles debajo.'
            "
          >
            <defs>
              <linearGradient [attr.id]="serie.campo + '-relleno'" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" [attr.stop-color]="serie.color" stop-opacity=".95" />
                <stop offset="100%" [attr.stop-color]="serie.color" stop-opacity=".40" />
              </linearGradient>
            </defs>
            <rect x="48" y="20" width="330" height="170" rx="10" fill="#f3f5f6" />
            @for (marca of marcas(); track marca.valor) {
              <line x1="48" [attr.y1]="marca.y" x2="378" [attr.y2]="marca.y" stroke="#d6dee1" />
              <text x="40" [attr.y]="marca.y + 4" text-anchor="end">
                {{ marca.valor | number: '1.0-1' }}
              </text>
            }
            <path
              class="area"
              [attr.d]="serie.area"
              [attr.fill]="'url(#' + serie.campo + '-relleno)'"
            />
            <text x="48" y="216">{{ datos()[0]?.fecha_corte }}</text>
            <text x="378" y="216" text-anchor="end">
              {{ datos()[datos().length - 1]?.fecha_corte }}
            </text>
            <text x="48" y="235">Unidades por semana</text>
          </svg>
        </figure>
      }
    </div>
    <p class="escala">
      Misma escala para todas las áreas: {{ minimo() | number: '1.0-1' }} a
      {{ maximo() | number: '1.0-1' }} unidades (escala vertical ajustada). Cada tarjeta muestra una
      serie independiente.
    </p>
    <details>
      <summary>Ver los valores completos del gráfico</summary>
      <div class="tabla" tabindex="0" role="region" aria-label="Valores del gráfico semanal">
        <table>
          <caption>
            Totales semanales del filtro completo
          </caption>
          <thead>
            <tr>
              <th scope="col">Corte</th>
              <th scope="col">Reales</th>
              <th scope="col">Predichas</th>
              <th scope="col">Referencia</th>
            </tr>
          </thead>
          <tbody>
            @for (p of datos(); track p.fecha_corte) {
              <tr>
                <th scope="row">{{ p.fecha_corte }}</th>
                <td>{{ p.unidades_reales | number: '1.0-2' }}</td>
                <td>{{ p.unidades_predichas | number: '1.0-2' }}</td>
                <td>{{ p.referencia_semana_anterior | number: '1.0-2' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </details>`,
  styles: `
    .areas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
      gap: 1.2rem;
      margin: 1rem 0;
    }
    figure {
      min-width: 0;
      margin: 0;
      padding: 1rem;
      background: linear-gradient(145deg, #fff, #f3f6f7);
      border: 1px solid #d5dfe1;
      border-radius: 18px;
      box-shadow: 0 8px 24px #243b5010;
    }
    figcaption {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1rem;
      color: #253a43;
    }
    .muestra {
      width: 18px;
      height: 18px;
      display: inline-block;
      background: var(--serie-color);
      border-radius: 6px;
      box-shadow: inset 0 2px 3px #ffffff70;
    }
    svg text {
      fill: #32464c;
      font-size: 12px;
    }
    .escala {
      font-size: 0.9rem;
      line-height: 1.6;
      color: #40515a;
    }
    .comparar {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      min-height: 44px;
    }
    figure {
      margin: 1rem 0;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
      font: 13px sans-serif;
    }
    figcaption {
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .tabla {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td,
    th {
      padding: 0.6rem;
      text-align: left;
      border-bottom: 1px solid #b6bdad;
    }
    summary {
      cursor: pointer;
      padding: 0.7rem 0;
    }
    :focus-visible {
      outline: 3px solid #245a81;
      outline-offset: 3px;
    }
  `,
})
export class SerieAnaliticaComponent {
  readonly datos = input.required<SerieAnalitica[]>();
  readonly referencia = signal(false);
  readonly valores = computed(() =>
    this.datos().flatMap((p) => [
      p.unidades_reales,
      p.unidades_predichas,
      ...(this.referencia() ? [p.referencia_semana_anterior] : []),
    ]),
  );
  readonly rango = computed(() => {
    const valores = this.valores();
    const min = valores.length ? Math.min(...valores) : 0;
    const max = valores.length ? Math.max(...valores) : 1;
    const margen = Math.max((max - min) * 0.2, max * 0.02, 1);
    return { min: Math.max(0, Math.floor(min - margen)), max: Math.ceil(max + margen) };
  });
  readonly minimo = computed(() => this.rango().min);
  readonly maximo = computed(() => this.rango().max);
  readonly marcas = computed(() =>
    Array.from({ length: 5 }, (_, i) => ({
      valor: this.maximo() - ((this.maximo() - this.minimo()) * i) / 4,
      y: 20 + i * 42.5,
    })),
  );
  readonly lineas = computed(() =>
    [
      {
        nombre: 'Ventas observadas',
        campo: 'unidades_reales' as const,
        color: '#344c2b',
        guiones: '',
      },
      {
        nombre: 'Predicción del modelo',
        campo: 'unidades_predichas' as const,
        color: '#245a81',
        guiones: '10 5',
      },
      {
        nombre: 'Semana anterior',
        campo: 'referencia_semana_anterior' as const,
        color: '#754565',
        guiones: '2 5',
      },
    ]
      .filter((l) => this.referencia() || l.nombre !== 'Semana anterior')
      .map((l) => {
        const puntos = this.datos().map((p, i) => ({
          x: this.datos().length === 1 ? 213 : 48 + (i * 330) / (this.datos().length - 1),
          y: 190 - ((p[l.campo] - this.minimo()) * 170) / (this.maximo() - this.minimo()),
        }));
        const area =
          puntos.length === 1
            ? `M ${puntos[0].x - 20} 190 L ${puntos[0].x - 20} ${puntos[0].y} L ${puntos[0].x + 20} ${puntos[0].y} L ${puntos[0].x + 20} 190 Z`
            : puntos.length
              ? `M ${puntos[0].x} 190 ${puntos.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${puntos[puntos.length - 1].x} 190 Z`
              : '';
        return { ...l, area, puntos: puntos.map((p) => `${p.x},${p.y}`).join(' ') };
      }),
  );
}
