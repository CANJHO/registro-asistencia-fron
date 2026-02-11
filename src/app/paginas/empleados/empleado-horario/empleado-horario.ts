import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { ServicioHorarios } from '../../../nucleo/servicios/servicio-horarios';
import { ServicioEmpleados } from '../../../nucleo/servicios/servicio-empleados';

interface DiaHorarioUI {
  dia: number;
  nombreDia: string;
  es_descanso: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  hora_inicio_2: string | null;
  hora_fin_2: string | null;
  tolerancia_min: number;
}

@Component({
  selector: 'app-empleado-horario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleado-horario.html',
  styleUrls: ['./empleado-horario.scss'],
})
export class EmpleadoHorarioComponent implements OnInit {

  empleadoId!: string;
  empleadoResumen: any | null = null;

  cargando = false;
  guardando = false;
  errorCarga = false;

  // Fecha vigencia
  fechaReferencia = this.todayKey();

  // Semana
  semana: DiaHorarioUI[] = [];

  readonly diasSemana = [
    { dia: 1, nombre: 'Lunes' },
    { dia: 2, nombre: 'Martes' },
    { dia: 3, nombre: 'Miércoles' },
    { dia: 4, nombre: 'Jueves' },
    { dia: 5, nombre: 'Viernes' },
    { dia: 6, nombre: 'Sábado' },
    { dia: 7, nombre: 'Domingo' },
  ];

  // ==========================
  // EXCEPCIONES (UI)
  // ==========================
  exFecha: string = this.todayKey();
  exTipo: string = 'Horario especial';
  exEsLaborable: boolean = true;
  exHoraInicio: string | null = null;
  exHoraFin: string | null = null;
  exObservacion: string = '';

  exCargandoDia = false;
  exGuardando = false;
  exActual: any | null = null;

  exListaCargando = false;
  exLista: any[] = [];

  constructor(
    private ruta: ActivatedRoute,
    private router: Router,
    private servicioHorarios: ServicioHorarios,
    private servicioEmpleados: ServicioEmpleados,
  ) {}

  private todayKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatFechaUI(fecha?: string | null): string {
    if (!fecha || typeof fecha !== 'string') return '';
    const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return fecha; // si viniera raro, al menos muestra algo
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/panel/empleados']);
      return;
    }

    this.empleadoId = id;

    this.inicializarSemana();
    this.cargarResumenEmpleado();
    this.cargarHorarioVigente();

    // Excepciones: inicial
    this.cargarExcepcionDelDia();

