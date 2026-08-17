# MasterMag

MasterMag ist eine responsive Webapp zur Verwaltung und Buchung praktischer Kurse für Lernende der Ausbildungen Elektroinstallateur/in und Montage-Elektriker/in. Die Anwendung koordiniert Lernende, Kurse, Arbeitsboxen, einzelne Kurstage, Sperrzeiten, Schultage und jährlich zurücksetzbare Credits.

## Funktionen

### Lernenden-Portal

- Anmeldung mit hinterlegter E-Mail-Adresse und Geburtsdatum ohne klassisches Benutzerkonto
- kurzlebige, serverseitig nur gehasht gespeicherte Sitzung
- regulären Schultag erstmals festlegen, bestätigen oder ändern
- Schulferien-Modus nur für die aktuelle Buchungssitzung
- Kurse nach Ausbildung und Lehrjahr filtern
- verfügbare Credits anzeigen
- frühestes Kursdatum und ein Sieben-Tage-Fenster auswählen
- nur Boxen mit genügend gültigen freien Tagen anzeigen
- genau eine Box für die gesamte Buchung auswählen
- jeden Kurstag einzeln wählen
- Buchung serverseitig atomar erstellen und Credits sofort abziehen
- eigene Buchungen anzeigen und bis einschliesslich 14 Tage vorher stornieren

### Administration

- geschützter Zugang für genau einen Supabase-Auth-Benutzer
- Dashboard mit Belegungs-, Kurs-, Box- und Credit-Kennzahlen
- Wochenplanung von Montag bis Freitag
- Lernende, Kurse und Boxen erstellen, bearbeiten, aktivieren und archivieren
- einzelne oder globale Sperrzeiten erstellen
- alle Buchungen suchen, manuell erstellen, verschieben und stornieren
- Credit-Transaktionen und Reset-Läufe anzeigen
- einzelne Credit-Stände protokolliert korrigieren
- alle aktiven Lernenden atomar exakt auf fünf Credits zurücksetzen

## Technologien

- HTML5 und semantisches DOM
- CSS3 mit eigenem responsivem Liquid-Glass-Design
- modernes Vanilla JavaScript mit ES-Modulen
- Vite
- Supabase Auth, PostgreSQL, Row Level Security und RPC-Funktionen
- Vitest, ESLint und Prettier

Es wird kein Frontend-Framework verwendet.

## Projektstruktur

```text
mastermag/
├── public/                 # Favicon und Laufzeitkonfiguration
├── src/
│   ├── api/                # Supabase-Datenzugriff
│   ├── app/                # Router, Store und App-Shells
│   ├── auth/               # Admin-Auth und Lernenden-Sitzung
│   ├── components/         # Wiederverwendbare UI-Komponenten
│   ├── config/             # config.json laden und validieren
│   ├── constants/          # Zentrale Geschäftsregeln
│   ├── lib/                # Supabase-Client
│   ├── pages/              # Öffentliche, Admin- und Lernenden-Seiten
│   ├── styles/             # Design-Tokens, Layouts und Komponenten
│   └── utils/              # Datum, Validierung und Formatierung
├── supabase/
│   └── mastermag_setup.sql # Komplettes Datenbank-Setup
└── tests/                  # Tests der zentralen Geschäftsregeln
```

## Voraussetzungen

- Node.js 20 oder neuer
- npm 10 oder neuer
- ein neues Supabase-Projekt

## Lokale Installation

```bash
npm install
cp public/config.example.json public/config.json
npm run dev
```

Danach ist die App standardmässig unter `http://localhost:5173` erreichbar.

Weitere Befehle:

```bash
npm run test
npm run lint
npm run build
npm run preview
```

## Supabase einrichten

1. Ein neues Supabase-Projekt erstellen.
2. [`supabase/mastermag_setup.sql`](supabase/mastermag_setup.sql) im Supabase SQL Editor vollständig ausführen.
3. Unter **Authentication → Users** manuell genau einen Benutzer mit E-Mail-Adresse und Passwort erstellen.
4. Die UUID dieses Auth-Benutzers kopieren.
5. Im SQL Editor ausführen:

```sql
insert into public.app_admin (singleton_id, user_id)
values (1, 'HIER-DIE-AUTH-USER-UUID-EINTRAGEN');
```

6. Öffentliche E-Mail-Registrierungen unter **Authentication → Providers → Email** deaktivieren.
7. `public/config.example.json` nach `public/config.json` kopieren.
8. Supabase-Projekt-URL und Anon-Key eintragen.

Die Singleton-Struktur von `app_admin` verhindert, dass ein zweiter Administrator hinterlegt wird.

## Laufzeitkonfiguration

`public/config.json` wird vor der Initialisierung des Supabase-Clients geladen:

