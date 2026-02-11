import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class ServicioHorarios {
  // Base: /horarios
  private readonly urlBase = `${API_BASE_URL}/horarios`;

  constructor(private http: HttpClient) {}

  /**
   * Horario del día (para una fecha específica, incluye excepción si existe).
   * Backend: GET /horarios/dia/:usuarioId?fecha=YYYY-MM-DD
   */
  dia(usuarioId: string, fecha?: string): Observable<any> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);

    return this.http.get<any>(`${this.urlBase}/dia/${usuarioId}`, { params });
  }

  /**
   * Horarios vigentes de un usuario en una fecha (opcional).
   * Backend: GET /horarios/vigente/:usuarioId?fecha=YYYY-MM-DD
   */
  vigente(usuarioId: string, fecha?: string): Observable<any[]> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);

    return this.http.get<any[]>(`${this.urlBase}/vigente/${usuarioId}`, { params });
  }

  /**
   * Historial completo de horarios del usuario.
   * Backend: GET /horarios/historial/:usuarioId
   */
  historial(usuarioId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlBase}/historial/${usuarioId}`);
  }

  /**
   * Define una nueva semana (7 días) de horario, cerrando vigencias anteriores.
   * Backend: POST /horarios/semana/:usuarioId
   */
  setSemana(usuarioId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.urlBase}/semana/${usuarioId}`, payload);
  }

  /**
   * Cierra el horario vigente de un usuario a una fecha dada.
   * Backend: PUT /horarios/cerrar/:usuarioId
   * body: { fecha_fin: 'YYYY-MM-DD' }
   */
  cerrarVigencia(usuarioId: string, fecha_fin: string): Observable<any> {
    return this.http.put<any>(`${this.urlBase}/cerrar/${usuarioId}`, { fecha_fin });
  }

  /**
   * Agregar excepción de horario para una fecha puntual.
   * Backend: POST /horarios/excepcion/:usuarioId
   */
  addExcepcion(usuarioId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.urlBase}/excepcion/${usuarioId}`, payload);
  }

  /**
   * Eliminar excepción por id.
   * Backend: DELETE /horarios/excepcion/:id
   */
  eliminarExcepcion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.urlBase}/excepcion/${id}`);
  }

  /**
   * ✅ LISTAR EXCEPCIONES (panel derecho)
   * Backend: GET /horarios/excepciones/:usuarioId
   * Opcional: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
   *
   * NOTA:
   * - En el componente, llámalo con `desde = hoy` para que se vean siempre
   *   las vigentes "desde hoy en adelante".
   */
  listarExcepciones(usuarioId: string, desde?: string, hasta?: string): Observable<any[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);

    return this.http.get<any[]>(`${this.urlBase}/excepciones/${usuarioId}`, { params });
  }
}