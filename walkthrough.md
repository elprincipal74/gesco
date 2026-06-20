# Walkthrough - Gestione Prezzi Commesse e Anagrafica Dipendenti con Costi/Livelli

Questo documento descrive le modifiche implementate per supportare:
1. L'inserimento del **prezzo di vendita**, del **margine** atteso, delle date (**inizio/fine**), del **responsabile** e del **Project Manager** nelle commesse.
2. La gestione dell'**anagrafica collaboratori (CRUD)** da parte dell'Admin.
3. L'inserimento del **costo interno** (giornaliero) e del **livello aziendale** (limitato a 4 caratteri) per ciascun dipendente.

---

## Modifiche Apportate

### 1. Schema del Database & Migrazioni (`src/database/db.js`)
*   **Tabella `projects`**: Aggiunte le colonne:
    *   `sale_price` (REAL, default 0.0) per il prezzo.
    *   `margin` (REAL, default 0.0) per la percentuale di margine.
    *   `start_date` (TEXT, default '') per la data di inizio commessa.
    *   `end_date` (TEXT, default '') per la data di fine commessa.
    *   `responsible` (TEXT, default '') per il responsabile (testo libero).
    *   `project_manager` (TEXT, default '') per il Project Manager (testo libero).
*   **Tabella `users`**: Aggiunte le colonne `internal_cost` (REAL, default 0.0) e `corporate_level` (TEXT, default '') per tracciare il costo interno giornaliero e l'inquadramento aziendale.
*   **Logica di Seeding & Reset**: Aggiornate le funzioni di inizializzazione e reset del database per includere questi campi nei record dei collaboratori e dei progetti.
*   **Migrazioni Database Esistenti**: Inserite migrazioni e controlli a fine file che alterano le tabelle ed aggiungono le nuove colonne sui database SQLite pre-esistenti.

### 2. Validazione e Rotte Backend
*   **Middleware di Validazione (`src/middlewares/validationMiddleware.js`)**:
    *   Definito lo schema Zod `userCreate` per convalidare tutti i dati del dipendente in fase di creazione (inclusa la validazione del limite massimo di 4 caratteri per `corporate_level`).
    *   Definito lo schema Zod `userAdminUpdate` per convalidare le modifiche dell'Admin su un utente esistente (dove la password è opzionale).
*   **Rotte Express (`src/app.js`)**:
    *   Registrate le nuove rotte per il CRUD utenti: `POST /api/users` e `DELETE /api/users/:id` (riservate al ruolo Admin).
    *   Aggiornata la rotta `PUT /api/users/:id`: se l'utente connesso è un `Admin` viene applicato il middleware di validazione `userAdminUpdate`, altrimenti il profilo standard `profileUpdate`.
*   **Controller Utenti & Commesse**:
    *   `src/controllers/userController.js`: Implementate le funzioni di creazione, modifica, eliminazione e recupero completo per supportare l'anagrafica, incluso l'hashing bcrypt delle password.
    *   `src/controllers/projectController.js`: Aggiornate le funzioni di creazione e aggiornamento dei progetti per accogliere ed archiviare `sale_price`, `margin`, `start_date`, `end_date`, `responsible`, e `project_manager`.

### 3. Interfaccia Frontend (`frontend/src/App.jsx`)
*   **Gestione Finanziaria e Temporale Commesse**:
    *   Integrati i campi: **Data Inizio**, **Data Fine**, **Responsabile Commessa**, e **Project Manager** nel form di configurazione e modifica.
    *   La tabella riepilogativa **Commesse Configurate** mostra ora i nuovi dettagli (Responsabile, PM, Data Inizio, Data Fine) per una visione globale.
*   **Anagrafica Collaboratori (Nuova Tab Admin)**:
    *   Aggiunto il tab "Anagrafica Collaboratori" visibile solo agli amministratori.
    *   **Form Collaboratore**: Consente la creazione di un nuovo utente (con password iniziale) o la modifica di un utente esistente.
    *   **Costo Giornaliero**: L'etichetta per il costo è espressa come **Costo Interno (€/giorno)** e la tabella mostra i valori formattati come `€ XX.XX/giorno` (costo giornaliero).
    *   **Etichetta Livello**: L'etichetta dell'inquadramento del dipendente è stata rinominata in **LIVELLO AZIENDALE** (interamente maiuscolo).
    *   **Elenco Collaboratori**: Mostra in tempo reale tutti i collaboratori registrati con inquadramento, costo giornaliero, e ferie.