    // Panel derecho: desde HOY
    this.cargarListaExcepciones();
  }

  private inicializarSemana() {
    this.semana = this.diasSemana.map(d => ({
      dia: d.dia,
      nombreDia: d.nombre,
      es_descanso: true,
      hora_inicio: null,
      hora_fin: null,
      hora_inicio_2: null,
      hora_fin_2: null,
      tolerancia_min: 15,
    }));
  }

  private cargarResumenEmpleado() {
    this.servicioEmpleados.obtenerFicha(this.empleadoId).subscribe({
      next: (emp) => (this.empleadoResumen = emp),
      error: (err) => console.warn('No se pudo cargar resumen de empleado en módulo horario', err),
    });
  }

  cargarHorarioVigente() {
    this.cargando = true;
    this.errorCarga = false;

    this.servicioHorarios
      .vigente(this.empleadoId, this.fechaReferencia)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: (rows) => this.mapearSemanaDesdeBackend(rows || []),
        error: (err) => {
          console.error('Error cargando horario vigente', err);
          this.errorCarga = true;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el horario vigente.',
            background: '#111',
            color: '#f5f5f5',
          });
        },
      });
  }

  private mapearSemanaDesdeBackend(rows: any[]) {
    this.inicializarSemana();

    const porDia: Record<number, any> = {};
    for (const r of rows) {
      if (r.dia_semana) porDia[r.dia_semana] = r;
    }

    this.semana = this.semana.map(item => {
      const r = porDia[item.dia];
      if (!r) return item;

      return {
        ...item,
        es_descanso: !!r.es_descanso,
        hora_inicio: r.hora_inicio || null,
        hora_fin: r.hora_fin || null,
        hora_inicio_2: r.hora_inicio_2 || null,
        hora_fin_2: r.hora_fin_2 || null,
        tolerancia_min: r.tolerancia_min ?? 15,
      };
    });
  }

  toggleDescanso(dia: DiaHorarioUI) {
    dia.es_descanso = !dia.es_descanso;
    if (dia.es_descanso) {
      dia.hora_inicio = null;
      dia.hora_fin = null;
      dia.hora_inicio_2 = null;
      dia.hora_fin_2 = null;
    }
  }

  private validarSemana(): string[] {
    const errores: string[] = [];

    for (const d of this.semana) {
      if (d.es_descanso) continue;

      const t1Inicio = d.hora_inicio;
      const t1Fin = d.hora_fin;
      const t2Inicio = d.hora_inicio_2;
      const t2Fin = d.hora_fin_2;

      if ((t1Inicio && !t1Fin) || (!t1Inicio && t1Fin)) {
        errores.push(`Completa la hora de inicio y fin del Turno 1 en ${d.nombreDia}.`);
      }

      if ((t2Inicio && !t2Fin) || (!t2Inicio && t2Fin)) {
        errores.push(`Completa la hora de inicio y fin del Turno 2 en ${d.nombreDia}.`);
      }

      if (t1Inicio && t1Fin && t1Inicio >= t1Fin) {
        errores.push(`En ${d.nombreDia}, la hora de inicio del Turno 1 debe ser menor que la hora de fin.`);
      }

      if (t2Inicio && t2Fin && t2Inicio >= t2Fin) {
        errores.push(`En ${d.nombreDia}, la hora de inicio del Turno 2 debe ser menor que la hora de fin.`);
      }

      if (!t1Inicio && !t1Fin && !t2Inicio && !t2Fin) {
        errores.push(`Configura al menos un tramo (Turno 1 o Turno 2) en ${d.nombreDia} o márcalo como descanso.`);
      }

      if (d.tolerancia_min < 0 || d.tolerancia_min > 60) {
        errores.push(`La tolerancia en ${d.nombreDia} debe estar entre 0 y 60 minutos.`);
      }
    }

    return errores;
  }

  guardarSemana() {
    if (this.guardando) return;

    const errores = this.validarSemana();
    if (errores.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Revisa el horario',
        html: `<ul style="text-align:left; margin:0; padding-left:1.2rem; font-size:0.9rem;">
          ${errores.map(e => `<li>${e}</li>`).join('')}
        </ul>`,
        background: '#111',
        color: '#f5f5f5',
      });
      return;
    }

    const payload = {
      fecha_inicio: this.fechaReferencia,
      items: this.semana.map(d => ({
        dia: d.dia,
        hora_inicio: d.es_descanso ? null : d.hora_inicio,
        hora_fin: d.es_descanso ? null : d.hora_fin,
        hora_inicio_2: d.es_descanso ? null : d.hora_inicio_2,
        hora_fin_2: d.es_descanso ? null : d.hora_fin_2,
        es_descanso: d.es_descanso,
        tolerancia_min: d.tolerancia_min,
      })),
    };

    this.guardando = true;

    this.servicioHorarios
      .setSemana(this.empleadoId, payload)
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Horario guardado',
            text: 'La nueva semana de horario se guardó correctamente.',
            background: '#111',
            color: '#f5f5f5',
          });
          this.cargarHorarioVigente();
        },
        error: (err) => {
          console.error('Error guardando horario de semana', err);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar',
            text: 'Ocurrió un error al guardar el horario. Intenta nuevamente.',
            background: '#111',
            color: '#f5f5f5',
          });
        },
      });
  }

  // ==========================
  // EXCEPCIONES
  // ==========================

  // ✅ Esto hace que aparezca el botón eliminar cuando la fecha ya tiene excepción
  onCambioFechaExcepcion() {
    this.cargarExcepcionDelDia();
  }

  private cargarExcepcionDelDia() {
    if (!this.empleadoId) return;

    this.exCargandoDia = true;

    this.servicioHorarios
      .dia(this.empleadoId, this.exFecha)
      .pipe(finalize(() => (this.exCargandoDia = false)))
      .subscribe({
        next: (resp) => {
          this.exActual = resp?.excepcion || null;

          if (this.exActual) {
            this.exTipo = this.exActual.tipo || 'Horario especial';
            this.exEsLaborable = !!this.exActual.es_laborable;
            this.exHoraInicio = this.exActual.hora_inicio || null;
            this.exHoraFin = this.exActual.hora_fin || null;
            this.exObservacion = this.exActual.observacion || '';
          } else {
            this.exTipo = 'Horario especial';
            this.exEsLaborable = true;
            this.exHoraInicio = null;
            this.exHoraFin = null;
            this.exObservacion = '';
          }
        },
        error: (err) => {
          console.error('Error obteniendo excepción del día', err);
          this.exActual = null;
        },
      });
  }

  private cargarListaExcepciones() {
    if (!this.empleadoId) return;

    this.exListaCargando = true;

    const hoy = this.todayKey();

    this.servicioHorarios
      .listarExcepciones(this.empleadoId, hoy)
      .pipe(finalize(() => (this.exListaCargando = false)))
      .subscribe({
        next: (rows) => {
          this.exLista = (rows || []).slice().sort((a: any, b: any) => {
            return String(a.fecha).localeCompare(String(b.fecha));
          });
        },
        error: (err) => {
          console.error('Error cargando lista de excepciones', err);
          this.exLista = [];
        },
      });
  }

  seleccionarExcepcionEnLista(ex: any) {
    if (!ex?.fecha) return;
    this.exFecha = ex.fecha;
    this.cargarExcepcionDelDia();
  }

  guardarExcepcion() {
    if (this.exGuardando) return;

    if (this.exActual) {
      Swal.fire({
        icon: 'warning',
        title: 'Ya existe excepción',
        text: 'Para esta fecha ya hay una excepción registrada. Elimínala o edítala.',
        background: '#111',
        color: '#f5f5f5',
      });
      return;
    }

    if (!this.exFecha) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha requerida',
        text: 'Selecciona la fecha de la excepción.',
        background: '#111',
        color: '#f5f5f5',
      });
      return;
    }

    if (this.exEsLaborable) {
      if ((this.exHoraInicio && !this.exHoraFin) || (!this.exHoraInicio && this.exHoraFin)) {
        Swal.fire({
          icon: 'warning',
          title: 'Horario incompleto',
          text: 'Completa la hora de inicio y fin o deja ambas en blanco.',
          background: '#111',
          color: '#f5f5f5',
        });
        return;
      }

      if (this.exHoraInicio && this.exHoraFin && this.exHoraInicio >= this.exHoraFin) {
        Swal.fire({
          icon: 'warning',
          title: 'Horario inválido',
          text: 'La hora de inicio debe ser menor que la hora de fin.',
          background: '#111',
          color: '#f5f5f5',
        });
        return;
      }
    }

    const payload = {
      fecha: this.exFecha,
      tipo: this.exTipo,
      es_laborable: this.exEsLaborable,
      hora_inicio: this.exEsLaborable ? this.exHoraInicio : null,
      hora_fin: this.exEsLaborable ? this.exHoraFin : null,
      observacion: this.exObservacion?.trim() || null,
    };

    this.exGuardando = true;

    this.servicioHorarios
      .addExcepcion(this.empleadoId, payload)
      .pipe(finalize(() => (this.exGuardando = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Excepción guardada',
            text: 'La excepción se registró correctamente.',
            background: '#111',
            color: '#f5f5f5',
          });
          this.cargarExcepcionDelDia();
          this.cargarListaExcepciones();
        },
        error: (err) => {
          console.error('Error guardando excepción', err);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar',
            text: err?.error?.message || 'Ocurrió un error al guardar la excepción.',
            background: '#111',
            color: '#f5f5f5',
          });
        },
      });
  }

  actualizarExcepcionActual() {
    if (!this.exActual?.id) return;

    const payload = {
      tipo: this.exTipo,
      es_laborable: this.exEsLaborable,
      hora_inicio: this.exEsLaborable ? this.exHoraInicio : null,
      hora_fin: this.exEsLaborable ? this.exHoraFin : null,
      observacion: this.exObservacion?.trim() || null,
    };

    this.exGuardando = true;

    this.servicioHorarios
      .actualizarExcepcion(this.exActual.id, payload)
      .pipe(finalize(() => (this.exGuardando = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Excepción actualizada',
            text: 'Se actualizó correctamente.',
            background: '#111',
            color: '#f5f5f5',
          });
          this.cargarExcepcionDelDia();
          this.cargarListaExcepciones();
        },
        error: (err) => {
          console.error('Error actualizando excepción', err);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo actualizar',
            text: err?.error?.message || 'Ocurrió un error al actualizar la excepción.',
            background: '#111',
            color: '#f5f5f5',
          });
        },
      });
  }

  eliminarExcepcionActual() {
    if (!this.exActual) return;

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar excepción',
      text: '¿Seguro que deseas eliminar esta excepción?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#111',
      color: '#f5f5f5',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.exGuardando = true;

      this.servicioHorarios
        .eliminarExcepcion(this.exActual.id)
        .pipe(finalize(() => (this.exGuardando = false)))
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Excepción eliminada',
              text: 'La excepción fue eliminada.',
              background: '#111',
              color: '#f5f5f5',
            });

            this.exActual = null;
            this.exTipo = 'Horario especial';
            this.exEsLaborable = true;
            this.exHoraInicio = null;
            this.exHoraFin = null;
            this.exObservacion = '';

            this.cargarExcepcionDelDia();
            this.cargarListaExcepciones();
          },
          error: (err) => {
            console.error('Error eliminando excepción', err);
            Swal.fire({
              icon: 'error',
              title: 'No se pudo eliminar',
              text: err?.error?.message || 'Ocurrió un error al eliminar la excepción.',
              background: '#111',
              color: '#f5f5f5',
            });
          },
        });
    });
  }

  volverAEmpleado() {
    this.router.navigate(['/panel/empleados', this.empleadoId]);
  }
}