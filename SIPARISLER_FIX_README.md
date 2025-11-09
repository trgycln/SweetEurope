# Siparisler Filter Fehler - Lösung

## Problem
Der Admin Siparisler (Bestellungen) Filter gibt einen leeren Fehler zurück:
```
Fehler beim Laden von Bestellungen oder Firmen: {}
```

## Ursache
**Row Level Security (RLS)** Policies fehlen für die Tabellen `siparisler` und `firmalar`. 

### Diagnose-Ergebnisse:
- ✅ Mit Service Role Key (umgeht RLS): **14 Bestellungen gefunden**
- ❌ Mit Anon Key (respektiert RLS): **0 Bestellungen gefunden**

Das bedeutet, die Daten existieren, aber die RLS-Policies blockieren den Zugriff für authentifizierte Benutzer.

## Lösung

### Schritt 1: Migration in Supabase ausführen

Öffnen Sie die Supabase Console und führen Sie die SQL-Migration aus:

1. Gehen Sie zu **SQL Editor** in Ihrer Supabase Console
2. Öffnen Sie die Datei: `supabase-migrations/create_siparisler_firmalar_rls.sql`
3. Kopieren Sie den gesamten Inhalt
4. Fügen Sie ihn in den SQL Editor ein
5. Klicken Sie auf **Run**

### Schritt 2: RLS-Policies überprüfen

Nach der Ausführung sollten folgende Policies existieren:

#### Für `siparisler`:
- ✅ Admin und Ekip Üyesi sehen alle Bestellungen (SELECT)
- ✅ Kunden sehen nur Bestellungen ihrer Firma (SELECT)
- ✅ Admin und Ekip können erstellen (INSERT)
- ✅ Admin und Ekip können aktualisieren (UPDATE)
- ✅ Admin kann löschen (DELETE)

#### Für `firmalar`:
- ✅ Admin und Ekip Üyesi sehen alle Firmen (SELECT)
- ✅ Kunden sehen nur ihre eigene Firma (SELECT)
- ✅ Admin und Ekip können Firmen verwalten (ALL)

### Schritt 3: Testen

Führen Sie das Test-Skript aus, um zu überprüfen, ob RLS jetzt funktioniert:

```powershell
node scripts/test-rls-siparisler.mjs
```

**Erwartetes Ergebnis nach RLS-Fix:**
```
✅ Anon Key: 14 Bestellungen gefunden
```

(Vorausgesetzt, Sie sind als Admin oder Ekip Üyesi eingeloggt)

## Verbesserungen in diesem Commit

1. **Detailliertes Error-Logging**: 
   - Zeigt jetzt `message`, `details`, `hint`, `code` vom Supabase-Fehler
   - Hilft bei zukünftiger Fehlersuche

2. **Vereinfachte Query-Syntax**:
   - Verwendet automatische Foreign Key Erkennung
   - Reduziert Fehleranfälligkeit

3. **Test-Skripte**:
   - `test-siparisler-query.mjs`: Testet verschiedene Query-Syntaxen
   - `test-rls-siparisler.mjs`: Vergleicht Service Role vs. Anon Key Zugriff

4. **RLS Migration**:
   - Vollständige RLS-Policies für rollenbasierten Zugriff
   - Unterscheidet zwischen Admin/Ekip und Kunden

## Technische Details

### Warum trat der Fehler auf?

Next.js verwendet server-seitig den **Anon Key** mit dem **aktuellen User-Token**. RLS-Policies entscheiden, welche Daten dieser User sehen darf. Ohne Policies gibt Supabase ein leeres Result-Set zurück, was nicht als Fehler interpretiert wird, aber die Filter-Funktionalität blockiert.

### Warum war der Fehler ein leeres Objekt `{}`?

Supabase gibt bei RLS-Blockierung keinen expliziten Fehler zurück, sondern ein leeres Result-Set. Der Code interpretierte dies fälschlicherweise als Fehler.

## Nächste Schritte

Nach der Migration sollte:
1. Der Admin-Bereich alle Bestellungen anzeigen
2. Die Filter (Status, Firma, Suche) funktionieren
3. Kunden im Portal nur ihre eigenen Bestellungen sehen

## Support

Falls der Fehler weiterhin auftritt:
1. Überprüfen Sie die RLS-Policies in Supabase Console (Authentication > Policies)
2. Prüfen Sie das Benutzer-Profil: Hat der User die Rolle 'Yönetici' oder 'Ekip Üyesi'?
3. Führen Sie `node scripts/test-rls-siparisler.mjs` aus und senden Sie das Ergebnis
