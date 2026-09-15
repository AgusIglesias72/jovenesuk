---
name: juk-gate
description: Antes de codear un área sensible del JUK Portal, lee OPEN_DECISIONS.md y responde VERDE / AMARILLO / ROJO citando el ítem exacto y qué se puede construir mientras tanto. Usalo antes de arrancar features con reglas de negocio discutibles (parental consent, excursiones, cuotas y monedas, portales externos, recordatorios, retención de accesos, precios).
---

# /juk-gate — ¿Puedo codear esto?

La fuente de verdad es **`juk-portal/OPEN_DECISIONS.md`**. Este skill **no** guarda una copia de
las decisiones (una copia envejece y termina frenando trabajo que ya está desbloqueado):
leé el archivo cada vez.

## Procedimiento

1. Leé `juk-portal/OPEN_DECISIONS.md` entero: resueltos, ⭐ (decididos, falta validar con el
   equipo), abiertos y técnicos.
2. Ubicá el área:
   - spec funcional: `juk-portal/docs/prd/00-indice.md` → el doc del módulo;
   - qué está construido y qué es parcial: `juk-portal/docs/estado-actual.md`;
   - qué falta construir: `juk-portal/docs/prd/06-deltas-implementacion.md`.
3. Buscá en OPEN_DECISIONS todos los ítems que tocan el área (por módulo, paso, tabla o
   palabra clave). No te quedes con el primero.
4. Decidí el veredicto:
   - **VERDE**: ningún ítem abierto la afecta (o solo resueltos). Codeá.
   - **AMARILLO**: la afecta un ítem abierto pero tu cambio NO toca el comportamiento que ese
     ítem deja sin decidir (codeá con lo que dice su "Hoy:"), o una decisión ⭐. Codeá acotado y
     **fácil de revertir**: constantes y funciones del dominio, no condiciones sueltas en la UI.
     El hook `gated-module-warning` recuerda lo mismo al editar las áreas ⭐.
   - **ROJO**: tu cambio toca justo el comportamiento que un ítem abierto deja sin decidir (regla
     de `OPEN_DECISIONS.md › Cómo se usa`), o lo que hay que construir no tiene regla ni asunción
     documentada. No inventes la regla: preguntale al usuario.
5. Respondé con este formato:

```
Veredicto: VERDE | AMARILLO | ROJO
Ítems: <ID> — <qué dice OPEN_DECISIONS, en una línea> (<sección del archivo>)
Mientras tanto: <qué se puede construir y cómo dejarlo revertible>
Spec: <archivo de docs/prd y sección>
```

## Si aparece algo que no está en el archivo

Una contradicción entre PRDs o una regla a medio especificar es un hallazgo. Proponé el ítem
nuevo para `OPEN_DECISIONS.md` (contexto, opciones, qué hace hoy el código) y marcá el punto
en la spec de `docs/prd/`: es parte de la regla de sincronía del proyecto. Si la duda cruza
varios PRDs, delegá en el agente **`juk-prd-analyst`**.
