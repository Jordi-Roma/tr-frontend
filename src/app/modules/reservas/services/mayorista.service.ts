import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api.config';
import { CarritoResponse } from '../models/carrito.models';
export type TipoPaquete = 'CUARTA'|'MEDIA'|'DOCENA';
export interface ConfigMayorista { tipo:TipoPaquete; descuento:string|number|null; habilitado:boolean; version:number; }
export interface OpcionMayorista extends ConfigMayorista { cantidad:number; disponible:boolean; motivo:string|null; }
export interface VarianteMayorista { producto_variante_id:number; talla:string; color:string; stock:number; precio_base:string|number|null; }
export interface OpcionesMayorista { producto_id:number; sucursal_id:number; variantes:VarianteMayorista[]; paquetes:OpcionMayorista[]; }
export interface AgregarPaquete { clave_operacion:string; producto_id:number; sucursal_id:number; tipo:TipoPaquete; seleccion:{producto_variante_id:number;cantidad:number}[]; }
@Injectable({providedIn:'root'})
export class MayoristaService {
  private readonly http=inject(HttpClient);
  private readonly url=API_BASE_URL+'/api/v1/mayorista';
  opciones(pid:number,sid:number){return this.http.get<OpcionesMayorista>(`${this.url}/productos/${pid}`,{params:{sucursal_id:sid}});}
  configuracion(pid:number){return this.http.get<ConfigMayorista[]>(`${this.url}/productos/${pid}/configuracion`);}
  guardar(pid:number,cfg:ConfigMayorista){return this.http.put<ConfigMayorista[]>(`${this.url}/productos/${pid}/configuracion`,cfg);}
  agregar(body:AgregarPaquete){return this.http.post<CarritoResponse>(this.url+'/paquetes',body);}
}
