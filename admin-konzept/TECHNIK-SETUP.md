# Baukarussell Admin, technischer Teststand

**Repository:** `Baukarussell/baukarussell-webseite` (öffentlich)  
**Testbranch:** `presentation-recovery-2026-11-10`  
**Testseite:** `https://baukarussell-cms-test.pages.dev/admin-konzept/`

## Bereits verbunden

- GitHub OAuth über `/admin-api/login` mit Leseberechtigung und Bestätigung der Repository Schreibberechtigung.
- Der Status ist auf der Seite Übersicht sichtbar.
- `/admin-api/events` liest reale Eventdateien aus dem Testbranch und zeigt sie getrennt von Demoevents an.
- Die Ansicht **Im Editor öffnen** kopiert eine Eventdatei in einen **isolierten Bearbeitungsentwurf**. GitHub Quelldateien werden dadurch nicht verändert.
- Der Knopf **Entwurf speichern** für reale GitHub Events verwendet `PUT /admin-api/draft?slug=...` und ist durch Session, Benutzerrechte und CSRF abgesichert.

## Noch nötige Cloudflare Einrichtung für dauerhaftes Speichern

1. Im Cloudflare Konto einen **Workers KV Namespace** mit beispielsweise dem Namen `baukarussell_admin_drafts_test` anlegen.
2. Im **Pages Projekt `baukarussell-cms-test`** die **Settings → Bindings** öffnen.
3. Als **KV namespace** das neu angelegte Namespace einbinden. **Variable name exakt `BK_ADMIN_DRAFTS`** eintragen.
4. Das betroffene Pages Environment auswählen und das Testprojekt neu deployen.
5. Mit dem GitHub Konto im Test Admin anmelden, Events öffnen, beim echten GitHub Event **Im Editor öffnen** anklicken, ein Textfeld ändern und **Entwurf speichern** anklicken.
6. Nach dem Speichern sollte erscheinen: **Privater Entwurf gespeichert**. Der Entwurf wird bei erneutem Öffnen ohne vorhandenen lokalen Zwischenstand geladen.

Die KV Bindung darf **nur am Testprojekt** eingerichtet werden, bis wir die spätere Livefreigabe ausdrücklich planen.

## Sicherheitsgrenzen

- **Nie Entwürfe oder Gästedaten ins öffentliche GitHub Repository schreiben.**
- Die neue Draft API schreibt **ausschliesslich in das gebundene KV**, niemals auf GitHub.
- Der Editor hat keine echte Veröffentlichungsfunktion.
- Die Dateien dürfen keine privaten Anmeldelisten oder personenbezogenen Gästedaten enthalten.
- Neu im Browser hochgeladene Foto Dateien sind **nicht dauerhaft gespeichert**. Es werden nur bestehende, sichere Bildpfade in Textentwürfen akzeptiert.
- Ein Klick auf **Entwurf speichern** zeigt eine klare Fehlermeldung, solange die KV Bindung fehlt. Ein lokaler Zwischenstand ersetzt keine dauerhafte Speicherung.
- KV ist *eventually consistent* und begrenzt die Schreibfrequenz pro Schlüssel. Aktuell wird deshalb nur manuell gespeichert; automatische Speicherung und Mehrbenutzerkonflikte benötigen später eine zusätzliche Lösung.
- Der GitHub Dateistand wird im Entwurf mittels SHA mitgeführt; spätere Veröffentlichung muss den SHA vor einem Schreibvorgang auf Konflikte prüfen.

**Nie Geheimnisse, Tokens oder KV Namespace IDs in GitHub hinterlegen.**

## Editor: Rückgängig / Wiederholen

Das Admin Konzept bietet für **Events, Mitglieder, Projekte, Startseite und Unterseiten sowie Eventanmeldungen** die Buttons **Rückgängig** und **Wiederholen** direkt in der Editorkopfzeile und neben den Textfeldern. Tastenkürzel: Ctrl + Z und Ctrl + Y (auch Ctrl + Shift + Z). Der Verlauf wird pro Event, Mitglied, Projekt, Seite bzw. Einladung getrennt und nur im laufenden Browserfenster verwaltet.

- Betroffen sind Texte und Formulareingaben. **Nicht** Teil des Undo Verlaufs: Datei und Fotouploads, Bildreihenfolge, das Löschen ganzer Einträge.
- Das Undo Werkzeug aktualisiert via `input` und `change` die vorhandene lokale Vorschau, speichert jedoch selbst **nichts dauerhaft**.
- `Lokal merken` wurde für die Demo Eingabemasken ausgeblendet, da diese bereits automatisch in der Browsersitzung vorgemerkt werden.
- **Entwurf speichern** bleibt ausschliesslich für echte GitHub Eventdaten sichtbar und benötigt die private Cloudflare KV Bindung. Die Funktion **Veröffentlichen** ist weiterhin nur eine Designvorschau.
- Der Undo Verlauf geht beim vollständigen Neuladen des Tabs verloren. Die bestehenden Textentwürfe können dagegen aus Session Storage zurückkommen.