```json
{
  "supabaseUrl": "https://abcdefghijk.supabase.co",
  "supabaseAnonKey": "eyJhbGciOi..."
}
```

Die echte Datei ist über `.gitignore` ausgeschlossen. Ohne gültige Konfiguration zeigt MasterMag eine verständliche Einrichtungsseite.

Der **Anon-Key ist in einer Browseranwendung technisch öffentlich**. Er ist kein Ersatz für Zugriffsschutz. Die Sicherheit entsteht durch RLS, Tabellenrechte und eng begrenzte RPC-Funktionen. Ein Service-Role-Key darf niemals in `config.json`, JavaScript oder das Repository gelangen.

## Geschäftsregeln

### Sieben-Tage-Regel

Der Abstand zwischen frühestem und spätestem Kurstag darf höchstens sechs Kalendertage betragen. Die gewählten Tage liegen damit in einem Fenster von maximal sieben Kalendertagen. Wochenenden, Schultage und Sperrtage können übersprungen werden.

### Stornierungsfrist

Lernende dürfen eine bestätigte Buchung selbst stornieren, wenn der früheste Kurstag mindestens 14 Kalendertage entfernt ist. Am Tag genau 14 Tage vor Kursbeginn ist die Stornierung noch erlaubt. Die Berechnung erfolgt serverseitig in `Europe/Zurich`. Der Administrator kann jederzeit stornieren.

### Credits

- Ein Kurstag entspricht einem Credit.
- Eine verbindliche Buchung zieht die Credits sofort in derselben Datenbanktransaktion ab.
- Eine Stornierung erstattet Credits bis maximal fünf.
- Der globale Reset setzt jeden aktiven Lernenden exakt auf fünf; er addiert keine Credits.
- Jede Änderung wird unveränderbar in `credit_transactions` protokolliert.

### Parallelbuchungen

Die RPC-Funktionen verwenden sortierte Transaktions-Advisory-Locks und prüfen die Verfügbarkeit danach erneut. Partielle eindeutige Indizes auf `box_id + booking_date` sowie `learner_id + booking_date` sind die letzte Datenbankgarantie. Zwei gleichzeitige Buchungen derselben Box am selben Tag können deshalb nicht beide erfolgreich sein.

## Sicherheit

- RLS ist auf allen personenbezogenen und planungsrelevanten Tabellen aktiv.
- Anonyme Clients besitzen keine direkten Leserechte auf Lernende, Buchungen, Credits oder Sitzungen.
- Lernende greifen ausschliesslich über freigegebene `SECURITY DEFINER`-RPCs zu.
- Jede solche Funktion setzt einen festen `search_path` und validiert ihre Eingaben.
- Lernenden-Tokens werden nur in `sessionStorage` gehalten und in der Datenbank ausschliesslich als SHA-256-Hash gespeichert.
- Sitzungen laufen nach zwei Stunden ab.
- Fünf fehlgeschlagene Anmeldeversuche je normalisierter E-Mail innerhalb von 15 Minuten lösen eine temporäre Sperre aus.
- Falsche E-Mail-Adresse und falsches Geburtsdatum erzeugen dieselbe generische Meldung.

## Credit-Reset bedienen

Im Admin-Bereich **Credits** öffnen und **Alle Credits auf 5 zurücksetzen** wählen. Nach der deutlichen Sicherheitsabfrage führt `admin_reset_all_credits()` den gesamten Reset in einer Datenbanktransaktion aus. Bestehende Buchungen und reservierte Kurstage bleiben unverändert. Reset-Lauf sowie Vorher-/Nachher-Stand jedes Lernenden werden protokolliert.

## Deployment

`npm run build` erzeugt die statischen Dateien in `dist/`. Der verwendete Hash-Router benötigt keine serverseitigen Rewrite-Regeln. Vor dem Deployment muss im ausgelieferten `public/config.json` die produktive Supabase-Konfiguration enthalten sein. Niemals einen Service-Role-Key ausliefern.

Für GitHub Pages ist `.github/workflows/deploy-pages.yml` enthalten. Bei jedem Push auf `main` führt der Workflow die Tests aus, baut die Vite-Anwendung und veröffentlicht ausschliesslich den fertigen `dist/`-Ordner. In den Repository-Einstellungen unter **Pages → Build and deployment → Source** muss **GitHub Actions** ausgewählt sein. Der Vite-Build verwendet relative Assetpfade und funktioniert deshalb unter dem Repository-Pfad `/software_dome/`.

Für eine neue Umgebung sind immer beide Schritte notwendig:

1. SQL-Schema auf das zugehörige Supabase-Projekt anwenden.
2. Die statische App mit der passenden `config.json` bauen beziehungsweise ausliefern.
