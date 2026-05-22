# Plan de Implementación por Fases

Estimaciones para un desarrollador semi-senior con asistencia de Claude Code, trabajando part-time/full-time según fase. Las semanas son indicativas; el orden es lo importante.

## Fase 0 · Setup técnico (1 semana)

**Objetivo:** infraestructura lista, primer deploy a Vercel funcionando.

- [ ] Crear cuentas: GitHub, Vercel, Neon, Cloudflare, Resend, Trigger.dev, Sentry
- [ ] Crear repo privado en GitHub, configurar protección de `main`
- [ ] Inicializar el scaffold (este zip)
- [ ] Conectar Vercel con el repo, configurar región `gru1`
- [ ] Crear DB en Neon región `sa-east-1`, configurar branch para preview deployments
- [ ] Setup de Better-Auth + primera migración (tabla users)
- [ ] Setup de Resend con dominio `jovenesenuk.com` verificado
- [ ] Setup de R2: bucket `juk-documents` con custom domain `files.jovenesenuk.com`
- [ ] Setup de Trigger.dev project
- [ ] Setup de Sentry para Next.js
- [ ] Verificar que `npm run dev` arranca sin errores
- [ ] Primer deploy a Vercel: página vacía con login funcionando
- [ ] CI básico: `typecheck` + `lint` en cada PR

**Criterio de salida:** podés crear un usuario admin desde el seed script, hacer login en producción, ver el dashboard vacío.

---

## Fase 1 · Auth, usuarios y design system (1-2 semanas)

**Objetivo:** los 4 admins pueden acceder y la marca está aplicada en todas las pantallas básicas.

- [ ] Pantalla de login completa (US-01, US-02, US-04 del PRD §1)
  - Email + password + "olvidé mi contraseña"
  - Rate limit de 5 intentos / 15 min (Better-Auth lo hace)
  - Email de reset vía Resend
- [ ] Gestión de usuarios para super-admin (US-03)
  - ABM mínimo: crear admin, listar, desactivar
  - Email con password temporal al crear
- [ ] AppShell de la app (sidebar + topbar + content) usando JUK Design System
  - Implementar componentes del DS en `components/ui/`
  - Aplicar tokens de Tailwind del DS
- [ ] Layout responsive básico (PWA-friendly)
- [ ] Manifest.json + service worker mínimo (PWA install)

**Criterio de salida:** los 4 admins reales (María, Felix, Delfina, Tomas) están cargados; cada uno hace login y ve el dashboard placeholder con el shell completo.

---

## Fase 2 · ABM de Colegios + Viajes (1.5 semanas)

**Objetivo:** poder cargar el catálogo de colegios destino y crear viajes.

- [ ] ABM completo de Colegios (PRD §3)
  - Crear, listar, editar, desactivar
  - Upload de Application Form y Parental Consent a R2
  - Alerta interna por Parental Consent > 12 meses sin actualizar
  - Filtros y búsqueda
- [ ] ABM completo de Viajes (PRD §4)
  - Crear con cálculo automático de capacidad (GL × 12)
  - Estados y transiciones (decidir si "Borrador" entra o no)
  - Edición de fechas con validación de pasaportes de inscriptos
  - Cancelación con notificación opcional a alumnos
- [ ] Listado de viajes con filtros (PRD §4.3 US-12)
- [ ] Detalle del viaje (sin tabla de alumnos aún)

**Criterio de salida:** Felix puede cargar London School of English, Studio Cambridge, y crear los viajes de febrero y julio 2027.

---

## Fase 3 · ABM de Alumnos + Asignaciones (1.5 semanas)

**Objetivo:** poder cargar alumnos (manual y vía webhook) y asignarlos a viajes.

- [ ] ABM de Alumnos (PRD §5)
  - Formulario completo con todos los campos del PRD
  - Validaciones (pasaporte, fechas, etc.)
  - Datos de facturación visibles sólo para admin JUK
- [ ] Webhook de Google Form → creación automática de alumno (US-15)
  - Endpoint `/api/webhooks/google-form` con shared secret
  - Mapeo de campos
  - Deduplicación por DNI/pasaporte
  - Email interno al equipo cuando llega un nuevo pre-inscripto
- [ ] Asignación de alumno a viaje (US-16)
  - Dropdown filtrado por viajes con vacantes
  - Validación automática de pasaporte vs fecha de fin de viaje
  - Crea las 10 filas de `pasos_alumno` automáticamente (con N/A en psicofísico si colegio no lo requiere)
  - Crea las cuotas vacías (a configurar después)
- [ ] Búsqueda y filtros de alumnos (US-17)
- [ ] Baja de alumno (US-19)

**Criterio de salida:** podés llenar el Google Form de prueba y ver el alumno aparecer en el portal, asignarlo al viaje de prueba.

---

## Fase 4 · Seguimiento M6 — Pasos individuales (2.5 semanas)

**Objetivo:** la pantalla más usada del portal — el detalle del alumno con los 10 pasos.