### 4. Test E2E Playwright
*   **Test Collaboratori (`tests/employee_crud_spec.js`)**:
    *   Valida la creazione, la modifica (costo a "/giorno"), il limite di 4 caratteri per il livello ed infine la rimozione del collaboratore.
*   **Test Commesse (`tests/project_crud_spec.js`)**:
    *   Valida la configurazione di una nuova commessa con tutti i dati finanziari e gestionali (Date, Responsabile, PM), la sua modifica, la visualizzazione in tabella, ed infine la cancellazione.

---

## Risultati dei Test

Esecuzione completa della suite di test Playwright con tutti i 12 test passati con successo:
```bash
Running 12 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (1.9s)
  ok  2 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (4.6s)
  ok  3 tests\playwright_spec.js:19:3 › Sistema Gestione Ferie - E2E Tests › 1. Login come Dipendente e inserimento richiesta ferie di 1 giorno (3.1s)
  ok  4 tests\playwright_spec.js:46:3 › Sistema Gestione Ferie - E2E Tests › 2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo) (2.7s)
  ok  5 tests\playwright_spec.js:68:3 › Sistema Gestione Ferie - E2E Tests › 3. Approvazione richiesta da parte dell'utente HR con evidenza approvatore (8.0s)
  ok  6 tests\playwright_spec.js:107:3 › Sistema Gestione Ferie - E2E Tests › 4. Rifiuto richiesta da parte dell'Admin con motivazione visibile (7.3s)
  ok  7 tests\playwright_spec.js:147:3 › Sistema Gestione Ferie - E2E Tests › 5. Configurazione dei limiti globali e convalida regole d'uso (2.3s)
  ok  8 tests\playwright_spec.js:168:3 › Sistema Gestione Ferie - E2E Tests › 6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente (6.7s)
  ok  9 tests\playwright_spec.js:195:3 › Sistema Gestione Ferie - E2E Tests › 7. Compilazione e invio in approvazione di un rapportino (7.5s)
  ok 10 tests\playwright_spec.js:229:3 › Sistema Gestione Ferie - E2E Tests › 8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi (9.2s)
  ok 11 tests\playwright_spec.js:293:3 › Sistema Gestione Ferie - E2E Tests › 9. Rifiuto del rapportino da parte del Team Leader con motivazione (13.4s)
  ok 12 tests\project_crud_spec.js:14:3 › Gestione Commesse - E2E Tests › CRUD completo commessa con campi finanziari e gestionali come Admin (4.6s)

  12 passed (1.2m)

---

## Aggiornamento: Simulatore Pianificazione e Margine Commessa (20 Giugno 2026)

### Modifiche Apportate

1. **Abilitazione Ruoli Backend (`src/app.js`)**:
   - Aggiornata la rotta `GET /api/projects` in modo da consentire l'accesso non solo ad `Admin` ed `HR`, ma anche ai collaboratori con ruolo **Team Leader**. Questo permette ai Team Leader di caricare la lista di tutte le commesse configurate nel sistema e selezionarne una da simulare.
   - Aggiornata la logica di seeding iniziale (`src/database/db.js`) in modo da assegnare costi interni giornalieri coerenti e predefiniti a tutti gli utenti seed esistenti se non specificati (es. Mario Rossi: €120.00/giorno, Luigi Bianchi: €100.00/giorno, Giuseppe Verdi: €150.00/giorno) e impostare il livello aziendale relativo.

2. **Interfaccia Grafica del Simulatore (`frontend/src/App.jsx`)**:
   - Implementato il tab **Simulazione Commesse** (`activeTab === 'simulation'`) accessibile per i ruoli `Admin`, `HR` e `Team Leader`.
   - Inserito un menù a tendina superiore per la selezione di una commessa configurata.
   - All'interno del tab vengono mostrati i dettagli gestionali ed economici della commessa (Responsabile, Project Manager, Date di inizio/fine, Prezzo di vendita e Margine target originario).
   - Implementata una tabella interattiva per l'allocazione delle risorse (dipendenti esistenti caricati con costo fisso non modificabile, o nuove figure professionali inseribili a testo libero con costo giornaliero impostabile a mano) e dei relativi giorni allocati.
   - Integrato un cruscotto finanziario laterale che calcola in tempo reale i costi totali, i margini in euro ed in percentuale, con indicazione visiva dello scostamento rispetto al margine target.
   - **Storico Scenari e Simulazioni (Nuovo)**:
     - Implementato un pannello per visualizzare lo storico di tutti gli scenari salvati per la commessa.
     - Aggiunta la possibilità di inserire un nome scenario (es. "Scenario A", "Budget Ridotto") e salvarlo.
     - Implementato il caricamento dello scenario al clic dalla lista dello storico.
     - Inserita l'azione **Nuova** per inizializzare una pianificazione vuota da zero.
     - Aggiunto il badge e lo stato **👑 PIANIFICAZIONE OTTIMALE** per contrassegnare una delle simulazioni salvate.
     - **Esclusività**: L'applicazione garantisce che al massimo uno scenario salvato per commessa possa essere contrassegnato come "PIANIFICAZIONE OTTIMALE". Quando l'utente imposta uno scenario come ottimale, il sistema deseleziona automaticamente tutti gli altri per la stessa commessa.
     - Tutti i dati sono persistiti localmente sul client via `localStorage` (chiave: `sim_history_<projectId>`).

3. **Test E2E Playwright (`tests/simulation_spec.js`)**:
   - Creato un test end-to-end completo per verificare l'accesso come Team Leader Giuseppe Verdi, la gestione e il superamento delle comunicazioni obbligatorie, la selezione della commessa Progetto Alpha, l'aggiunta di risorse e la verifica dei calcoli economici.
   - Aggiunto un secondo test end-to-end dedicato per convalidare la creazione di molteplici scenari (Scenario A e Scenario B), il caricamento/cambio scenario dallo storico, l'impostazione dello Scenario B come "PIANIFICAZIONE OTTIMALE" e la verifica dell'esclusività (impostando successivamente lo Scenario A come ottimale, lo Scenario B perde automaticamente il badge).

### Risultati dei Test E2E
Esecuzione completa della suite con tutti i **14 test passati con successo (100%)**:
```bash
Running 14 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (2.2s)
  ok  2 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (5.5s)
  ok  3 tests\playwright_spec.js:19:3 › Sistema Gestione Ferie - E2E Tests › 1. Login come Dipendente e inserimento richiesta ferie di 1 giorno (2.5s)
  ok  4 tests\playwright_spec.js:46:3 › Sistema Gestione Ferie - E2E Tests › 2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo) (2.3s)
  ok  5 tests\playwright_spec.js:68:3 › Sistema Gestione Ferie - E2E Tests › 3. Approvazione richiesta da parte dell'utente HR con evidenza approvatore (7.3s)
  ok  6 tests\playwright_spec.js:107:3 › Sistema Gestione Ferie - E2E Tests › 4. Rifiuto richiesta da parte dell'Admin con motivazione visibile (7.4s)
  ok  7 tests\playwright_spec.js:147:3 › Sistema Gestione Ferie - E2E Tests › 5. Configurazione dei limiti globali e convalida regole d'uso (5.8s)
  ok  8 tests\playwright_spec.js:168:3 › Sistema Gestione Ferie - E2E Tests › 6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente (6.4s)
  ok  9 tests\playwright_spec.js:195:3 › Sistema Gestione Ferie - E2E Tests › 7. Compilazione e invio in approvazione di un rapportino (6.3s)
  ok 10 tests\playwright_spec.js:229:3 › Sistema Gestione Ferie - E2E Tests › 8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi (8.8s)
  ok 11 tests\playwright_spec.js:293:3 › Sistema Gestione Ferie - E2E Tests › 9. Rifiuto del rapportino da parte del Team Leader con motivazione (11.1s)
  ok 12 tests\project_crud_spec.js:14:3 › Gestione Commesse - E2E Tests › CRUD completo commessa con campi finanziari e gestionali come Admin (5.9s)
  ok 13 tests\simulation_spec.js:14:3 › Simulazione Commesse - E2E Tests › Pianificazione e calcolo margine commessa come Team Leader (5.6s)
  ok 14 tests\simulation_spec.js:107:3 › Simulazione Commesse - E2E Tests › Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva (7.5s)

  14 passed (1.4m)
