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

## Cloudflare KV: Einrichtung und Prüfung abgeschlossen

- `baukarussell_admin_drafts_test` wurde im Cloudflare Konto erstellt und für die Testseite als `BK_ADMIN_DRAFTS` gebunden.
- Die Testseite wurde am 13. November 2026 neu bereitgestellt.
- Der Vorstandstest am 13. November zeigte: **Entwurf speichern** meldete Erfolg und die gespeicherten Textdaten wurden in einem privaten Browserfenster wieder geladen.
- Die Live Webseite hat weiterhin keine entsprechende Freigabe erhalten.

Die KV Bindung bleibt **nur im Testprojekt**. Eine spätere Livefreigabe erfolgt separat.

## Sicherheitsgrenzen

- **Nie Entwürfe oder Gästedaten ins öffentliche GitHub Repository schreiben.**
- Die neue Draft API schreibt **ausschliesslich in das gebundene KV**, niemals auf GitHub.
- Der Editor hat keine echte Veröffentlichungsfunktion.
- Die Dateien dürfen keine privaten Anmeldelisten oder personenbezogenen Gästedaten enthalten.
- Neu im Browser hochgeladene Foto Dateien sind **nicht dauerhaft gespeichert**. Es werden nur bestehende, sichere Bildpfade in Textentwürfen akzeptiert.
- Falls die KV Bindung später fehlt oder nicht erreichbar ist, zeigt **Entwurf speichern** eine Fehlermeldung. Ein lokaler Zwischenstand ersetzt keine dauerhafte Speicherung.
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

## Fotoarchiv und R2, Stand November 2026

- Der Vorstand hat ein vorsorgliches Betriebsbudget für die Webseite bewilligt.
- Cloudflare R2 ist **noch nicht aktiviert**; es wird zunächst eine Zahlungsmöglichkeit des Vereins geklärt.
- Bestehende und öffentlich erreichbare Bildpfade können in privaten Evententwürfen gespeichert werden. Neue, über die Upload Felder ausgewählte Fotodateien bleiben **nur in der Browser Vorschau** und sind nicht dauerhaft gespeichert.
- Das Test Admin zeigt nun die Anzahl Galeriefotos und bietet zusätzlich zu Drag & Drop kleine Pfeile zum Ändern der Reihenfolge.
- Diese Änderungen erfolgen nur auf dem Testbranch `presentation-recovery-2026-11-10`. Eine Veröffentlichung auf `main` und die Einrichtung einer R2 Anbindung stehen noch aus.


## Mitgliederdaten an die Website anbinden (Stand 20.11.2026)

- Im Test Admin werden die fertig eingegebenen Mitgliederdaten zuerst mit **Alle Mitglieder als Entwurf speichern** privat gesichert. Das verändert die öffentliche Webseite nicht.
- Neu gibt es ausschliesslich in der Mitgliederliste die Aktion **Mitglieder auf Testwebsite übernehmen**. Nach deutlicher Bestätigung sichert sie den aktuellen Stand in Cloudflare KV und schreibt ausschliesslich die zur Veröffentlichung markierten Mitglieder in die Datei `members-data.json` auf dem **Testbranch**.
- Diese ausdrücklich freigegebene Datei enthält die öffentlichen Mitgliederprofile mit den gewünschten Kontaktinformationen. Es werden keine Login Informationen, Session Tokens, Gästelisten, Projekte oder andere Admin Daten publiziert.
- Die Startseite nutzt `/js/public-members.js`, um die Mitgliedslogos und Links aus dem genehmigten Snapshot auf `/mitglieder/profil.html?member=...` zu erzeugen. Ohne Snapshot bleiben die alten Logo Karten als Rückfalllösung erhalten.
- Die öffentliche Profilvorlage `/mitglieder/profil.html` liest **nur** `/members-data.json` und greift **niemals** auf die private Cloudflare KV API zu.
- Das Ganze wird bewusst erst auf dem Testbranch geprüft. Eine spätere Livefreigabe erfordert die Übernahme des getesteten Branches bzw. der geprüften öffentlichen Inhalte nach `main` und einen erfolgreichen Cloudflare Produktionsdeploy.
- Nach jeder Aktualisierung der Mitglieder erfolgt der gleiche explizite Testübernahme Schritt; `Entwurf speichern` allein veröffentlicht weiterhin nichts.
- **Launch Sperre:** Solange `members-data.json` nicht erstellt und die Mitgliederdetailseiten nicht visuell geprüft wurden, `main` NICHT aktualisieren. Test und Produktion verwenden unterschiedliche Cloudflare KV Konfigurationen.

## Vor Livefreigabe überprüfen

1. Alle Mitglieder korrekt und als öffentliche Profile markiert; Anzahl der sichtbaren Karten stimmt.
2. Foto, Logo, Firmenname, Beschreibung inklusive Formatierungen, Adresse, E-Mail, Telefon, externe Webseite und Social Links pro Profil im Test kontrolliert.
3. Navigation zur Startseite und zu den Mitgliedern; Smartphone und Desktop.
4. Events, bestehende Bildgalerien, Impressum, Datenschutz und Kontaktlinks unabhängig von der Mitgliederumstellung testen.
5. GitHub Branch und Cloudflare Produktionsbereitstellung verifizieren; nach Veröffentlichung erneut kontrollieren.
6. Bei Problemen den vorherigen `main` Commit als Rollback Referenz sichern und den erfolgreichen Zustand wiederherstellen.
