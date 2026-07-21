# App nativa (Android + iOS) — Decisión de arquitectura

> **TL;DR:** envolvemos la web responsive/PWA que YA tenemos con **Capacitor**. Reutilizamos el
> **100%** del código. La app nativa es una WebView que carga el sitio deployado (`server.url`),
> más un cascarón nativo firmado que subimos a las stores. **No se reescribe nada de la UI.**

---

## Contexto

El JUK Portal (back-office admin), el portal de familias y el sitio público ya son
**responsive/mobile-friendly** (sidebar→drawer, header+tabs, `MobileMenu`) y ya son **PWA**
(hay `src/app/manifest.ts`, `appleWebApp` en el root layout, e íconos en `public/icons/`).

Lo único que falta para "tener app en las stores" es un **binario firmado** que Apple/Google
acepten. Ahí entra Capacitor.

---

## La decisión: Capacitor (WebView remota)

Capacitor (de Ionic) genera un proyecto nativo Android e iOS mínimo cuyo contenido es una
**WebView** que apunta a nuestra URL de producción (`server.url` en `capacitor.config.ts`).
El resultado es un `.aab` (Android) y un `.ipa` (iOS) firmados, que son binarios reales que
las stores aceptan.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  App nativa (cascarón)      │        │  Vercel (Next.js 16)         │
│  ┌───────────────────────┐  │  https │  portal.jovenesenuk.com      │
│  │  WebView               │──┼───────▶│  = el MISMO deploy que hoy   │
│  │  carga server.url      │  │        │  usan desde el navegador     │
│  └───────────────────────┘  │        └──────────────────────────────┘
│  + splash, status bar,      │
│  + plugins nativos opc.     │
└─────────────────────────────┘
```

### Por qué Capacitor y no React Native / Expo

- **No reescribimos la UI.** RN/Expo implican reimplementar TODAS las pantallas con componentes
  nativos (`<View>`, `<Text>`, navegación nativa, etc.). Tenemos un back-office grande con tablas,
  formularios, DateInput, Select searchable, paginación… reescribir eso es un proyecto de meses y
  duplica el mantenimiento (dos UIs).
- **Una sola base de código.** Con Capacitor, cada deploy a Vercel actualiza la app al instante
  (es WebView remota): no hay que resubir binario por cada cambio de UI.
- **El equipo ya sabe Next/React.** No sumamos un stack nuevo (RN, Metro, sus quirks).

### Por qué Capacitor y no "PWA sola"

- Una PWA se instala desde el navegador ("Agregar a inicio"), pero **las stores exigen un binario**
  (.aab / .ipa). Sin binario no estás en Play Store ni en App Store.
- iOS además limita fuerte las PWA (push, instalación, algunas APIs). Estar en la store da
  presencia, ícono, reseñas y distribución que la PWA sola no da.
- Capacitor **no reemplaza** a la PWA: la envuelve. Seguimos teniendo la PWA para quien la quiera
  instalar desde el navegador, y encima ganamos las apps de store.

---

## Qué queda EXACTAMENTE igual

- Todo `src/` (Next.js, componentes, server actions, Drizzle, Better-Auth): **sin tocar**.
- `package.json` de la app: **sin tocar** (las deps de Capacitor son dev/tooling y las instala el
  usuario en su máquina siguiendo los runbooks; ver nota abajo).
- El deploy a Vercel: **sin cambios**. La app apunta a esa misma URL.
- El manifest / íconos PWA existentes: se reutilizan.

## Qué es nuevo (y es lo que este doc entrega, en modo scaffold)

- `docs/mobile-app/capacitor.config.ts` — template de config listo para copiar a la raíz de la app
  cuando el usuario arranque el wrapping en su máquina.
- Los runbooks de iOS y Android (pasos exactos).
- El checklist de lo que depende del usuario (cuentas, Mac, keystore).

> **Nota sobre dónde vive `capacitor.config.ts`:** Capacitor lo espera en la **raíz del proyecto**
> (`juk-portal/capacitor.config.ts`). Acá lo dejamos como **template en `docs/mobile-app/`** para no
> tocar nada todavía. Cuando el usuario ejecute el runbook, lo copia a la raíz. Idem las carpetas
> `android/` e `ios/`: las genera `npx cap add` en la máquina del usuario, **no** se crean acá.

---

## Pros / Cons

### Pros
- Reutiliza el 100% de la UI y la lógica; cero duplicación.
- Actualizaciones de UI instantáneas vía Vercel (no resubís binario salvo cambios nativos).
- Curva mínima: el equipo ya domina el stack web.
- Mantiene la PWA existente; suma las stores.
- Reversible: si algún día se quiere ir a nativo real, la web sigue intacta.

### Cons / cosas a tener en cuenta
- Requiere **presencia online**: la WebView remota necesita internet (mitigable con pantalla de
  "sin conexión" y, si hiciera falta, bundle local — ver `capacitor.config.ts`).
- **Rechazo de App Store por "app que es solo un sitio web"** (guideline 4.2 de Apple): es el riesgo
  real. Se mitiga sumando algo nativo con valor (push notifications, cámara para subir documentación,
  compartir, biometría para login). Ver "Mitigación 4.2" en `runbook-ios.md`.
- Cambios en la **capa nativa** (íconos, splash, permisos, plugins, versión) SÍ requieren resubir
  binario y pasar revisión.
- iOS **obliga a tener una Mac** con Xcode para compilar/firmar/archivar. Android se puede hacer
  desde Windows.

---

## Orden de trabajo sugerido

1. Leer este README.
2. Resolver lo de `BLOQUEADO-POR-VOS.md` (cuentas, Mac, appId, URL, keystore).
3. **Android primero** (se hace desde Windows, sin Mac): `runbook-android.md`.
4. **iOS** cuando tengas la Mac + cuenta Apple: `runbook-ios.md`.

Todo lo automatizable termina en `npx cap sync`. Lo demás (cuentas, certificados, firmas,
subir a las stores, revisión) es **manual y con tus credenciales** — está marcado en cada runbook.