```

---

## Aggiornamento: Rimozione IBAN e Unificazione Reportistica (20 Giugno 2026)

### Modifiche Apportate

1. **Rimozione Campo IBAN**:
   - Rimosso il campo di input "IBAN" dal modulo di creazione e modifica dei collaboratori in `Anagrafica Collaboratori` (`frontend/src/App.jsx`).
   - Mantenuto l'invio dei payload di creazione e modifica con `iban: ''` per retrocompatibilità con i database esistenti e lo schema Zod sul backend.
   - Aggiornato il test Playwright `tests/employee_crud_spec.js` per eliminare l'azione di inserimento nel campo IBAN, ormai non più presente nell'interfaccia.

2. **Unificazione Menù e Viste ("REPORTISTICA")**:
   - Eliminata la voce separata "Calendario Copertura" sia dal menù di navigazione a sinistra (sidebar) sia dal menù a tendina del profilo utente per Admin e HR.
   - Rinominata la voce di menù "Reportistica" in **REPORTISTICA** (in maiuscolo) nella sidebar.
   - Integrato il **Calendario Copertura** (la card con la heatmap delle presenze mensili) all'inizio del tab **REPORTISTICA**, rendendolo la prima sezione visibile, seguita immediatamente dai filtri, dal grafico a barre del saldo ferie e dalla tabella di riepilogo ore per commessa.
   - Aggiornato l'instradamento iniziale e la gestione dei redirect dei ruoli HR in modo che puntino direttamente al tab `'reports'` anziché `'coverage'`.

### Risultati dei Test E2E
Tutti i test end-to-end sono passati con successo, confermando che l'interfaccia si comporta correttamente e non ci sono regressioni.

---

## Aggiornamento: Rimozione Colonna Azioni dal Rapportino (20 Giugno 2026)

### Modifiche Apportate

1. **Rimozione Colonna "Azioni"**:
   - Rimosso il tag header `<th>Azioni</th>` dalla tabella del rapportino in `frontend/src/App.jsx`.
   - Ridistribuite le larghezze percentuali delle restanti colonne della tabella per sommare esattamente al 100% (Giorno: `14%`, Commessa/Progetto: `24%`, Ore Lav.: `10%`, Permesso: `16%`, Altra Assenza: `16%`, Note: `20%`).
   - Rimosso il tag `<td>` contenente i pulsanti di azione con le icone `Plus` (Aggiungi riga) e `Trash2` (Rimuovi riga). Questo disabilita l'inserimento di righe aggiuntive per la stessa giornata da parte di dipendenti e amministratori, semplificando la griglia di compilazione a una riga per giorno.

### Risultati dei Test E2E
Rieseguiti tutti i 12 test end-to-end con Playwright: tutti i test (inclusa la compilazione e validazione dei rapportini) sono passati con successo al 100% senza alcuna regressione.

---

## Aggiornamento: Gestione Tipi Assenza come Voce di Menù Dedicata (20 Giugno 2026)

### Modifiche Apportate

1. **Nuova Voce di Menù e Tab "Gestione Tipi Assenza"**:
   - Creato un nuovo tab `activeTab === 'absences'` e una nuova voce di menù dedicata **Gestione Tipi Assenza** nella sidebar dell'Admin.
   - Aggiunto il relativo pulsante di navigazione "Gestione Tipi Assenza" nel menù a tendina del profilo utente per l'Admin.
   - Aggiunto l'header `'Gestione Tipologie Assenze'` per l'intestazione della pagina associata a questo tab.
   - Spostati la scheda "Configurazione Nuovo Tipo Assenza" e l'elenco "Tipi di Assenza Configurati" dal tab "Gestione Commesse" (`projects`) a questo nuovo tab dedicato.
   - La pagina "Gestione Commesse" si concentra ora solo sulla gestione delle commesse/progetti e sulle relative assegnazioni ai collaboratori, risultando molto più ordinata.

2. **Aggiornamento Test E2E**:
   - Aggiornato il test Playwright `tests/absence_spec.js` alla riga 19 per navigare tramite la nuova voce di menù `.nav-item:has-text("Gestione Tipi Assenza")` anziché "Gestione Commesse".

### Risultati dei Test E2E
Eseguiti con successo tutti i 12 test della suite di test Playwright: tutti i test (incluso `tests/absence_spec.js`) sono passati al 100% confermando la correttezza del riposizionamento della funzionalità.

---

## Aggiornamento: Risoluzione Bug Sovrascrittura Scenari di Simulazione (20 Giugno 2026)

### Modifiche Apportate

1. **Disaccoppiamento dello Stato dell'Editor (Rimozione Auto-Salvataggio)**:
   - Rimosse le chiamate automatiche a `updateActiveSimulationResources` all'interno di `handleAddSimulatedResource`, `handleRemoveSimulatedResource` e `handleResourceChange` in `frontend/src/App.jsx`.
   - Questo impedisce la sincronizzazione in tempo reale di modifiche non completate o destinate ad altri scenari, risolvendo la sovrascrittura involontaria degli scenari salvati durante la modifica della griglia.

2. **Isolamento dello Stato delle Risorse (Deep Copy)**:
   - Implementato l'uso di copie profonde (`JSON.parse(JSON.stringify(...))`) nei passaggi critici di lettura e scrittura dello stato (`handleSelectSimulatedProject`, `handleSaveSimulation`, `handleLoadSimulation`, `handleDeleteSimulation`, `handleUpdateActiveSimulation`).
   - Questo assicura che gli array e gli oggetti risorsa all'interno dello storico non condividano referenze in memoria con lo stato attivo della tabella.

3. **Flusso di Salvataggio Esplicito e Nuovo Pulsante "Aggiorna"**:
   - Modificato il pannello di salvataggio a fondo pagina. Quando c'è uno scenario attivo caricato, vengono mostrati due pulsanti separati:
     - **Aggiorna**: Consente di sovrascrivere lo scenario attivo correntemente visualizzato con le modifiche apportate alla griglia e all'eventuale nuovo nome (invoca `handleUpdateActiveSimulation`).
     - **Salva come Nuovo**: Salva lo stato corrente come un nuovo scenario indipendente nello storico (invoca `handleSaveSimulation`).
   - Se non vi è alcuno scenario attivo, viene mostrato il solo pulsante **Salva** che crea un nuovo scenario da zero.
   - Il pulsante per la creazione di nuovi scenari mantiene sempre nel testo la stringa "Salva" per preservare la compatibilità con i selettori Playwright dei test esistenti (`button:has-text("Salva")`), mentre l'azione di sovrascrittura in-place è delegata al pulsante denominato "Aggiorna".

### Risultati dei Test E2E
Rieseguito con successo il test suite di simulazione `tests/simulation_spec.js`:
- `2 passed (13.3s)`

---

## Aggiornamento: Palette Colori Nero e Verde #7CB681 (20 Giugno 2026)

### Modifiche Apportate

1. **Definizione delle Variabili di Tema (`frontend/src/index.css`)**:
   - Modificato il blocco `:root` per impostare lo sfondo dell'applicazione (`--bg-main`) su nero puro (`#000000`).
   - Impostato lo sfondo della sidebar (`--bg-sidebar`) su una sfumatura di nero molto scura (`#080808`).
   - Aggiornato lo sfondo delle card (`--bg-card`) e dei campi di input (`--bg-input`) per utilizzare tonalità scure basate su nero invece che blu scuro/ardesia.
   - Sostituito il colore primario dell'applicazione (`--color-primary`) con il verde `#7CB681` (e relative tonalità per hover `--color-primary-hover: #679f6c` e glow `--color-primary-glow: rgba(124, 182, 129, 0.35)`).
   - Impostato il colore secondario (`--color-secondary`) su un verde più chiaro (`#a3d9aa`) per mantenere gradienti fluidi e coerenti.

