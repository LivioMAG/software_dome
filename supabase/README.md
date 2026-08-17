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
