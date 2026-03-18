# Requisiti PM Manager

## Stato: v1.1.0

---

## ✅ Requisiti implementati

### R01 — Gestione Persone
- Anagrafica risorse: nome, ruolo, seniority (junior/mid/senior/lead/manager), email
- Tariffa giornaliera (€) e FTE (Full Time Equivalent, 0–1)
- Colore identificativo per visualizzazioni grafiche
- Indicatore allocazione mese corrente (% con barra colorata)
- Conteggio progetti attivi per persona nel mese corrente
- CRUD completo (crea, modifica, elimina) con conferma eliminazione

### R02 — Gestione Progetti
- Anagrafica progetto: nome, cliente, descrizione, date inizio/fine
- Stati: Pianificazione / Attivo / In pausa / Completato / Annullato
- Budget totale (€) con calcolo costo stimato da allocazioni
- Indicatore avanzamento budget (% costo stimato vs budget con barra)
- Colore identificativo
- Filtro per stato
- CRUD completo con conferma eliminazione
- Cascade delete: elimina anche allocazioni e milestone associate

### R03 — Milestone
- Collegate a un progetto
- Nome, data scadenza, descrizione
- Flag completato (toggle diretto dalla lista)
- Visibili in espansione inline nella scheda progetto
- CRUD completo

### R04 — Gestione Allocazioni
- Allocazione persona su progetto con: date inizio/fine, percentuale (10–200%), note
- Slider visuale per la percentuale
- **Vista Matrice** (default): persone × 6 mesi, celle con breakdown per progetto, colori verde/giallo/rosso
- **Vista Lista**: tabella filtrabile per persona, con badge colorati per %
- **Vista Gantt**: timeline grafica con:
  - Raggruppamento per persona o per progetto
  - Lane stacking automatico per allocazioni sovrapposte
  - Zoom 3/6/12 mesi con navigazione avanti/indietro
  - Linea rossa "oggi"
  - Tooltip hover con dettagli
- CRUD completo

### R05 — Alert Automatici
- Calcolo automatico ad ogni modifica dei dati
- **Sovra-allocazione**: alert se una persona supera la soglia % in un mese (verifica sui prossimi 6 mesi)
- **Budget**: alert se il costo stimato supera la soglia % del budget
- **Scadenza progetto**: alert se un progetto attivo termina entro N giorni
- **Milestone**: alert se una milestone non completata scade entro N giorni
- Severità: Critico (rosso) / Avvertimento (giallo)
- Contatore alert nella sidebar con badge colorato
- Visualizzazione categorizzata nella pagina Alert

### R06 — Dashboard
- Statistiche riepilogative: progetti attivi, persone nel team, alert aperti, milestone prossime 30 giorni
- Grafico a ciambella: distribuzione progetti per stato
- Grafico a barre orizzontale: utilizzo team nel mese corrente
- Grafico a barre doppio: budget vs costo stimato per progetti attivi
- Lista milestone in scadenza (prossimi 30 giorni) con indicatore giorni rimanenti
- Preview alert attivi (primi 4)

### R07 — Impostazioni
- Soglia sovra-allocazione (default 100%)
- Soglia avvertimento budget (default 80%)
- Giorni avviso scadenze (default 14)
- Giorni lavorativi per settimana (default 5)
- Ore lavorative per giorno (default 8)
- Salvataggio persistente nel database locale

### R08 — Infrastruttura
- App desktop standalone (Electron 29)
- Database SQLite locale (`~/.config/PM Management/pm-management.db`)
- Dati persistenti tra sessioni
- Cascade delete via foreign key
- Avvio tramite file `.vbs` (doppio click, nessuna finestra terminale)
- Cross-platform: Windows / macOS / Linux
- Build distribuibile via `npm run package` (installer .exe / .dmg / .AppImage)

---

## 🔜 Requisiti da sviluppare

### R09 — Export Excel *(priorità alta)*
- Export tabella Persone (nome, ruolo, seniority, tariffa, FTE)
- Export tabella Progetti (nome, cliente, stato, date, budget, costo stimato)
- Export tabella Allocazioni (persona, progetto, periodo, %)
- Export matrice allocazioni (persone × mesi)
- Formato `.xlsx` con fogli separati per entità
- Pulsante export nelle rispettive pagine

### R10 — Report PDF *(priorità alta)*
- Report per singolo progetto:
  - Copertina con nome, cliente, stato, date
  - Riepilogo budget vs costo stimato
  - Lista milestone con stato
  - Lista persone allocate con % e periodo
  - Grafico Gantt del progetto
- Report riepilogativo team (tutti i progetti attivi)
- Export da pagina Progetti

### R11 — Vista Calendario *(priorità media)*
- Vista mensile con milestone e scadenze progetto
- Navigazione mese per mese
- Click su evento per dettaglio
- Evidenziazione milestone scadute / in scadenza / future
- Integrazione nella sidebar come sezione dedicata o tab in Dashboard

### R12 — Ricerca Globale *(priorità media)*
- Barra di ricerca accessibile da qualsiasi pagina (shortcut `Ctrl+K`)
- Ricerca su: nome progetto, nome persona, nome milestone
- Risultati categorizzati con navigazione rapida alla pagina relativa

### R13 — Import da Excel *(priorità media)*
- Import persone da foglio Excel (.xlsx)
- Import progetti da foglio Excel
- Import allocazioni da foglio Excel
- Validazione dati con anteprima prima del salvataggio
- Gestione duplicati (aggiorna o ignora)

### R14 — Import da Jira *(priorità bassa)*
- Connessione tramite API Jira (URL + token)
- Import progetti da board Jira
- Mappatura stati Jira → stati app
- Sync milestone da epic/sprint Jira

### R15 — Import da SharePoint *(priorità bassa)*
- Connessione tramite Microsoft Graph API
- Import liste SharePoint come persone/progetti
- Export verso liste SharePoint

### R16 — Storico Attività *(priorità bassa)*
- Log delle modifiche: chi ha cambiato cosa e quando
- Visualizzazione timeline per progetto o persona
- Possibilità di ripristino (undo) delle ultime N modifiche

### R17 — Costi Dettagliati *(priorità bassa)*
- Breakdown costo per persona × progetto
- Timesheet manuale (ore effettive vs pianificate)
- Confronto pianificato vs consuntivo
- Grafici trend costo nel tempo

---

## Legenda priorità
| Priorità | Descrizione |
|----------|-------------|
| Alta | Funzionalità richiesta a breve, alto impatto operativo |
| Media | Utile ma non bloccante |
| Bassa | Funzionalità avanzata, pianificata per versioni future |
