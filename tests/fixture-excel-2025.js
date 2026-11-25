// Nebensache – Copyright (C) 2026 Wolfgang Stubig
// SPDX-License-Identifier: GPL-3.0-or-later
// Sollwerte nach der Logik der Excel-Vorlage (Python-Nachbildung, gegen LibreOffice geprüft). Anonymisiert.
export const objekt = {
 "id": "o1",
 "name": "Testobjekt (Excel-Vergleich)",
 "strasse": "",
 "plzOrt": "",
 "wohnungen": [
  {
   "id": "w1",
   "bezeichnung": "WE 1",
   "lage": "",
   "flaeche": 55
  },
  {
   "id": "w2",
   "bezeichnung": "WE 2",
   "lage": "",
   "flaeche": 63
  },
  {
   "id": "w3",
   "bezeichnung": "WE 3",
   "lage": "",
   "flaeche": 56
  },
  {
   "id": "w4",
   "bezeichnung": "WE 4",
   "lage": "",
   "flaeche": 65
  },
  {
   "id": "w5",
   "bezeichnung": "WE 5",
   "lage": "",
   "flaeche": 56
  },
  {
   "id": "w6",
   "bezeichnung": "WE 6",
   "lage": "",
   "flaeche": 65
  },
  {
   "id": "w7",
   "bezeichnung": "WE 7",
   "lage": "",
   "flaeche": 35
  },
  {
   "id": "w8",
   "bezeichnung": "WE 8",
   "lage": "",
   "flaeche": 36
  }
 ],
 "zaehlerarten": [
  {
   "id": "kw",
   "name": "Kaltwasser",
   "einheit": "m³"
  }
 ],
 "vermieter": {
  "name": "",
  "anschrift": "",
  "kontakt": "",
  "bank": "",
  "logo": null
 },
 "jahre": []
};
export const jahr = {
 "id": "j1",
 "jahr": 2025,
 "von": "2025-01-01",
 "bis": "2025-12-31",
 "kosten": [
  {
   "id": "k0",
   "name": "Grundsteuer",
   "betrag": 1178.88,
   "schluessel": "flaeche",
   "zaehlerart": null,
   "notiz": ""
  },
  {
   "id": "k1",
   "name": "Straßenreinigung / Müllabfuhr / Winterdienst",
   "betrag": 1260.48,
   "schluessel": "flaeche",
   "zaehlerart": null,
   "notiz": ""
  },
  {
   "id": "k2",
   "name": "Schornsteinreinigung",
   "betrag": 372.91,
   "schluessel": "flaeche",
   "zaehlerart": null,
   "notiz": ""
  },
  {
   "id": "k3",
   "name": "Versicherungen",
   "betrag": 3257.22,
   "schluessel": "flaeche",
   "zaehlerart": null,
   "notiz": ""
  },
  {
   "id": "k4",
   "name": "Hauswart",
   "betrag": 1200.0,
   "schluessel": "flaeche",
   "zaehlerart": null,
   "notiz": ""
  },
  {
   "id": "k5",
   "name": "Wasserkosten",
   "betrag": 2180.0,
   "schluessel": "verbrauch",
   "zaehlerart": "kw",
   "notiz": ""
  },
  {
   "id": "k6",
   "name": "Abwasser",
   "betrag": 2015.7,
   "schluessel": "verbrauch",
   "zaehlerart": "kw",
   "notiz": ""
  }
 ],
 "mietverhaeltnisse": [
  {
   "id": "m9",
   "wohnungId": "w1",
   "mieter": "Mieter Zeile 9",
   "personen": 2,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 1005.3,
     "neu": 1024.3
    }
   },
   "vorauszahlungen": [
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m12",
   "wohnungId": "w2",
   "mieter": "Mieter Zeile 12",
   "personen": 3,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 2231.3,
     "neu": 2253.3
    }
   },
   "vorauszahlungen": [
    130,
    130,
    130,
    130,
    130,
    130,
    130,
    130,
    130,
    130,
    130,
    130
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m15",
   "wohnungId": "w3",
   "mieter": "Mieter Zeile 15",
   "personen": 3,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 1634,
     "neu": 1659
    }
   },
   "vorauszahlungen": [
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m18",
   "wohnungId": "w4",
   "mieter": "Mieter Zeile 18",
   "personen": 4,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 2545.2,
     "neu": 2573.2
    }
   },
   "vorauszahlungen": [
    110,
    110,
    110,
    110,
    110,
    110,
    110,
    110,
    110,
    110,
    110,
    110
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m21",
   "wohnungId": "w5",
   "mieter": "Mieter Zeile 21",
   "personen": 1,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 894.3,
     "neu": 925.3
    }
   },
   "vorauszahlungen": [
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    80
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m24",
   "wohnungId": "w6",
   "mieter": "Mieter Zeile 24",
   "personen": 4,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 3640.9,
     "neu": 3674.9
    }
   },
   "vorauszahlungen": [
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90,
    90
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m27",
   "wohnungId": "w7",
   "mieter": "Mieter Zeile 27",
   "personen": 3,
   "von": "2025-01-01",
   "bis": "2025-01-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 984.6,
     "neu": 1021.6
    }
   },
   "vorauszahlungen": [
    70,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m28",
   "wohnungId": "w7",
   "mieter": "Mieter Zeile 28",
   "personen": null,
   "von": "2025-02-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 0,
     "neu": 38
    }
   },
   "vorauszahlungen": [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
   ],
   "neuerAbschlag": null
  },
  {
   "id": "m30",
   "wohnungId": "w8",
   "mieter": "Mieter Zeile 30",
   "personen": 2,
   "von": "2025-01-01",
   "bis": "2025-12-31",
   "vermieter": false,
   "zaehler": {
    "kw": {
     "alt": 277.7,
     "neu": 317.7
    }
   },
   "vorauszahlungen": [
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50,
    50
   ],
   "neuerAbschlag": null
  }
 ],
 "abrechnungsdatum": null,
 "hinweis": ""
};
export const erwartet = [
 {
  "id": "m9",
  "tage": 365,
  "summe": 1218.6038376208783,
  "vz": 1080
 },
 {
  "id": "m12",
  "tage": 365,
  "summe": 1399.4746877910816,
  "vz": 1560
 },
 {
  "id": "m15",
  "tage": 365,
  "summe": 1327.3470460819346,
  "vz": 600
 },
 {
  "id": "m18",
  "tage": 365,
  "summe": 1525.0844623774283,
  "vz": 1320
 },
 {
  "id": "m21",
  "tage": 365,
  "summe": 1419.2236884177012,
  "vz": 960
 },
 {
  "id": "m24",
  "tage": 365,
  "summe": 1616.9611047131948,
  "vz": 1080
 },
 {
  "id": "m27",
  "tage": 31,
  "summe": 616.7102284110335,
  "vz": 70
 },
 {
  "id": "m28",
  "tage": 334,
  "summe": 1122.0776151711975,
  "vz": 0
 },
 {
  "id": "m30",
  "tage": 365,
  "summe": 1219.7073294155502,
  "vz": 600
 }
];
export const gesamt = {"kosten": 11465.19, "flaecheTage": 157315, "verbrauch": 274.0};
