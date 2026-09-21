import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `<main class="state-page"><p class="code">404</p><h1>Página no encontrada</h1><p>La dirección solicitada no existe o todavía no está disponible.</p><a routerLink="/inicio">Volver al inicio</a></main>`,
  styles: [`:host{display:grid;min-height:100dvh;place-items:center;background:#f7f3ef}.state-page{max-width:34rem;padding:3rem;text-align:center}.code{margin:0;color:#9a5b45;font-size:4rem;font-weight:900}h1{color:#2d2420}p{color:#665750}a{display:inline-block;margin-top:1rem;border-radius:999px;padding:.8rem 1.2rem;color:white;background:#2d2420;text-decoration:none}a:focus-visible{outline:3px solid #c98f6f;outline-offset:3px}`],
})
export class NotFoundPage {}
