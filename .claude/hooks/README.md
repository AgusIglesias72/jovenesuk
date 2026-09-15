# Hooks del harness

Scripts Node que Claude Code corre solo, registrados en `.claude/settings.json`. Hacen cumplir
reglas del proyecto sin depender de que alguien se acuerde. Funcionan igual en Git Bash,
PowerShell, macOS y Linux.

| Hook | Evento | Qué hace | ¿Bloquea? |
|---|---|---|---|
| `destructive-command-guard.mjs` | PreToolUse · Bash, PowerShell | Frena borrados recursivos (`rm -r`, `Remove-Item -Recurse` o cualquier abreviatura como `-Rec`, `rd /s`) fuera de temporales, salvo artefactos regenerables como `.next` o `node_modules`. Un temporal vale como ruta literal o con prefijo `$TMPDIR`, `$TEMP`, `$env:TEMP` o `%TEMP%`: cualquier otra variable (`rm -rf "$S"`) se bloquea aunque apunte al scratchpad, porque el hook no la puede resolver. También frena SQL destructivo mandado a la base desde la terminal, `drizzle-kit push/drop` (también `drizzle-kit@<versión>` vía npx o npm exec), `npm run db:push`, `git push` forzado, `git reset --hard` y `git clean -f` | Sí (exit 2) |
| `domain-purity-check.mjs` | PostToolUse · Edit, Write, MultiEdit | ADR-005: `src/lib/domain/` no importa `next`, `react`, `server-only`, `@/app`, `drizzle-orm` ni `@/lib/db` (también `import "x"`, `export … from`, `import()` y `require`) | Sí (exit 2: el archivo quedó escrito y Claude tiene que corregirlo) |
| `schema-change-reminder.mjs` | PostToolUse | Al tocar `src/lib/db/schema/`, recuerda `/juk-migracion` (incluidas las migraciones de datos) y que la base de dev tiene datos reales | No · una vez por archivo por sesión |
| `gated-module-warning.mjs` | PostToolUse | Al tocar cuotas/pagos/moneda (CRIT-05 ⭐) o excursiones (CRIT-04 ⭐: como no tienen archivo propio, dispara con todo lo que tenga `pasos-viaje` en la ruta), recuerda mantener la regla acotada y revertible. Relee `OPEN_DECISIONS.md`: si la decisión pierde la ⭐, deja de avisar. No dispara en tests | No · una vez por decisión por sesión |
| `test-companion-check.mjs` | PostToolUse | Si el archivo editado exige test y no lo tiene, dice qué `<archivo>.test.ts` crear. Las reglas salen de `juk-portal/scripts/check-test-companions.mjs` (el mismo contrato que `npm run check:tests`, el pre-push y el CI) | No · una vez por archivo por sesión |
| `docs-sync-reminder.mjs` | Stop | Si el working tree tiene cambios en `juk-portal/src` (sin contar tests) y ninguno en los docs vivos (`docs/prd/`, `OPEN_DECISIONS.md`, `docs/estado-actual.md`, `CHANGELOG.md`, `.claude/docs/03-mapa-de-archivos.md`), recuerda la tabla "tocaste X → actualizá Y". Es un recordatorio **grueso**: se calla apenas cualquier doc vivo aparece modificado (por ejemplo un archivo de `docs/prd/`), aunque falten el CHANGELOG, estado-actual o el mapa; con varios agentes editando docs a la vez casi nunca avisa. El control real es el reporte de seis puntos de `/juk-cierre` y el cierre de `juk-revisor` | Hace seguir el turno una vez por archivo nuevo (ver abajo) |

`_comun.mjs` tiene utilidades compartidas y `probar-hooks.mjs` es la prueba: ninguno de los dos es un hook.

## Decisiones de diseño

- **Rutas**: settings.json invoca `node "${CLAUDE_PROJECT_DIR}/.claude/hooks/<hook>.mjs"`, y adentro
  todo se resuelve desde el propio archivo (`import.meta.url`), nunca desde el cwd. Antes se
  invocaban con ruta relativa y fallaban si la sesión arrancaba en `juk-portal/`. Abrí Claude Code
  desde la raíz del repo: ahí está este `.claude/`.
- **Avisos, no bloqueos**, salvo lo destructivo y la pureza del dominio. Un hook que frena cada
  edición termina desactivado. El bloqueo real del test compañero está en `check:tests`.
- **Stop y exit 2**: es la única forma en que un hook Stop le habla a Claude (con exit 0 el texto no
  le llega). Para que no sea un bloqueo: avisa una sola vez por archivo, respeta
  `stop_hook_active` y se apaga con `JUK_DOCS_SYNC=off`. Si Claude decide con motivo que no hace
  falta tocar docs, lo dice en una línea y termina.
- **Estado por sesión**: los "una vez por sesión" se guardan en `<tmp del sistema>/juk-claude-hooks/`.
  Borrar esa carpeta no rompe nada: los avisos vuelven a salir.
- **Fallan en silencio**: JSON roto, git ausente o un archivo ilegible → exit 0 sin salida.
- **Por qué hook y no solo `permissions.deny`**: una regla deny no admite excepciones (no puede
  decir "rm -rf salvo en el scratchpad"), no ve variantes como `git -C . push -f` o `bash -c "…"`, y
  un patrón con `DROP` bloquearía también un `grep` sobre las migraciones o un mensaje de commit.
  Por eso lo inequívoco está en `deny` (y se repite en el hook) y lo que necesita contexto, solo en el hook.
- **No es una barrera de seguridad**: frena errores, no a alguien decidido a saltearlo. Un comando
  bloqueado que hace falta de verdad lo corre el usuario.

## Permisos (`.claude/settings.json`)

- `allow` genérico (Bash, PowerShell, edición): decisión deliberada para trabajar sin prompts.
- `deny` (gana siempre sobre `allow`): `npm run db:push`, `drizzle-kit push/drop`, `git push --force`
  / `-f`, `git reset --hard`, `git clean -f`, en Bash y PowerShell.
- `ask` (pide confirmación): `db:migrate`, `db:seed*`, `trigger:deploy`, `vercel --prod`. Son
  legítimos, pero escriben en una base con datos reales o en entornos compartidos.

## Probar

Después de cambiar cualquier hook:

```bash
node .claude/hooks/probar-hooks.mjs
```

Corre cada hook con JSON por stdin, como Claude Code, contra casos que tienen que avisar o
bloquear y casos que tienen que salir en silencio. Los hooks que leen archivos o git corren sobre
una copia en un repo temporal: no toca el repo real. Sale con código 1 si falla algo.

Un hook suelto, a mano (Git Bash):

```bash
echo '{"session_id":"x","tool_name":"Edit","tool_input":{"file_path":"C:/ruta/al/repo/juk-portal/src/lib/domain/pasos/codigos.ts"}}' \
  | node .claude/hooks/test-companion-check.mjs; echo "exit=$?"
```

En PowerShell: `Get-Content ejemplo.json -Raw | node .claude/hooks/<hook>.mjs; $LASTEXITCODE`.

Para desactivar todos los hooks en una corrida puntual: `claude --settings '{"disableAllHooks": true}'`.
