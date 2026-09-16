import type { ConfigDocumental } from "@/lib/domain/colegios";
import type { TipoEntrada } from "@/lib/domain/colegios";
import { aplicaUltimoPagoPresencial, type ViajeOrigen, type ViajeTipo } from "@/lib/domain/viajes";

import { PASO_CODIGOS, type PasoCodigo } from "./codigos";
import type { PasoEstado } from "./estados";

/**
 * Inicialización del tablero del alumno al asignarlo a un viaje (PRD §6.2).
 * Lógica PURA: el trigger de asignación la consume y persiste el resultado.
 * Reasignación a otro viaje → se recalcula todo contra el viaje nuevo.
 */

export type CanalAlta = "webhook" | "alta_manual" | "formulario_web";

export type ContextoInicializacion = {
  /** Config documental EFECTIVA del colegio destino (defaults + overrides). */
  configDocumental: ConfigDocumental;
  /** Documentación de entrada del colegio destino (rige C1). */
  tipoEntrada: TipoEntrada;
  /** Tipo de representante del viaje (rige B2). */
  origenViaje: ViajeOrigen;
  /** Grupal/Individual (rige D2). */
  tipoViaje: ViajeTipo;
  /** Edad del alumno a la fecha de inicio del viaje (rige A3 y D1). */
  edadAlInicio: number;
  /** Cómo entró el alumno al sistema (Paso 0). */
  canalAlta: CanalAlta;
};

export type PasoInicial = {
  codigo: PasoCodigo;
  estado: PasoEstado;
  metadata: Record<string, unknown>;
  /** MIN-13: marcado en metadata para excluir de completitud/alertas. */
  esOpcional: boolean;
};

export function edadAlInicioDelViaje(fechaNacimiento: Date, fechaInicioViaje: Date): number {
  let edad = fechaInicioViaje.getFullYear() - fechaNacimiento.getFullYear();
  const cumplioEsteAnio =
    fechaInicioViaje.getMonth() > fechaNacimiento.getMonth() ||
    (fechaInicioViaje.getMonth() === fechaNacimiento.getMonth() &&
      fechaInicioViaje.getDate() >= fechaNacimiento.getDate());
  if (!cumplioEsteAnio) edad -= 1;
  return edad;
}

/**
 * Versión del Parental Consent según edad al inicio (US-28).
 * null si el paso no aplica por edad (≥18).
 * MIN-01 (abierto): la asunción de trabajo es "por edad al inicio".
 */
export function versionParentalConsent(edadAlInicio: number): "menor_16" | "16_17" | null {
  if (edadAlInicio >= 18) return null;
  return edadAlInicio < 16 ? "menor_16" : "16_17";
}

export function pasosIniciales(ctx: ContextoInicializacion): PasoInicial[] {
  const cfg = ctx.configDocumental;
  const mayorDeEdad = ctx.edadAlInicio >= 18;

  return PASO_CODIGOS.map((codigo): PasoInicial => {
    switch (codigo) {
      // Paso 0: registro del origen, completado de entrada, solo lectura.
      case "paso_0":
        return paso(codigo, "completado", { canal: ctx.canalAlta });

      case "a1":
        return desdeConfig(codigo, cfg.application_form);

      case "a2":
        return desdeConfig(codigo, cfg.test_nivel);

      // A3: config del colegio + N/A por mayoría de edad (gana cualquiera de las dos).
      case "a3": {
        if (mayorDeEdad) return paso(codigo, "na", { motivo: "mayor_de_edad" });
        const base = desdeConfig(codigo, cfg.parental_consent);
        if (base.estado !== "na") {
          base.metadata.version = versionParentalConsent(ctx.edadAlInicio);
        }
        return base;
      }

      // B1 aplica siempre (todo alumno tiene plan de cuotas).
      case "b1":
        return paso(codigo, "pendiente", {});

      // B2 deriva del tipo de representante (ex CRIT-01).
      case "b2":
        return aplicaUltimoPagoPresencial(ctx.origenViaje)
          ? paso(codigo, "pendiente", {})
          : paso(codigo, "na", { motivo: "flujo_via_agencia_o_directo" });

      // C1 solo si el colegio destino requiere ETA (MIN-14). VISA: flujo v2.
      case "c1":
        return ctx.tipoEntrada === "eta"
          ? paso(codigo, "pendiente", {})
          : paso(codigo, "na", { motivo: `entrada_${ctx.tipoEntrada}` });

      // C2 nace bloqueado: se desbloquea cuando B1 está completado (única dependencia).
      case "c2":
        return paso(codigo, "bloqueado", { bloqueadoPor: "b1" });

      case "c3":
        return paso(codigo, "pendiente", {});

      // D1: solo menores de 18 al inicio del viaje.
      case "d1":
        return mayorDeEdad
          ? paso(codigo, "na", { motivo: "mayor_de_edad" })
          : paso(codigo, "pendiente", {});

      // D2: del alumno, solo viajes Grupales con GL (ex CRIT-03).
      case "d2":
        return ctx.tipoViaje === "grupal"
          ? paso(codigo, "pendiente", {})
          : paso(codigo, "na", { motivo: "viaje_individual" });
    }
  });

  function paso(
    codigo: PasoCodigo,
    estado: PasoEstado,
    metadata: Record<string, unknown>,
    esOpcional = false
  ): PasoInicial {
    return { codigo, estado, metadata: { ...metadata, ...(esOpcional ? { opcional: true } : {}) }, esOpcional };
  }

  function desdeConfig(
    codigo: PasoCodigo,
    requisito: "requerido" | "opcional" | "na"
  ): PasoInicial {
    if (requisito === "na") return paso(codigo, "na", { motivo: "config_colegio" });
    // MIN-13: "opcional" = paso activo pero excluido de completitud y alertas.
    return paso(codigo, "pendiente", {}, requisito === "opcional");
  }
}
