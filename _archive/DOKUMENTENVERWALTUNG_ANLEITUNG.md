# Dokumentenverwaltung - Erweiterte Suchfunktion

## Übersicht

Die Dokumentenverwaltung wurde mit einer leistungsstarken Volltextsuche und erweiterten Metadatenfeldern ausgestattet, damit Sie Ihre Dokumente einfach beschreiben und später schnell wiederfinden können.

## Neue Funktionen

### 1. Erweiterte Metadatenfelder

Beim Hochladen eines Dokuments können Sie jetzt folgende Informationen erfassen:

- **Betreff** (document_subject): Thema oder Betreff des Dokuments
- **Beschreibung** (description): Ausführliche Beschreibung des Inhalts
- **Absender** (sender): Von wem das Dokument stammt
- **Empfänger** (recipient): An wen das Dokument gerichtet ist
- **Referenznummer** (reference_number): Aktenzeichen, Rechnungsnummer, etc.
- **Dokumentdatum** (document_date): Datum des Dokuments (nicht Upload-Datum)
- **Tags**: Schlagwörter zur Kategorisierung

### 2. PostgreSQL Volltextsuche

Die Suchfunktion nutzt PostgreSQL's `tsvector` mit deutscher Wortstammerkennung:

**Gewichtung der Suchfelder:**
- **A (höchste Priorität)**: Dateiname, Betreff
- **B**: Beschreibung
- **C**: Absender, Empfänger
- **D**: Referenznummer

**Beispiele:**
- Suche nach "Rechnung Januar": Findet Dokumente mit diesen Begriffen im Betreff oder Namen
- Suche nach "Müller": Findet alle Dokumente von/an Müller
- Suche nach "2024": Findet Referenznummern oder Beschreibungen mit 2024

### 3. Erweiterte Filter

**Datumsfilter:**
- Von Datum - Bis Datum: Filtert nach dem Dokumentdatum

**Tag-Filter:**
- Mehrere Tags mit Komma getrennt eingeben

### 4. Verwendung

#### Einfache Suche:
1. Suchbegriff eingeben
2. "Suchen" klicken
3. Ergebnisse werden nach Relevanz sortiert

#### Erweiterte Suche:
1. "Erweiterte Suche ▼" klicken
2. Datumsbereich und/oder Tags eingeben
3. Mit Suchbegriff kombinieren
4. "Suchen" klicken

#### Dokument hochladen mit Metadaten:
1. "Dokument hochladen" klicken
2. Datei auswählen
3. **Wichtig**: Beschreibung und Metadaten sorgfältig ausfüllen
4. Tags für schnelle Kategorisierung verwenden
5. Hochladen

## Technische Details

### Datenbank-Migration

Die Migration `create_documents_table.sql` erstellt:

- **Tabelle `documents`** mit Metadatenfeldern
- **Spalte `search_vector`**: Automatisch generierter tsvector für Volltextsuche
- **GIN-Index**: Für schnelle Volltextsuche
- **Funktion `search_documents()`**: RPC-Funktion für flexible Suche

### API-Endpunkte

- **POST /api/admin/documents/upload**: Upload mit Metadaten
- **GET /api/admin/documents/search**: Volltextsuche mit Filtern
  - Query-Parameter: `q`, `folderId`, `dateFrom`, `dateTo`, `tags`

### Performance

- Der GIN-Index ermöglicht schnelle Suche auch bei tausenden Dokumenten
- Die deutsche Wortstammerkennung erkennt Wortformen (z.B. "Rechnung" findet auch "Rechnungen")
- Suchgewichtung priorisiert relevante Treffer

## Best Practices

1. **Beschreibung ausfüllen**: Je detaillierter, desto besser auffindbar
2. **Konsistente Tags verwenden**: Z.B. "Rechnung", "Vertrag", "Angebot"
3. **Betreff präzise formulieren**: Erleichtert spätere Suche
4. **Dokumentdatum setzen**: Nicht vergessen - wichtig für zeitliche Suche
5. **Referenznummern**: Aktenzeichen, Rechnungsnummern immer eintragen

## Migration ausführen

```bash
# Supabase CLI verwenden
supabase db push --local

# Oder manuell in Supabase Dashboard:
# - SQL Editor öffnen
# - Inhalt von create_documents_table.sql kopieren
# - Ausführen
```

## Wichtige Hinweise

- **Storage Bucket**: Der Bucket "documents" muss in Supabase Storage existieren
- **RLS Policies**: Policies sind aktiviert - nur Owner kann eigene Dokumente sehen
- **Suchsprache**: Die Suche ist auf Deutsch optimiert (to_tsvector('german', ...))
- **Maximale Dateigröße**: 50 MB

## Beispiel-Workflow

1. Gehen Sie zu `/admin/belgeleri-yonet`
2. Erstellen Sie Ordner nach Kategorien (Gelen/Gonderilen/Diger)
3. Laden Sie Dokumente hoch mit detaillierten Metadaten
4. Nutzen Sie die Suche, um Dokumente später wiederzufinden

**Beispiel:**
- Dokument: "Rechnung_ABC_Trade_Januar_2024.pdf"
- Betreff: "Rechnung Januar 2024"
- Beschreibung: "Monatsrechnung für Lieferung Süßwaren"
- Sender: "ABC Trade GmbH"
- Referenz: "RE-2024-001"
- Tags: "Rechnung, ABC Trade, 2024"

Später können Sie suchen nach:
- "ABC Trade" → Findet alle Dokumente von ABC Trade
- "Rechnung Januar" → Findet Rechnungen aus Januar
- "RE-2024" → Findet über Referenznummer
- Datumsfilter: 01.01.2024 - 31.01.2024 → Alle Januar-Dokumente