- [ ] Pantalla de detalle del alumno (archetype B)
  - PageHeader + StepStrip + tabs
  - Tab Datos: form completo en read-mode con toggle a edit
  - Tab Historial: audit log
- [ ] Implementación de cada paso (M6):
  - [ ] Paso 1 · Application Form (PRD §6.3)
  - [ ] Paso 2 · Pagos (PRD §6.4) — el más complejo, ver fase 5
  - [ ] Paso 3 · Immigration Letter (PRD §6.5) — depende de paso 2 completado
  - [ ] Paso 4 · Test de Nivel (PRD §6.6)
  - [ ] Paso 5 · Parental Consent (PRD §6.7) — sub-estados
  - [ ] Paso 6 · Accommodation Letter (PRD §6.8)
  - [ ] Paso 7 · ETA (PRD §6.9) — alerta crítica si rechazado
  - [ ] Paso 8 · Autorización escribano (PRD §6.10) — N/A si mayor de 18
  - [ ] Paso 9 · Certificado psicofísico (PRD §6.11) — depende del flag del colegio
  - [ ] Paso 10 · Último pago presencial (PRD §6.12) — es vista especial del paso 2
- [ ] Cambio de estado de paso (Pendiente → En progreso → Completado / Bloqueado / N/A)
- [ ] Upload de documentos por paso a R2
- [ ] Audit log de cada cambio

**Criterio de salida:** podés trackear un alumno end-to-end de pre-inscripto a listo-para-viajar.

---

## Fase 5 · Pagos y mora (1 semana)

**Objetivo:** plan de pagos completo con alertas de mora.

- [ ] Crear plan de pagos al asignar alumno (cuotas con fechas y montos)
- [ ] Pantalla de pagos por alumno
- [ ] Pantalla de pagos por viaje (US-24)
- [ ] Marcar cuota como pagada (con fecha y canal)
- [ ] Job diario que marca cuotas vencidas
- [ ] Alerta de mora > 7 días (PRD §6.4) — email a admins
- [ ] Panel global de pagos en mora desde el dashboard

**Criterio de salida:** podés cargar el plan de pagos de un alumno, ver el saldo pendiente, recibir alerta automática si vence.

---

## Fase 6 · Dashboard real (1 semana)

**Objetivo:** el dashboard funciona con datos reales y alertas dinámicas.

- [ ] Sección de alertas críticas (US-DX-01)
- [ ] Viajes próximos 90 días con % completitud (US-DX-02)
- [ ] Viajes futuros con progreso hacia mínimo (US-DX-05)
- [ ] Alumnos con acción urgente (US-DX-03)
- [ ] Métricas del año (US-DX-04)
- [ ] Job recompute-alerts cada hora

**Criterio de salida:** abrís el dashboard a las 9 AM y ves exactamente qué necesita atención hoy.

---

## Fase 7 · Recordatorios y emails (1 semana)

**Objetivo:** automatización de la comunicación con familias.

- [ ] Templates React Email para cada tipo de recordatorio
- [ ] Job diario que envía recordatorios escalonados (14/7/3/1 días)
- [ ] Tracking de qué emails se enviaron por (alumno × paso × distancia)
- [ ] Email de instructivo ETA on-demand (US-32)
- [ ] Email semanal a María (PRD §2.5)

**Criterio de salida:** dejás de enviar recordatorios manualmente.

---

## Fase 8 · Seguimiento M7 — Pasos del viaje (1 semana)

**Objetivo:** los 5 trámites a nivel viaje funcionan.

- [ ] ABM de Group Leaders
- [ ] Pantalla de detalle del viaje con M7 strip
- [ ] Implementación de los 5 pasos del viaje:
  - [ ] Pasajes (PRD §7.2)
  - [ ] Excursiones (PRD §7.3)
  - [ ] Transfers (PRD §7.4) — depende de pasajes confirmados
  - [ ] Tarjetas de transporte (PRD §7.5)
  - [ ] Police Checks de GLs (PRD §7.6)

**Criterio de salida:** Felix puede gestionar el viaje completo desde la pantalla del viaje.

---

## Fase 9 · Polish + Launch (1-2 semanas)

- [ ] Testing manual end-to-end con María, Felix
- [ ] Migración de datos existentes (planillas → portal) si aplica
- [ ] Documentación interna para el equipo JUK
- [ ] Onboarding de los 4 admins
- [ ] Configuración de monitoreo activo (Sentry alerts, Vercel analytics)
- [ ] Dominio definitivo `portal.jovenesenuk.com`

**Criterio de salida:** los 4 admins usan el portal en producción para el ciclo 2027.

---

## Total estimado

**~13-16 semanas** trabajando part-time (15-20h/semana), o **8-10 semanas** full-time.

## Lo que queda fuera de v1 (futuro)

- Portal del Representante (PRD separado)
- Portal de Familias (PRD separado)
- App nativa (Expo + React Native)
- Integración con Calendario/Google Calendar
- Integración con Braze para campañas
- Generación automática de facturas (AFIP)
- Dashboard analítico avanzado (cohortes, retención)
