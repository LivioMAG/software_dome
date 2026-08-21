# Supabase-Einrichtung

1. Neues Supabase-Projekt erstellen.
2. `mastermag_setup.sql` vollständig im SQL Editor ausführen.
3. Unter **Authentication → Users** genau einen Benutzer mit E-Mail und Passwort erstellen.
4. Die UUID des Benutzers kopieren.
5. Diesen Befehl mit der echten UUID im SQL Editor ausführen:

```sql
insert into public.app_admin (singleton_id, user_id)
values (1, 'HIER-DIE-AUTH-USER-UUID-EINTRAGEN');
```

6. Öffentliche Registrierungen unter **Authentication → Providers → Email** deaktivieren.
7. `public/config.example.json` nach `public/config.json` kopieren und Projekt-URL sowie Anon-Key eintragen.

Der Service-Role-Key gehört niemals in die Webapp oder in `config.json`. Der Anon-Key ist im Browser sichtbar; geschützt werden die Daten durch RLS und die gezielt freigegebenen RPC-Funktionen.

## Automatische Deployments über GitHub

Der Workflow `Deploy Supabase migrations` spielt neue Dateien aus
`supabase/migrations/` automatisch ein, sobald sie nach `main` gemergt wurden.
Er kann außerdem in GitHub unter **Actions** manuell gestartet werden.

Einmalig unter **GitHub → Settings → Environments → production** dieses
Environment Secret hinterlegen:

- `SUPABASE_DB_URL`: In Supabase das Projekt öffnen, oben auf **Connect** klicken,
  **Session pooler** auswählen und die angezeigte Verbindungs-URI kopieren. Den
  Platzhalter `[YOUR-PASSWORD]` in der URI durch das Datenbankpasswort ersetzen.

Geheimnisse niemals als Datei committen oder in einen Pull Request schreiben.
Der Workflow übergibt die Verbindungs-URI direkt und führt anschließend
`supabase db push` aus. Ein persönlicher Supabase Access Token, Publishable Key,
Anon-Key oder Service-Role-Key wird dafür nicht benötigt.

Neue Backend-Änderungen gehören als neue, zeitgestempelte SQL-Dateien nach
`supabase/migrations/`. Bereits ausgeführte Migrationen dürfen nicht nachträglich
verändert werden.
