# Runbook — App iOS (App Store) con Capacitor

⚠️ **iOS OBLIGA a tener una Mac con Xcode.** No se puede compilar/firmar/archivar iOS desde
Windows. Este entorno (Windows) NO puede hacer ninguno de estos pasos: son **todos en tu Mac, con
tu cuenta Apple**. Claude no puede ejecutarlos.

Convención: 🟢 = técnico/automatizable en la Mac · 🔴 = requiere vos (cuenta, certificados, subida,
revisión).

---

## 0. Prerrequisitos (una sola vez, en la Mac)

- 🔴 **Una Mac** con macOS reciente.
- 🔴 **Xcode** (desde la Mac App Store) + Command Line Tools (`xcode-select --install`).
- 🔴 **Cuenta Apple Developer** de pago: **99 USD/año**. https://developer.apple.com/programs/
  (sin esto no podés subir a TestFlight ni a la App Store).
- 🔴 **CocoaPods** instalado (`sudo gem install cocoapods`) — Capacitor iOS lo usa.
- 🟢 Node 20+.
- 🔴 Definidos: `appId` (`com.jovenesenuk.portal`) y `<PROD_URL>`. Ver `BLOQUEADO-POR-VOS.md`.

---

## 1. Instalar Capacitor + plataforma iOS 🟢 (en la Mac, dentro de `juk-portal/`)

```bash
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/ios
```

Opcionales recomendados (ver "Mitigación 4.2" abajo):

```bash
npm i @capacitor/splash-screen @capacitor/status-bar @capacitor/app
# para sumar valor nativo real:
# npm i @capacitor/push-notifications @capacitor/camera
```

## 2. Colocar la config 🟢

Copiá `docs/mobile-app/capacitor.config.ts` a la raíz (`juk-portal/capacitor.config.ts`),
reemplazá `<PROD_URL>` por la URL real y confirmá `appId` / `appName` / `webDir`.

## 3. Agregar la plataforma iOS 🟢

```bash
npx cap add ios
npx cap sync ios
```

Crea la carpeta `ios/` (proyecto Xcode + Pods). No se versiona en este scaffold.

## 4. Íconos y splash 🟢

Reutilizá `public/icons/` (necesitás un ícono fuente 1024×1024 sin alpha para el App Store).
Opcional: `npx @capacitor/assets generate --ios` genera el asset catalog automáticamente.

## 5. Abrir en Xcode 🟢/🔴

```bash
npx cap open ios
```

Se abre Xcode con `App.xcworkspace`. En Xcode:

- 🔴 Seleccioná el target **App → Signing & Capabilities**.
- 🔴 **Team:** elegí tu equipo de Apple Developer (requiere estar logueado con tu Apple ID de pago).
- 🔴 **Bundle Identifier:** `com.jovenesenuk.portal` (idéntico al `appId` y al que crees en App
  Store Connect).
- 🔴 Dejá **Automatically manage signing** activado la primera vez: Xcode crea el certificado de
  desarrollo y el provisioning profile por vos.
- 🟢 Elegí un simulador o dispositivo y corré (▶) para probar que carga el portal desde `<PROD_URL>`.

## 6. Certificados y provisioning 🔴

Con "Automatically manage signing" Xcode se ocupa de:
- **Development certificate** (probar en tu iPhone físico).
- **Distribution certificate** + **App Store provisioning profile** (para subir).

Si preferís manual, se gestiona en https://developer.apple.com/account (Certificates, Identifiers &
Profiles). Registrá primero el **App ID** con el bundle `com.jovenesenuk.portal`.

## 7. App Store Connect — crear el registro de la app 🔴

En https://appstoreconnect.apple.com con tu cuenta:

1. 🔴 **My Apps → +** → New App. Plataforma iOS, nombre "Jóvenes en UK", idioma primario Español,
   Bundle ID = el que registraste, y un **SKU** interno (ej. `juk-portal-ios`).
2. 🔴 Completá la ficha: descripción, keywords, capturas (varios tamaños de iPhone; iPad si aplica),
   ícono, categoría, **URL de política de privacidad** (obligatoria — la app maneja datos de login,
   alumnos y familias), y datos de contacto.
3. 🔴 Completá **App Privacy** (qué datos recopila y cómo se usan).

## 8. Archivar y subir 🔴 (en Xcode)

1. 🔴 Arriba, elegí destino **Any iOS Device (arm64)** (no un simulador).
2. 🔴 Subí `Version` y `Build` en el target (Build debe incrementarse en cada subida).
3. 🔴 **Product → Archive.** Cuando termina abre el **Organizer**.
4. 🔴 En Organizer: **Distribute App → App Store Connect → Upload.** Firma con el distribution cert.
5. 🟢 Esperá el procesamiento en App Store Connect (unos minutos a una hora).

## 9. TestFlight (prueba interna) 🔴

- 🔴 En App Store Connect → tu app → **TestFlight**: agregá testers internos (hasta 100, de tu
  equipo, por email). Reciben la app en la app TestFlight del iPhone.
- 🔴 Para testers externos (fuera del equipo) hace falta una **revisión de TestFlight** (más corta
  que la de App Store).

## 10. Enviar a revisión de App Store 🔴

- 🔴 En la pestaña de la versión de App Store: seleccioná el build subido, completá "Qué probar",
  export compliance (si usás HTTPS estándar, normalmente exento), y **Submit for Review**.
- 🔴 La primera revisión suele tardar 1–3 días.

---

## ⚠️ Mitigación 4.2 — "app que es solo un sitio web"

Apple rechaza (guideline **4.2 Minimum Functionality**) apps que son solo un WebView de un sitio.
Para reducir el riesgo de rechazo, sumá **funcionalidad nativa con valor** antes de enviar:

- **Push notifications** (`@capacitor/push-notifications`) — avisos de pagos, documentación, etc.
- **Cámara** (`@capacitor/camera`) — subir foto de pasaporte/documentación desde el teléfono.
- **Compartir** / **biometría** para el login (Face ID).
- Pantalla nativa de **offline** cuando no hay internet.

Con al menos una o dos de estas, la app deja de ser "solo web". Documentá en las notas de revisión
para qué sirve la app (back-office/portal de familias de una agencia de viajes de estudio) y que
requiere cuenta (dales credenciales de demo a los revisores).

> Si Apple igual rechaza por 4.2, la vía es agregar más features nativas o discutir en el Resolution
> Center. Android (Play) es mucho más laxo con esto — por eso conviene empezar por Android.

---

### Checklist rápido iOS

- [ ] Mac con Xcode + CocoaPods 🔴
- [ ] Cuenta Apple Developer (99 USD/año) 🔴
- [ ] appId / Bundle ID y `<PROD_URL>` definidos 🔴
- [ ] `npm i` Capacitor + `@capacitor/ios` 🟢
- [ ] `capacitor.config.ts` en la raíz con URL real 🟢
- [ ] `npx cap add ios` + `npx cap sync ios` 🟢
- [ ] Team + Bundle ID en Xcode (Signing) 🔴
- [ ] Probado en simulador/iPhone 🟢
- [ ] App creada en App Store Connect + ficha + App Privacy 🔴
- [ ] Al menos 1–2 features nativas (mitigación 4.2) 🔴
- [ ] Archive → Upload 🔴
- [ ] TestFlight con el equipo 🔴
- [ ] Submit for Review 🔴
