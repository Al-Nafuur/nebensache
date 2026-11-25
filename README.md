# Nebenkosten – Betriebskostenabrechnung im Browser

Eine kostenlose Web-App (PWA) für private Vermieter: Kosten erfassen, Wasserzähler ablesen,
Anteile berechnen und die Abrechnungen an die Mieter drucken oder als PDF speichern –
für beliebig viele Häuser und Jahre.

**Alle Daten bleiben auf Ihrem Gerät.** Die App speichert im Browser (localStorage) und
überträgt nichts an einen Server. Sie funktioniert nach dem ersten Aufruf auch offline und
lässt sich auf PC, Tablet und Handy wie eine App installieren.

## Funktionen

- Mehrere Objekte (Häuser) mit Wohnungen, Wohnflächen und eigenen Zählerarten
- Abrechnungsjahre mit Mietern, Nachmietern, Personenzahl und monatlichen Vorauszahlungen
- 17 Betriebskostenarten nach § 2 BetrKV, eigene Kostenarten möglich
- Umlageschlüssel: Wohnfläche × Tage, Personen × Tage, je Wohneinheit × Tage, Verbrauch laut Zähler
- Leerstand wird automatisch dem Vermieter zugerechnet
- Prüfungen: fehlende oder unplausible Zählerstände, überschneidende Mietzeiträume,
  Zählerstand beim Mieterwechsel, Leerstand, fehlende Angaben
- Ergebnis je Mieter mit Nachzahlung/Guthaben und Vorschlag für die neue Vorauszahlung
- Anschreiben je Mieter (A4, Fensterumschlag) mit eigenem Logo und Absender –
  die Berechnung jedes Postens ist für den Mieter nachvollziehbar aufgeführt
- Neues Jahr aus dem Vorjahr: Mieter, Zählerstände (neu → alt), Kostenarten und Vorauszahlungen werden übernommen
- Datensicherung als JSON-Datei (Export/Import), Objekte aus einer Datei hinzufügen

## Datensicherung

Die Daten liegen nur in dem Browser, in dem Sie sie eingegeben haben. Löschen Sie die
Browserdaten oder wechseln Sie das Gerät, sind sie weg. Laden Sie deshalb unter **Daten →
Sicherung herunterladen** regelmäßig eine Sicherung herunter. Mit derselben Datei lassen sich
die Daten auf einem anderen Gerät wiederherstellen.

## Hinweise zur Berechnung

- Zeitanteile werden tagesgenau berechnet (Mietzeitraum ∩ Abrechnungszeitraum).
- Bei Fläche und Wohneinheiten ist die Verteilungsgrundlage immer *alle* Wohnungen × Tage des
  Abrechnungszeitraums; nicht vermietete Tage trägt der Vermieter.
- Beim Verbrauch wird nach dem Anteil am Gesamtverbrauch aller Mieter-Zähler verteilt.
- Die Anschreiben zeigen je Posten den auf Cent gerundeten Betrag; die Summe ist die Summe der gerundeten Posten.
- Heiz- und Warmwasserkosten müssen nach der Heizkostenverordnung überwiegend nach Verbrauch
  verteilt werden – dafür eine eigene Zählerart anlegen.

Die App ersetzt keine Rechtsberatung. Prüfen Sie Ihre Abrechnung vor dem Versand.

## Entwicklung

Reines HTML, CSS und JavaScript (ES-Module), keine Abhängigkeiten, kein Build-Schritt.

```sh
python -m http.server 8000
# App:   http://localhost:8000/
# Tests: http://localhost:8000/tests/
```

`js/calc.js` enthält die gesamte Berechnung ohne DOM und ist in `tests/calc.test.js` getestet
(u. a. Vergleich mit einer bestehenden Excel-Abrechnung auf Bruchteile eines Cents).

**Neue Version veröffentlichen:** `VERSION` in `sw.js` und `APP_VERSION` in `js/app.js` erhöhen.
Installierte Apps zeigen dann „Neue Version verfügbar“.

## Veröffentlichen auf GitHub Pages

Repository → *Settings* → *Pages* → *Build and deployment*: „Deploy from a branch“,
Branch `main`, Ordner `/ (root)`. Die App ist danach unter
`https://<benutzername>.github.io/<repository>/` erreichbar.
