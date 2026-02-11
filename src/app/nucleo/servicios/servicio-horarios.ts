import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class ServicioHorarios {
  private readonly urlBase = `${API_BASE_URL}/horarios`;

  constructor(private http: HttpClient) {}

  dia(usuarioId: string, fecha?: string): Observable<any> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);

    return this.http.get<any>(`${this.urlBase}/dia/${usuarioId}`, { params });
  }

  vigente(usuarioId: string, fecha?: string): Observable<any[]> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);

    return this.http.get<any[]>(`${this.urlBase}/vigente/${usuarioId}`, { params });
  }

  historial(usuarioId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlBase}/historial/${usuarioId}`);
  }

  setSemana(usuarioId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.urlBase}/semana/${usuarioId}`, payload);
  }

  cerrarVigencia(usuarioId: string, fecha_fin: string): Observable<any> {
    return this.http.put<any>(`${this.urlBase}/cerrar/${usuarioId}`, { fecha_fin });
  }

  addExcepcion(usuarioId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.urlBase}/excepcion/${usuarioId}`, payload);
  }

  actualizarExcepcion(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.urlBase}/excepcion/${id}`, payload);
  }

  eliminarExcepcion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.urlBase}/excepcion/${id}`);
  }

  listarExcepciones(usuarioId: string, desde?: string, hasta?: string): Observable<any[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);

    return this.http.get<any[]>(`${this.urlBase}/excepciones/${usuarioId}`, { params });
  }
}