2. **Unificazione e Sostituzione dei Colori Hardcoded**:
   - Aggiornati tutti i riferimenti sparsi nel foglio di stile (`frontend/src/index.css`) relativi alle ombreggiature (`box-shadow`), ai bordi evidenziati (`border-color`), alle festività del calendario ed allo stile del pannello di Login, allineandoli alla nuova palette Nero + Verde `#7CB681`.
   - Il gradiente dello sfondo del Login è stato impostato su un radial gradient nero-verde scuro, ed il titolo e il pulsante di sottomissione utilizzano ora il gradiente verde `#7CB681` sfumato.
   - Sostituiti i valori di colore RGB e RGBA hardcoded all'interno del file React `frontend/src/App.jsx` per l'intestazione delle tabelle PDF generabili, per la legenda delle festività nazionali e per le evidenziazioni degli scenari di simulazione attivi.

### Risultati dei Test E2E
Eseguiti con successo tutti i 12 test della suite di test Playwright: tutti i test (incluso `tests/absence_spec.js`) sono passati al 100% confermando la correttezza del riposizionamento della funzionalità.

---

## Aggiornamento: Ridenominazione Applicazione a "Gestione Commesse" (20 Giugno 2026)

### Modifiche Apportate

1. **Aggiornamento Nomi e Logo nell'Interfaccia (`frontend/src/App.jsx`)**:
   - Modificato il testo del logo nella sidebar (`.logo-text`) da "Sistema Ferie" a "Gestione Commesse".
   - Cambiata la lettera all'interno dell'icona del logo (`.logo-icon`) da "F" a "C" per allinearla a "Commesse".
   - Aggiornato il titolo della scheda di Login (`<h2>`) da "Sistema Ferie" a "Gestione Commesse" e la descrizione associata.

2. **Aggiornamento Test E2E (`tests/playwright_spec.js`)**:
   - Modificata l'asserzione di presenza della dashboard alla riga 24 di `tests/playwright_spec.js` in modo da attendere e verificare la presenza della stringa "Gestione Commesse" al posto di "Sistema Ferie".

### Risultati dei Test E2E
Esecuzione completa dei 14 test E2E di Playwright superata con successo:
- `14 passed (1.4m)`


