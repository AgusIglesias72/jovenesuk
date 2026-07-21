# Nota: Expo vs Capacitor (leé esto antes de setear la app mañana)

Dijiste que mañana **seteás la app en Expo**. Este scaffold está armado para **Capacitor**, así que
antes de arrancar conviene decidir con los ojos abiertos, porque **son dos caminos distintos**:

## Capacitor (lo que está scaffoldeado acá)
- **Envuelve la web responsive** que ya tenés (WebView nativa que carga el sitio + la capa PWA).
- **Reutiliza el 100%** del JUK Portal: mismo código, mismas pantallas, cero reescritura.
- Salís a las stores rápido. Ideal cuando la app "es" el sitio web.
- Runbooks listos: `runbook-ios.md`, `runbook-android.md`, `capacitor.config.ts`.

## Expo / React Native (lo que mencionaste)
- Es un **proyecto aparte** (React Native): la UI se **reescribe** con componentes nativos
  (`View`/`Text`/`Pressable`…), NO reusa los componentes Next/Tailwind de este repo.
- Podés compartir **lógica de dominio** (`src/lib/domain/**` es TypeScript puro sin React/Next) y
  los tipos, pero **no** las pantallas ni el design system tal cual.
- Más trabajo, pero da una app "de verdad" nativa (mejor si querés push notifications ricas,
  offline real, features de dispositivo, o una UX distinta a la web).
- Ventaja Expo: **EAS Build compila iOS en la nube** → no necesitás Mac para buildear (sí seguís
  necesitando la cuenta Apple para firmar/publicar).

## Recomendación honesta
- Si el objetivo es **estar en las stores ya, reusando todo** → **Capacitor** (está listo acá).
- Si querés una **app nativa propiamente dicha** y estás dispuesto a reconstruir la UI → **Expo**.
  En ese caso este repo aporta: la lógica de `src/lib/domain`, los tipos de Drizzle, la API
  (`/api/v1` para consumir desde la app), y el design system como **referencia visual** a portar.

## "Dejarlo listo" para Expo (lo que podés hacer mañana)
1. `npx create-expo-app@latest juk-app` (proyecto separado, fuera de `juk-portal/`).
2. Autenticación: reusar Better-Auth vía su cliente, o exponer los endpoints que la app necesite
   bajo `src/app/api/v1/` (ya existe esa convención en el proyecto).
3. Portar pantalla por pantalla desde el back-office/portal de familias como referencia.
4. Para builds/stores: **EAS** (`eas build`, `eas submit`) con tu cuenta Apple + Google Play.
5. Los items de `BLOQUEADO-POR-VOS.md` (cuentas, appId, política de privacidad) valen **igual** para Expo.

> En criollo: la **PWA que dejé andando ya es una "app" instalable en tu teléfono hoy**. Capacitor te
> lleva a las stores reusando todo. Expo es el camino más largo (UI nueva) pero más nativo. Elegí según
> cuánto querés invertir vs. qué tan "nativa" la necesitás.
