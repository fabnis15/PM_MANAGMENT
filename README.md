# PM Manager

App desktop per **people manager**: gestione progetti, allocazione risorse, dashboard e alert automatici.

Sviluppata con Electron + React + TypeScript + SQLite. I dati sono salvati **localmente** sul dispositivo, nessun server richiesto.

---

## Avvio rapido

### Primo avvio (una volta sola)

```bash
npm run setup
```

Questo comando installa le dipendenze, scarica Electron e compila i moduli nativi.

### Avvio quotidiano

**Doppio click** su `Avvia PM Manager.vbs`

Oppure da terminale:

```bash
npm run dev
```

> L'app si avvia in ~5–10 secondi. Il file `.vbs` non mostra finestre di terminale.

### Collegamento Desktop (consigliato)

Tasto destro su `Avvia PM Manager.vbs` → **Invia a → Desktop (crea collegamento)**

---

## Requisiti di sistema

| Requisito | Versione |
|-----------|----------|
| Node.js | v18 o superiore |
| Sistema operativo | Windows 10/11, macOS 12+, Linux |
| Spazio disco | ~300 MB (incluse dipendenze) |

---

## Build distribuibile

Per creare un installer `.exe` (Windows), `.dmg` (macOS) o `.AppImage` (Linux):

```bash
npm run package
```

Il file di installazione viene generato nella cartella `dist/`. Non richiede Node.js sul computer destinatario.

---

## Funzionalità principali

### Dashboard
Panoramica immediata dello stato del team e dei progetti.

- Statistiche: progetti attivi, persone nel team, alert aperti, milestone in scadenza
- Grafico distribuzione progetti per stato
- Utilizzo del team nel mese corrente (verde < 80%, giallo 80–100%, rosso > 100%)
- Budget vs costo stimato per progetti attivi
- Lista milestone in scadenza nei prossimi 30 giorni
- Preview degli alert attivi

---

### Progetti
Gestione completa del portfolio progetti.

- Creazione e modifica progetto: nome, cliente, stato, date, budget, colore
- **Stati**: Pianificazione / Attivo / In pausa / Completato / Annullato
- Filtro rapido per stato
- Per ogni progetto: indicatore budget consumato, contatore milestone
- **Milestone inline**: espandi un progetto per vedere e gestire le milestone
  - Completamento con un click
  - Date scadenza con indicatore giorni rimanenti

---

### Persone
Anagrafica del team con utilizzo in tempo reale.

- Profilo: nome, ruolo, seniority, email, tariffa giornaliera (€), FTE
- **Indicatore allocazione** mese corrente con barra colorata
- Conteggio progetti attivi nel mese

---

### Allocazioni
Gestione dell'allocazione delle persone sui progetti.

**Vista Gantt** — timeline grafica:
- Raggruppamento per persona o per progetto
- Barre colorate per ogni allocazione, con stacking automatico in caso di sovrapposizione
- Zoom: 3 / 6 / 12 mesi
- Navigazione avanti/indietro nel tempo
- Linea "oggi" in evidenza
- Tooltip con dettagli al passaggio del mouse

**Vista Matrice** — griglia persone × mesi:
- 6 mesi dal corrente
- Ogni cella mostra i progetti allocati con le relative percentuali
- Colori: verde (< 80%), giallo (80–100%), rosso (> 100%)

**Vista Lista** — tabella con filtro per persona:
- Tutti i dettagli: persona, progetto, periodo, %, note
- Modifica e cancellazione inline

---

### Alert
Sistema di notifiche automatiche, ricalcolate ad ogni modifica.

| Tipo | Condizione |
|------|-----------|
| **Sovra-allocazione** | Una persona supera la soglia % in un mese (prossimi 6 mesi) |
| **Budget** | Il costo stimato supera la soglia % del budget del progetto |
| **Scadenza progetto** | Un progetto attivo termina entro N giorni |
| **Milestone** | Una milestone non completata scade entro N giorni |

Severità **Critico** (rosso) o **Avvertimento** (giallo). Contatore nella barra laterale.

---

### Impostazioni
Tutte le soglie sono configurabili:

| Impostazione | Default |
|-------------|---------|
| Soglia sovra-allocazione | 100% |
| Soglia avvertimento budget | 80% |
| Giorni avviso scadenze | 14 giorni |
| Giorni lavorativi/settimana | 5 |
| Ore lavorative/giorno | 8 |

---

## Struttura del progetto

```
PM_Managment/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # Finestra e IPC handlers
│   │   └── database.ts     # SQLite — schema e query
│   ├── preload/
│   │   └── index.ts        # Bridge sicuro renderer ↔ main
│   └── renderer/src/
│       ├── components/
│       │   ├── Dashboard/
│       │   ├── Projects/
│       │   ├── People/
│       │   ├── Allocations/ # Gantt, Matrice, Lista
│       │   ├── Alerts/
│       │   ├── Settings/
│       │   └── Layout/
│       ├── store/
│       │   └── useStore.ts  # Stato globale (Zustand) + calcolo alert
│       └── types/
│           └── index.ts     # Interfacce TypeScript
├── Avvia PM Manager.vbs    # Launcher silenzioso
├── Avvia PM Manager.bat    # Launcher con terminale
├── REQUISITI.md            # Requisiti implementati e da sviluppare
└── package.json
```

---

## Dati e privacy

Il database SQLite è salvato in:
- **Windows**: `C:\Users\<utente>\AppData\Roaming\PM Management\pm-management.db`
- **macOS**: `~/Library/Application Support/PM Management/pm-management.db`
- **Linux**: `~/.config/PM Management/pm-management.db`

Nessun dato viene inviato a server esterni. Tutto rimane sul dispositivo locale.

---

## Prossime funzionalità

- Export Excel (persone, progetti, allocazioni)
- Report PDF per progetto
- Vista calendario milestone
- Ricerca globale (`Ctrl+K`)
- Import da Excel / Jira / SharePoint

Vedi [REQUISITI.md](REQUISITI.md) per il dettaglio completo.

---

## Stack tecnologico

| Tecnologia | Versione | Utilizzo |
|-----------|----------|---------|
| Electron | 29 | Desktop wrapper cross-platform |
| React | 18 | UI |
| TypeScript | 5 | Tipizzazione |
| Vite + electron-vite | 5 | Build e dev server |
| SQLite (better-sqlite3) | 9 | Database locale |
| Zustand | 4 | State management |
| Recharts | 2 | Grafici dashboard |
| Tailwind CSS | 3 | Stile |
| date-fns | 3 | Manipolazione date |
| lucide-react | — | Icone |
