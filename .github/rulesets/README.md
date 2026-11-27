# Rulesets

JSON listos para importar en GitHub:

1. Abre `https://github.com/jorgelol20/cv-automizer/settings/rules`.
2. **New ruleset** → **Import a ruleset**.
3. Selecciona `main.json` o `tags.json`.
4. Revisa el resultado y pulsa **Create**.

## `main.json`

Protege la rama `main` contra:

- borrado;
- force push.

El rol **Admin** puede saltarse la regla (`bypass_actors`, `actor_id: 5`), así que el propietario no se bloquea en una emergencia.

## `tags.json`

Protege los tags que empiezan por `v` (por ejemplo `v0.9.0`) contra:

- borrado;
- reetiquetado o actualización.

También permite el bypass al rol **Admin** para poder corregir una release si hace falta.

## Añadir Pull Request obligatoria (opcional)

Si en el futuro quieres exigir PR para mezclar en `main`, añade esta regla al array `rules` de `main.json`:

```json
{
  "type": "pull_request",
  "parameters": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews_on_push": false,
    "require_code_owner_review": false,
    "require_last_push_approval": false,
    "required_review_thread_resolution": false,
    "allowed_merge_methods": [
      "squash",
      "rebase"
    ]
  }
}
```

Con `required_approving_review_count: 0` no hace falta que nadie apruebe: basta con abrir la PR. El bypass de Admin sigue permitiendo el push directo.
