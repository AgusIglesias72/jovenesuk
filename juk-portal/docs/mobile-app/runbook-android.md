# Runbook — App Android (Play Store) con Capacitor

Se puede hacer **desde Windows** (no necesitás Mac). Los pasos con 🔴 requieren **tus cuentas /
credenciales / keystore** y no los puede hacer Claude.

Convención: 🟢 = automatizable/técnico · 🔴 = requiere vos (cuenta, firma, subida, revisión).

---

## 0. Prerrequisitos (una sola vez)

- 🟢 **Node 20+** (ya lo tenés, corrés el portal local).
- 🔴 **Android Studio** instalado (incluye el SDK, el emulador y `keytool` vía el JDK que trae).
  Descarga: https://developer.android.com/studio
- 🔴 **Cuenta de Google Play Console** (pago único de **25 USD**). https://play.google.com/console
- 🔴 Decididos: `appId` definitivo (`com.jovenesenuk.portal`) y `<PROD_URL>` de producción.
  Ver `BLOQUEADO-POR-VOS.md`.

---

## 1. Instalar Capacitor en el proyecto 🟢

Desde `juk-portal/`:

```bash
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/android
```

> Estas deps son del tooling de wrapping. Si preferís no tocar el `package.json` del portal,
> hacelo en un **fork/branch dedicado** o en una copia. En cualquier caso NO cambian la app web.

Opcionales (recomendados para la mitigación de "solo un sitio web" y mejor UX):

```bash
npm i @capacitor/splash-screen @capacitor/status-bar @capacitor/app
# y si vas a sumar push/cámara más adelante:
# npm i @capacitor/push-notifications @capacitor/camera
```

## 2. Colocar la config 🟢

Copiá `docs/mobile-app/capacitor.config.ts` a la **raíz** (`juk-portal/capacitor.config.ts`) y:

- Reemplazá `<PROD_URL>` por la URL real (ej. `https://portal.jovenesenuk.com`).
- Confirmá `appId` y `appName`.
- Confirmá `webDir` (ver la "Nota webDir" del template; con WebView remota alcanza con que la
  carpeta exista y tenga un index.html mínimo).

## 3. Agregar la plataforma Android 🟢

```bash
npx cap add android
```

Esto crea la carpeta `android/` (proyecto Gradle nativo). **No se commitea en este scaffold**; la
genera cada quien en su máquina. Si querés versionarla, decidilo aparte.

## 4. Sincronizar 🟢

Cada vez que cambies `capacitor.config.ts`, íconos, o deps de plugins:

```bash
npx cap sync android
```

En modo WebView remota **no necesitás re-buildear el sitio** para cambios de UI (esos van por
Vercel). `sync` solo copia config/plugins al proyecto nativo.

## 5. Íconos y splash 🟢

- Reutilizá los íconos PWA ya generados en `public/icons/` (`icon-512.png`, `maskable-512.png`).
- Para generar los recursos nativos automáticamente podés usar `@capacitor/assets`
  (`npx @capacitor/assets generate --android`) apuntando a un ícono fuente de 1024×1024 y un
  splash. Es opcional; también se pueden pegar a mano en `android/app/src/main/res/`.

## 6. Abrir en Android Studio 🟢/🔴

```bash
npx cap open android
```

Se abre Android Studio con el proyecto. Ahí:

- 🟢 Esperá a que Gradle sincronice.
- 🔴 En `android/app/build.gradle` verificá `applicationId = "com.jovenesenuk.portal"` y subí
  `versionCode` (entero, +1 por cada subida) y `versionName` (ej. `"1.0.0"`).
- 🟢 Probá en emulador o teléfono (Run ▶). Debe cargar el portal desde `<PROD_URL>`.

## 7. Generar el keystore de release 🔴 (CRÍTICO — guardalo para siempre)

El keystore firma la app. **Si lo perdés, no podés volver a actualizar la app en Play** (habría que
publicar una app nueva). Guardalo en un lugar seguro + backup (gestor de contraseñas / bóveda).

```bash
keytool -genkey -v \
  -keystore juk-portal-release.keystore \
  -alias juk-portal \
  -keyalg RSA -keysize 2048 -validity 10000
```

Te va a pedir una **contraseña** (anotala) y algunos datos (nombre, organización, etc.).
Resultado: `juk-portal-release.keystore`. **NO lo subas a git.** Anotá: ruta, alias (`juk-portal`),
password del store y password de la key.

> Alternativa moderna: activar **Play App Signing** (Google guarda la clave de firma final y vos
> subís con una "upload key"). Aun así generás una upload key con el mismo `keytool`. Recomendado.

## 8. Configurar la firma en Gradle 🔴

En `android/app/build.gradle`, dentro de `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file("../../juk-portal-release.keystore") // ajustá la ruta
        storePassword System.getenv("JUK_KEYSTORE_PASSWORD")
        keyAlias "juk-portal"
        keyPassword System.getenv("JUK_KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        // ...
    }
}
```

(Usá variables de entorno para no hardcodear passwords en un archivo versionable.)

## 9. Build del AAB firmado 🔴

El formato para Play es **AAB** (Android App Bundle), no APK.

- Desde Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**, elegí el
  keystore, y buildeá el `release`.
- O por línea de comandos desde `android/`:

```bash
./gradlew bundleRelease
# (en Windows: gradlew.bat bundleRelease)
```

Salida: `android/app/build/outputs/bundle/release/app-release.aab`.

## 10. Play Console — crear y subir 🔴

Todo esto es en https://play.google.com/console con tu cuenta:

1. 🔴 **Crear la app** (nombre "Jóvenes en UK", idioma por defecto español, tipo App, gratis).
2. 🔴 Completar la **ficha de Play Store**: descripción, capturas (teléfono + tablet), ícono
   512×512, gráfico destacado 1024×500, categoría, email de contacto.
3. 🔴 **Política de privacidad** (URL) — obligatoria si la app maneja datos personales (y esta sí:
   login, alumnos, familias).
4. 🔴 Completar los **cuestionarios**: Content rating, Data safety (qué datos recopila la app),
   público objetivo, anuncios (no), etc.
5. 🔴 Subir el `.aab` a un **track**: empezá por **Internal testing** (rápido, para probar con el
   equipo por email), después **Closed/Open testing**, y finalmente **Production**.
6. 🔴 Enviar a **revisión**. La primera revisión de una cuenta nueva puede tardar varios días.

## 11. Actualizaciones futuras

- **Cambio solo de UI/web:** deploy a Vercel. La app se actualiza sola (WebView remota). **No** hay
  que resubir a Play.
- **Cambio nativo** (ícono, splash, permisos, plugin, versión, `appId` no): subí `versionCode`,
  `npx cap sync android`, rebuild AAB firmado, subir nuevo release a Play, revisión.

---

### Checklist rápido Android

- [ ] Android Studio instalado 🔴
- [ ] Cuenta Play Console (25 USD) 🔴
- [ ] appId y `<PROD_URL>` definidos 🔴
- [ ] `npm i` Capacitor + `@capacitor/android` 🟢
- [ ] `capacitor.config.ts` en la raíz con URL real 🟢
- [ ] `npx cap add android` + `npx cap sync android` 🟢
- [ ] Probado en emulador/teléfono 🟢
- [ ] **Keystore generado y guardado en lugar seguro + backup** 🔴🔑
- [ ] Firma configurada en Gradle 🔴
- [ ] AAB de release firmado 🔴
- [ ] App creada en Play Console + ficha + cuestionarios 🔴
- [ ] Subido a Internal testing → revisión 🔴
