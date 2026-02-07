// src/app/nucleo/servicios/servicio-sedes.ts
import { API_BASE_URL } from '../config/api.config';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServicioSedes {

  // Ajusta la URL si tu backend usa otra base
  private urlApi = `${API_BASE_URL}/sedes`;

  constructor(private http: HttpClient) {}

  // 📌 Obtener todas las sedes (activas + inactivas)
  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.urlApi);
  }

  // 📌 Obtener solo sedes activas (para usar en el modal de usuario)
  listarActivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlApi}/activas`);
  }

  // 📌 Crear nueva sede
  crear(datos: any): Observable<any> {
    return this.http.post<any>(this.urlApi, datos);
  }

  // 📌 Actualizar sede existente
  actualizar(id: string, datos: any): Observable<any> {
    return this.http.put<any>(`${this.urlApi}/${id}`, datos);
  }

  // 📌 Desactivar / dar de baja lógica una sede
  desactivar(id: string): Observable<any> {
    // Ajusta la ruta si en tu backend se llama distinto
    return this.http.post<any>(`${this.urlApi}/${id}/desactivar`, {});
  }
}

