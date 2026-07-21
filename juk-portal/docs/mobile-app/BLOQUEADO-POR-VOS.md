# Bloqueado por vos — lo único que depende de Agustín

Claude dejó todo el **scaffold y los runbooks** listos. Lo de abajo NO lo puede hacer Claude:
son cuentas, hardware, credenciales y decisiones tuyas. Hasta que estén, no se puede subir a las
stores.

---

## 🔑 Decisiones (rápidas, hacelas primero)

- [ ] **appId definitivo** (reverse-DNS). Propuesto: `com.jovenesenuk.portal`.
      ⚠️ No se puede cambiar después de la primera subida sin crear otra app en las stores.
- [ ] **URL de producción** (`<PROD_URL>` del `capacitor.config.ts`):
      ¿`https://portal.jovenesenuk.com` (dominio planeado) o `https://jovenesuk.vercel.app`
      (deploy actual)? Elegí la definitiva; idealmente el dominio propio con HTTPS válido.

## 💳 Cuentas (tienen costo y trámite)

- [ ] **Google Play Console** — **25 USD pago único**. https://play.google.com/console
- [ ] **Apple Developer Program** — **99 USD/año**. https://developer.apple.com/programs/
      Sin esta cuenta no hay TestFlight ni App Store.

## 💻 Hardware / software

- [ ] **Una Mac con Xcode** — **imprescindible para iOS** (no se puede desde Windows).
      Android sí se hace desde tu Windows con Android Studio.
- [ ] **Android Studio** instalado (Windows) para el flujo Android.

## 🔐 Keystore de Android (CRÍTICO — no lo pierdas nunca)

- [ ] Generar el keystore de release con `keytool` (comando exacto en `runbook-android.md` §7).
- [ ] **Guardarlo en lugar seguro + backup** (gestor de contraseñas / bóveda). Anotá: archivo,
      alias, password del store y password de la key.
      ⚠️ Si lo perdés, **no podés volver a actualizar la app en Play** (habría que publicar una app
      nueva desde cero). Recomendado activar **Play App Signing**.

## 📋 Contenido que piden las stores (lo armás vos)

- [ ] **Política de privacidad publicada (URL)** — obligatoria: la app maneja login, datos de
      alumnos y familias. La piden tanto Apple como Google.
- [ ] Ficha de tienda: descripción, **capturas** (teléfono; iPad/tablet si aplica), ícono, categoría,
      email de contacto.
- [ ] Cuestionarios de **Data safety** (Play) y **App Privacy** (Apple).
- [ ] **Usuario/clave de demo** para los revisores (la app requiere login).

---

## Lo que SÍ dejó listo Claude (no te bloquea)

- Decisión de arquitectura y por qué Capacitor → `README.md`
- Template de config → `capacitor.config.ts` (solo reemplazás `<PROD_URL>` y confirmás `appId`)
- Paso a paso Android → `runbook-android.md`
- Paso a paso iOS → `runbook-ios.md`

## Orden sugerido

1. Cerrar las **Decisiones** (appId + URL) — 5 minutos.
2. **Android primero** (desde tu Windows, sin depender de la Mac): seguí `runbook-android.md`.
3. **iOS** cuando tengas Mac + cuenta Apple: `runbook-ios.md`.
