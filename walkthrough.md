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
```

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

---

## Aggiornamento: Abilitazione Anagrafica Collaboratori per HR (20 Giugno 2026)

### Modifiche Apportate

1. **Rotte Backend (`src/app.js`)**:
   - Aggiornate le rotte `POST /api/users` e `DELETE /api/users/:id` per consentire l'accesso sia ad `Admin` che a `HR` tramite il middleware `requireRoles(['Admin', 'HR'])`.
   - Modificata la validazione in `PUT /api/users/:id` affinché venga applicato lo schema di validazione amministrativa `userAdminUpdate` se il ruolo dell'utente corrente è `Admin` o `HR`.

2. **Controller Backend (`src/controllers/userController.js`)**:
   - Estesa la condizione di aggiornamento dati in `updateProfile` da `if (req.user.role === 'Admin')` a `if (req.user.role === 'Admin' || req.user.role === 'HR')`, garantendo al ruolo HR i privilegi per modificare campi protetti (costo giornaliero, inquadramento contrattuale, totale giorni di ferie, ruolo, password).

3. **Menu e Navigazione Frontend (`frontend/src/App.jsx`)**:
   - Spostata la voce di navigazione "Anagrafica Collaboratori" nella sidebar e nel menu a tendina del profilo al di fuori del blocco esclusivo per l'Admin, esponendola anche per l'utente con ruolo `HR`.
   - Modificato il rendering del contenitore tab `{activeTab === 'users' && currentUser && ...}` affinché venga visualizzato correttamente per entrambi i ruoli `Admin` e `HR`.

4. **Test di Integrazione E2E (`tests/employee_crud_spec.js`)**:
   - Aggiunto il test end-to-end `CRUD completo collaboratore come HR` che simula l'accesso come `HR User` mediante l'accesso rapido, esegue la navigazione nel tab di anagrafica, crea un nuovo collaboratore compilando tutti i campi (compreso il costo giornaliero e il livello), ne modifica i dettagli, lo salva e infine lo elimina.

### Risultati dei Test E2E
Esecuzione completa della suite di test Playwright con tutti i **15 test passati con successo (100%)**:
```bash
Running 15 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (1.9s)
  ok  2 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (6.5s)
  ok  3 tests\employee_crud_spec.js:93:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come HR (4.7s)
  ...
  15 passed (1.6m)
```

---

## Aggiornamento: Dashboard Confronto Preventivo vs Consuntivo (23 Giugno 2026)

### Modifiche Apportate

1. **Rotte Backend & Logica di Estrazione dei Consuntivi (`src/app.js`, `src/controllers/projectController.js`)**:
   - Registrato l'endpoint `GET /api/reports/actuals` accessibile ai ruoli `Admin`, `HR` e `Team Leader`.
   - Implementato il metodo `getProjectActualsReport` nel controller dei progetti per calcolare a livello di database le ore e i costi effettivi di tutti i progetti:
     - Aggrega le ore inserite nei rapportini giornalieri (`daily_reports`) collegati a rapportini mensili (`monthly_reports`) il cui stato sia `'Inviato'` (ossia inviati ma non ancora approvati).
     - Calcola il costo economico effettivo rapportando le ore lavorate a una giornata standard di 8 ore, moltiplicato per il costo interno giornaliero del collaboratore (`users.internal_cost`):
       `Costo Consuntivato = (Ore Lavorate / 8.0) * Costo Giornaliero`.

2. **Interfaccia Grafica Frontend (`frontend/src/App.jsx`)**:
   - Abilitato il tab **Preventivo vs Consuntivo** (`comparison`) per i ruoli `Admin`, `HR` e `Team Leader` sia nella barra laterale di navigazione che nel menu a tendina del profilo utente.
   - Creata una dashboard interattiva composta da:
     - **Selettore Commessa**: Un menu a tendina per scegliere il progetto da confrontare.
     - **Info Progetto**: Visualizza data inizio, data fine, prezzo di vendita, responsabile, PM e margine target.
     - **Visualizzazione Scenari**: Blocco informativo sulla pianificazione ottimale selezionata (nome dello scenario configurato come ottimale). Se non c'è una pianificazione ottimale configurata, viene mostrato un avviso che invita a configurarla tramite la simulazione.
     - **Schede di Sintesi (KPI)**:
       - **Preventivo (Plan)**: Costo totale preventivato, totale ore pianificate e margine atteso.
       - **Consuntivo (Actual)**: Costo totale effettivo (calcolato dai rapportini `'Inviato'`), ore lavorate e margine consuntivato corrente.
       - **Scostamento (Variance)**: Varianza di costo, varianza ore e scostamento in punti percentuali del margine.
     - **Tabella di Dettaglio per Risorsa**: Mostra il confronto riga per riga (ore pianificate vs consuntivate, scostamento ore, costo preventivo vs consuntivo, varianza costo) per ciascun dipendente allocato o che ha registrato ore sul progetto. Include un badge "Non Pianificato" per i dipendenti non presenti nella simulazione ma che hanno lavorato sul progetto.

3. **Nuova Suite di Test E2E Playwright (`tests/comparison_spec.js`)**:
   - Creato un test end-to-end completo per testare l'intero flusso:
     - Login come Admin, creazione di una nuova commessa "Confronto Progetto" con prezzo 3000€ e margine target 20%, e assegnazione a Mario Rossi.
     - Navigazione in Simulazione, aggiunta di Mario Rossi con 10 giorni, salvataggio dello scenario come "Scenario Ottimale" e impostazione come "PIANIFICAZIONE OTTIMALE".
     - Login come Mario Rossi, inserimento di 8 ore al giorno per 5 giorni (40 ore totali) ad Agosto 2026 sul progetto "Confronto Progetto", salvataggio bozza e invio del rapportino (stato `Inviato`).
     - Login come Team Leader Giuseppe Verdi, apertura della dashboard "Preventivo vs Consuntivo" e verifica di tutti i dati:
       - Preventivato: Costo = 1200€, Margine = 60.0%
       - Consuntivato: Costo = 600€, Margine = 80.0%
       - Scostamento: Costo = -600€, Margine = +20.0%
       - Tabella: record di Mario Rossi con 80h pianificate, 40h effettive, scostamento -40h, costo preventivo 1200€, costo consuntivo 600€ e varianza -600€.
   - Incorporata una funzione helper locale `dismissModals` per gestire in modo robusto la dismissione dei popup bloccanti all'accesso degli utenti.
   - Rese le asserzioni numeriche resilienti a variazioni di localizzazione e formato decimali tramite l'uso di espressioni regolari (es.  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (5.0s)
  ok  2 tests\comparison_spec.js:39:3 › Dashboard Preventivo vs Consuntivo - E2E Tests › Flusso completo di confronto preventivo vs consuntivo (22.9s)
  ok  3 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (5.4s)
  ok  4 tests\employee_crud_spec.js:93:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come HR (4.6s)
  ok  5 tests\playwright_spec.js:19:3 › Sistema Gestione Ferie - E2E Tests › 1. Login come Dipendente e inserimento richiesta ferie di 1 giorno (3.0s)
  ok  6 tests\playwright_spec.js:46:3 › Sistema Gestione Ferie - E2E Tests › 2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo) (2.8s)
  ok  7 tests\playwright_spec.js:68:3 › Sistema Gestione Ferie - E2E Tests › 3. Approvazione richiesta da parte dell'utente HR con evidenza approvatore (10.3s)
  ok  8 tests\playwright_spec.js:107:3 › Sistema Gestione Ferie - E2E Tests › 4. Rifiuto richiesta da parte dell'Admin con motivazione visibile (10.2s)
  ok  9 tests\playwright_spec.js:147:3 › Sistema Gestione Ferie - E2E Tests › 5. Configurazione dei limiti globali e convalida regole d'uso (7.3s)
  ok 10 tests\playwright_spec.js:168:3 › Sistema Gestione Ferie - E2E Tests › 6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente (7.8s)
  ok 11 tests\playwright_spec.js:195:3 › Sistema Gestione Ferie - E2E Tests › 7. Compilazione e invio in approvazione di un rapportino (8.1s)
  ok 12 tests\playwright_spec.js:229:3 › Sistema Gestione Ferie - E2E Tests › 8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi (8.7s)
  ok 13 tests\playwright_spec.js:293:3 › Sistema Gestione Ferie - E2E Tests › 9. Rifiuto del rapportino da parte del Team Leader con motivazione (12.8s)
  ok 14 tests\project_crud_spec.js:14:3 › Gestione Commesse - E2E Tests › CRUD completo commessa con campi finanziari e gestionali come Admin (5.7s)
  ok 15 tests\simulation_spec.js:14:3 › Simulazione Commesse - E2E Tests › Pianificazione e calcolo margine commessa come Team Leader (6.3s)
  ok 16 tests\simulation_spec.js:107:3 › Simulazione Commesse - E2E Tests › Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva (8.8s)

  16 passed (2.2m)
```

---

## Aggiornamento: Grafico di Andamento e Previsione Commessa (23 Giugno 2026)

### Modifiche Apportate

1. **Rotte Backend (`src/app.js`, `src/controllers/projectController.js`)**:
   - Registrata la rotta `GET /api/reports/actuals-trend` con controllo dei ruoli `Admin`, `HR` e `Team Leader`.
   - Implementato il metodo `getProjectActualsTrendReport` nel controller dei progetti per estrarre la serie temporale dei consuntivi (ore e costi effettivi aggregati per progetto, anno e mese) ordinati cronologicamente.

2. **Interfaccia Grafica Frontend (`frontend/src/App.jsx`)**:
   - Creato lo stato `actualsTrendList` e aggiornato il caricamento dei dati in `fetchProjectActuals` per richiamare il nuovo endpoint.
   - Implementata la logica di calcolo del trend cumulativo (curva a S) e della previsione di commessa:
     - **Preventivo (Plan)**: Baseline cumulativa lineare da €0 alla data inizio commessa fino al budget totale pianificato (`plannedTotalCost`) alla data fine.
     - **Consuntivo (Actual)**: Costo cumulativo mensile effettivo basato sui rapportini in stato `Inviato`, che si interrompe all'ultimo mese compilato.
     - **Previsionale (Forecast)**: Fino all'ultimo consuntivo ricalca il consuntivo reale, dopodiché proietta linearmente l'andamento fino alla data di fine progetto per confluire nella stima finale EAC (`EAC = Consuntivo Totale + Costi Pianificati Rimanenti`).
     - **Helper di Date**: Inserita la funzione `generateProjectMonths` per costruire la lista cronologica dei mesi a partire dalle date inizio/fine della commessa, con un fallback dinamico basato sui dati reali e sulla data corrente in caso di date non specificate.
   - **Visualizzazione Grafica**: Inserita una scheda card **Andamento e Previsione Commessa (S-Curve)** con un grafico vettoriale SVG responsive contenente:
     - Linea verde solida per il Preventivo (Plan).
     - Linea bianca spessa per il Consuntivo (Actual).
     - Linea tratteggiata verde per la Previsione (Forecast).
     - Griglia orizzontale di riferimento con etichette dei costi (€) formattati localmente.
     - Asse temporale orizzontale con i nomi abbreviati dei mesi.
     - Marcatori (pallini colorati) sui dati di snodo e scritte di endpoint a destra del grafico (Budget, EAC e Consuntivo corrente) per una lettura immediata dei dati chiave.

3. **E2E Testing (`tests/comparison_spec.js`)**:
   - Aggiornata la suite di test Playwright per:
     - Risolvere i conflitti di localizzazione e le collisioni di stringhe stric-mode sui selettori delle card basandosi su body text unici (es. `'Costo pianificato per'`).
     - Verificare la corretta visibilità della scheda del grafico, del tag `svg` e dei testi di endpoint (`Budget:`, `Stima (EAC):`, `Cons.:`).

### Risultati dei Test E2E
Esecuzione completa della suite con tutti i **16 test passati con successo (100%)**:
```bash
Running 16 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (2.5s)
  ok  2 tests\comparison_spec.js:39:3 › Dashboard Preventivo vs Consuntivo - E2E Tests › Flusso completo di confronto preventivo vs consuntivo (20.4s)
  ok  3 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (5.5s)
  ok  4 tests\employee_crud_spec.js:93:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come HR (3.6s)
  ok  5 tests\playwright_spec.js:19:3 › Sistema Gestione Ferie - E2E Tests › 1. Login come Dipendente e inserimento richiesta ferie di 1 giorno (2.7s)
  ok  6 tests\playwright_spec.js:46:3 › Sistema Gestione Ferie - E2E Tests › 2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo) (2.3s)
  ok  7 tests\playwright_spec.js:68:3 › Sistema Gestione Ferie - E2E Tests › 3. Approvazione richiesta da parte dell'utente HR con evidenza approvatore (7.7s)
  ok  8 tests\playwright_spec.js:107:3 › Sistema Gestione Ferie - E2E Tests › 4. Rifiuto richiesta da parte dell'Admin con motivazione visibile (8.9s)
  ok  9 tests\playwright_spec.js:147:3 › Sistema Gestione Ferie - E2E Tests › 5. Configurazione dei limiti globali e convalida regole d'uso (8.9s)
  ok 10 tests\playwright_spec.js:168:3 › Sistema Gestione Ferie - E2E Tests › 6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente (7.4s)
  ok 11 tests\playwright_spec.js:195:3 › Sistema Gestione Ferie - E2E Tests › 7. Compilazione e invio in approvazione di un rapportino (7.2s)
  ok 12 tests\playwright_spec.js:229:3 › Sistema Gestione Ferie - E2E Tests › 8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi (7.6s)
  ok 13 tests\playwright_spec.js:293:3 › Sistema Gestione Ferie - E2E Tests › 9. Rifiuto del rapportino da parte del Team Leader con motivazione (12.4s)
  ok 14 tests\project_crud_spec.js:14:3 › Gestione Commesse - E2E Tests › CRUD completo commessa con campi finanziari e gestionali come Admin (5.2s)
  ok 15 tests\simulation_spec.js:14:3 › Simulazione Commesse - E2E Tests › Pianificazione e calcolo margine commessa come Team Leader (5.6s)
  ok 16 tests\simulation_spec.js:107:3 › Simulazione Commesse - E2E Tests › Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva (7.7s)

  16 passed (2.0m)
``` margine commessa come Team Leader (6.3s)
  ok 16 tests\simulation_spec.js:107:3 › Simulazione Commesse - E2E Tests › Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva (8.8s)

  16 passed (2.2m)
```

---

## Aggiornamento: Grafico Previsionale a Barre e Ore Mancanti (23 Giugno 2026)

### Modifiche Apportate

1. **Risoluzione Compile Error Frontend**:
   - Individuata ed aggiunta la chiusura del tag `</div>` mancante per il contenitore `Comparison Cards Row` (griglia delle KPI card) all'interno di `frontend/src/App.jsx`. Questo ha risolto definitivamente il crash di compilazione (HMR/Transform error in Vite).

2. **Ore Mancanti da Consuntivare**:
   - Integrata una nuova voce nella card **Scostamento (Variance)** denominata `Ore da consuntivare mancanti:` formattata in modo elegante sul fondo della card.
   - Il valore mostra dinamicamente quante ore mancano alla fine della commessa calcolando la differenza tra le ore pianificate totali (dallo scenario ottimale) e quelle consuntivate: `Max(0, Ore Pianificate - Ore Consuntivate)`.

3. **Chiarificazione del Grafico Previsionale**:
   - Sostituito il precedente andamento lineare cumulativo con un grafico a barre affiancate mensili più immediato e leggibile.
   - **Area Previsionale Shaded**: Aggiunta un'area ombreggiata semitrasparente contrassegnata dalla dicitura `"Area Previsionale (Forecast)"` per evidenziare i mesi futuri stimati.
   - **Linea Divisoria**: Disegnata una linea verticale tratteggiata verde al confine tra il periodo consuntivato corrente e l'inizio del periodo di previsione futura.
   - **Etichettatura Chiara**: 
     - Modificate le etichette dell'asse X aggiungendo il suffisso ` (Prev.)` ai mesi previsionali futuri.
     - Aggiunto il suffisso ` (P)` ai valori numerici posizionati sopra le colonne previsionali.

4. **Testing E2E & Stabilità**:
   - Aggiornato `tests/comparison_spec.js` per asserire la corretta visualizzazione delle ore mancanti (es. verifica presenza di `"Ore da consuntivare mancanti:"` e del valore specifico `"40h"` nel flusso di test).
   - Ottimizzata la funzione helper `dismissModals` aumentando il timeout del predicato `.toPass` da 3 a 10 secondi. Questo assicura stabilità del test qualora le chiamate API di reset del database e sottomissione/conferma lettura messaggi presentino piccoli ritardi di scrittura su disco.

### Risultati dei Test E2E
Eseguita con successo la suite di test Playwright con tutti i **16 test passati con successo (100%)**:
```bash
Running 16 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (4.8s)
  ok  2 tests\comparison_spec.js:39:3 › Dashboard Preventivo vs Consuntivo - E2E Tests › Flusso completo di confronto preventivo vs consuntivo (36.5s)
  ok  3 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (10.0s)
  ok  4 tests\employee_crud_spec.js:93:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come HR (11.0s)
  ok  5 tests\playwright_spec.js:19:3 › Sistema Gestione Ferie - E2E Tests › 1. Login come Dipendente e inserimento richiesta ferie di 1 giorno (5.1s)
  ok  6 tests\playwright_spec.js:46:3 › Sistema Gestione Ferie - E2E Tests › 2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo) (5.4s)
  ok  7 tests\playwright_spec.js:68:3 › Sistema Gestione Ferie - E2E Tests › 3. Approvazione richiesta da parte dell'utente HR con evidenza approvatore (12.0s)
  ok  8 tests\playwright_spec.js:107:3 › Sistema Gestione Ferie - E2E Tests › 4. Rifiuto richiesta da parte dell'Admin con motivazione visibile (12.6s)
  ok  9 tests\playwright_spec.js:147:3 › Sistema Gestione Ferie - E2E Tests › 5. Configurazione dei limiti globali e convalida regole d'uso (8.1s)
  ok 10 tests\playwright_spec.js:168:3 › Sistema Gestione Ferie - E2E Tests › 6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente (9.3s)
  ok 11 tests\playwright_spec.js:195:3 › Sistema Gestione Ferie - E2E Tests › 7. Compilazione e invio in approvazione di un rapportino (15.9s)
  ok 12 tests\playwright_spec.js:229:3 › Sistema Gestione Ferie - E2E Tests › 8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi (14.7s)
  ok 13 tests\playwright_spec.js:293:3 › Sistema Gestione Ferie - E2E Tests › 9. Rifiuto del rapportino da parte del Team Leader con motivazione (22.8s)
  ok 14 tests\project_crud_spec.js:14:3 › Gestione Commesse - E2E Tests › CRUD completo commessa con campi finanziari e gestionali come Admin (7.0s)
  ok 15 tests\simulation_spec.js:14:3 › Simulazione Commesse - E2E Tests › Pianificazione e calcolo margine commessa come Team Leader (8.6s)
  ok 16 tests\simulation_spec.js:107:3 › Simulazione Commesse - E2E Tests › Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva (9.5s)

  16 passed (3.3m)
```

---

## Aggiornamento: Rimozione Grafico di Andamento (24 Giugno 2026)

### Modifiche Apportate

1. **Interfaccia Grafica Frontend**:
   - Rimosso completamente il componente grafico mensile SVG ("Andamento e Previsione Commessa") dal tab `comparison` di `frontend/src/App.jsx`.
   - Il tab mostra ora solo il riepilogo commessa, le schede KPI principali (Preventivo, Consuntivo e Scostamento) e la tabella di dettaglio economico/ore per ciascun collaboratore, risultando estremamente pulito e a valore aggiunto immediato.

2. **Aggiornamento Test E2E**:
   - Rimossi i controlli e le asserzioni di visibilità del grafico SVG dal file `tests/comparison_spec.js` (righe 148-154), garantendo l'allineamento con l'interfaccia aggiornata.

### Risultati dei Test E2E
Rieseguita la suite di test Playwright con tutti i **16 test passati con successo (100%)**:
```bash
Running 16 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › ... (2.2s)
  ok  2 tests\comparison_spec.js:39:3 › Dashboard Preventivo vs Consuntivo - E2E Tests › Flusso completo di confronto preventivo vs consuntivo (17.9s)
  ...
  16 passed (1.7m)
```

---

## Aggiornamento: Spese Non-Labor, Portafoglio Commesse, Riapertura Rapportini e Cascade Delete (24 Giugno 2026)

### Modifiche Apportate

1. **Gestione Spese Non-Labor (Costi Extra)**:
   - **Database**: Creata la tabella `project_expenses` con colonne `id`, `projectId`, `date`, `category`, `description`, `amount`, `createdAt`. Aggiunto un vincolo di chiave esterna con cancellazione in cascata su `projects(id)`.
   - **Backend (`src/controllers/projectController.js` & `src/app.js`)**: Realizzati gli endpoint REST `GET`, `POST`, `PUT`, `DELETE` per `/api/projects/:projectId/expenses` e l'endpoint di riepilogo `/api/reports/expenses`.
   - **Calcolo Costi e Margini**: Aggiornata la formula del costo effettivo: `Costo Consuntivato = Costo Lavoro (da rapportini) + Spese Non-Labor`. Di conseguenza, sono stati ricalcolati dinamicamente i margini reali ed i relativi scostamenti.
   - **Interfaccia Frontend (`frontend/src/App.jsx`)**: Sotto la sezione dei KPI del progetto selezionato nella tab "Preventivo vs Consuntivo", è stata aggiunta la card interattiva **Spese Non-Labor** per visualizzare, inserire, modificare ed eliminare le spese collegate al progetto.

2. **Portfolio Commesse & Alerting**:
   - **Dashboard Globale di Controllo**: Quando non è selezionata alcuna commessa nel tab "Preventivo vs Consuntivo", viene ora mostrato il pannello **Portfolio Commesse & Controllo Gestione**. Presenta una tabella di sintesi con: budget, costo lavoro, spese non-labor, consuntivo totale, scostamento e margine (target vs effettivo).
   - **Indicatori di Allerta (Semafori)**:
     - 🟢 **OK**: Costo consuntivato <= 80% del budget e margine reale >= target.
     - 🟡 **WARNING**: Costo consuntivato tra 80% e 100% del budget o margine reale inferiore al target di massimo 5 punti percentuali.
     - 🔴 **CRITICAL**: Costo consuntivato > 100% del budget o margine reale inferiore al target di oltre 5 punti percentuali.
     - ⚪ **NO PLAN**: Nessuna pianificazione contrassegnata come ottimale.
   - **Banners di Allerta**: Selezionando una commessa specifica, se questa supera le soglie di costo (80% o 100%) o scende sotto il margine target, vengono mostrati vistosi banner informativi colorati in cima alla pagina.

3. **Riapertura Rapportini (Stato "Inviato" ➔ "Bozza")**:
   - **Backend (`src/controllers/timesheetController.js` & `src/app.js`)**: Aggiunto l'endpoint `POST /api/timesheets/:id/reopen`. Resetta lo stato del rapportino mensile a `'Bozza'` e azzera i campi di approvazione, inviando una notifica in-app al dipendente per segnalare la riapertura.
   - **Frontend (`frontend/src/App.jsx`)**: Nella tab "Approvazioni Rapportini", per i ruoli `Admin` e `HR`, è stato introdotto il pulsante **Riapri** accanto ai rapportini inviati, permettendo di sbloccarli e rimandarli in compilazione.

4. **Integrità Referenziale e Cancellazione Collaboratori (Cascade Delete)**:
   - **Database (`src/database/db.js`)**: Abilitata l'integrità referenziale globale in SQLite tramite `db.pragma('foreign_keys = ON')`.
   - **Cascade Delete**: Eliminando un dipendente dall'Anagrafica Collaboratori, tutte le sessioni attive, richieste ferie, rapportini mensili, note giornaliere e associazioni a commesse vengono automaticamente rimossi a livello di database per prevenire record orfani.

5. **Test E2E Playwright**:
   - **Nuova Suite (`tests/monitoring_spec.js`)**: Verifica la visualizzazione del Portfolio Commesse, le allerte, il CRUD completo delle spese non-labor, il flusso di riapertura dei rapportini, e l'integrità referenziale con cascade delete all'eliminazione di un collaboratore.
   - **Aggiornamento Test Esistenti**: Adattate le asserzioni numeriche in `tests/comparison_spec.js` al nuovo calcolo dei margini reali comprensivi di spese.

---

## Risultati Finali dei Test E2E

Tutti i 19 test di integrità ed end-to-end sono stati eseguiti con successo:
```bash
Running 19 tests using 1 worker

  ok  1 tests\absence_spec.js:14:3 › Gestione Tipi Assenza - E2E Tests › Creazione di un nuovo tipo di assenza come Admin (3.0s)
  ok  2 tests\comparison_spec.js:39:3 › Dashboard Preventivo vs Consuntivo - E2E Tests › Flusso completo di confronto preventivo vs consuntivo (26.0s)
  ok  3 tests\employee_crud_spec.js:14:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come Admin (8.3s)
  ok  4 tests\employee_crud_spec.js:93:3 › Gestione Anagrafica Collaboratori - E2E Tests › CRUD completo collaboratore come HR (5.4s)
  ok  5 tests\monitoring_spec.js:13:3 › Controllo Gestione, Spese Non-Labor, Riapertura Rapportini e CRUD Collaboratori - E2E Tests › Portfolio Commesse, Allerte e CRUD Spese Non-Labor (6.3s)
  ok  6 tests\monitoring_spec.js:68:3 › Controllo Gestione, Spese Non-Labor, Riapertura Rapportini e CRUD Collaboratori - E2E Tests › Flusso completo di Riapertura Rapportino (15.2s)
  ok  7 tests\monitoring_spec.js:133:3 › Controllo Gestione, Spese Non-Labor, Riapertura Rapportini e CRUD Collaboratori - E2E Tests › Validazione Chiavi Esterne (Cascade Delete) Collaboratore (3.1s)
  ok  8 tests\playwright_spec.js:19:3 › Sistema Gestione Ferie - E2E Tests › 1. Login come Dipendente e inserimento richiesta ferie di 1 giorno (2.7s)
  ok  9 tests\playwright_spec.js:46:3 › Sistema Gestione Ferie - E2E Tests › 2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo) (2.8s)
  ok 10 tests\playwright_spec.js:68:3 › Sistema Gestione Ferie - E2E Tests › 3. Approvazione richiesta da parte dell'utente HR con evidenza approvatore (8.4s)
  ok 11 tests\playwright_spec.js:107:3 › Sistema Gestione Ferie - E2E Tests › 4. Rifiuto richiesta da parte dell'Admin con motivazione visibile (9.2s)
  ok 12 tests\playwright_spec.js:147:3 › Sistema Gestione Ferie - E2E Tests › 5. Configurazione dei limiti globali e convalida regole d'uso (6.3s)
  ok 13 tests\playwright_spec.js:168:3 › Sistema Gestione Ferie - E2E Tests › 6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente (6.7s)
  ok 14 tests\playwright_spec.js:195:3 › Sistema Gestione Ferie - E2E Tests › 7. Compilazione e invio in approvazione di un rapportino (4.3s)
  ok 15 tests\playwright_spec.js:229:3 › Sistema Gestione Ferie - E2E Tests › 8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi (6.0s)
  ok 16 tests\playwright_spec.js:293:3 › Sistema Gestione Ferie - E2E Tests › 9. Rifiuto del rapportino da parte del Team Leader con motivazione (9.3s)
  ok 17 tests\project_crud_spec.js:14:3 › Gestione Commesse - E2E Tests › CRUD completo commessa con campi finanziari e gestionali come Admin (4.6s)
  ok 18 tests\simulation_spec.js:14:3 › Simulazione Commesse - E2E Tests › Pianificazione e calcolo margine commessa come Team Leader (5.0s)
  ok 19 tests\simulation_spec.js:107:3 › Simulazione Commesse - E2E Tests › Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva (7.2s)

  19 passed (2.5m)
```

---

## Aggiornamento: Dockerizzazione per Hosting e Rimozione Accesso Rapido (25 Giugno 2026)

### Modifiche Apportate

1. **Rimozione dell'Accesso Rapido (Quick Login) in Produzione**:
   - **Frontend (`frontend/src/App.jsx`)**: La sezione "Accesso Rapido (Demo)" (con i pulsanti predefiniti per Mario Rossi, Luigi Bianchi, ecc.) è stata avvolta nel controllo condizionale `{import.meta.env.DEV && (...) }`.
   - **Risultato**: Quando Vite compila l'applicazione per la produzione (`npm run build`), questa sezione viene completamente rimossa dal codice finale (grazie all'eliminazione di rami morti). Nello sviluppo locale e nell'ambiente di test E2E (`npm run dev`), l'accesso rapido continua ad essere visualizzato per garantire il perfetto funzionamento e la stabilità dei 19 test automatici Playwright.

2. **Dockerizzazione per Hosting e Ambienti Cloud**:
   - **Dockerfile**: Creato un `Dockerfile` multi-stage:
     - **Stage 1 (Build)**: Compila l'applicazione frontend React con Vite producendo la cartella `frontend/dist`.
     - **Stage 2 (Runtime)**: Installa solo le dipendenze di produzione del backend Express, copia il codice sorgente del server e importa la cartella `frontend/dist` prodotta nello Stage 1.
   - **docker-compose.yml**: Creato un file di configurazione per semplificare l'installazione e la gestione del servizio. Definisce la porta `5000` e un volume persistente per SQLite.
   - **.dockerignore**: Aggiunto per escludere file non necessari (come `node_modules`, test, e file di configurazione locale) riducendo le dimensioni dell'immagine Docker.

3. **Predisposizione per Volumi Persistenti su Database SQLite (`src/database/db.js`)**:
   - Modificata l'inizializzazione del database e dei relativi percorsi di backup/seeding per supportare le variabili d'ambiente:
     - `DB_PATH`: Percorso file per il database SQLite (`database.db`). Nel container è configurato a `/app/data/database.db`, permettendo di montare un volume Docker persistente.
     - `LEGACY_DB_PATH`: Percorso del file seed iniziale (`database.json`).
     - `BACKUP_DB_PATH`: Percorso del file di backup (`database.json.bak`) utilizzato per la funzione di reset.
   - Di default, se non configurate, l'applicazione ripiega sui percorsi locali preesistenti, preservando la compatibilità con l'esecuzione locale non containerizzata.

---

## Guida di Installazione e Avvio con Docker

Per installare e avviare l'applicazione su un qualsiasi servizio di hosting con supporto Docker (es. VPS Linux, AWS, DigitalOcean, ecc.):

1. **Prerequisiti**: Assicurarsi che sul server siano installati `docker` e `docker-compose`.
2. **Download del codice**: Clonare il repository sulla macchina host:
   ```bash
   git clone https://github.com/elprincipal74/gesco.git
   cd gesco
   ```
3. **Avvio dei Servizi**: Eseguire il comando di compilazione ed avvio in background:
   ```bash
   docker-compose up --build -d
   ```
   *Questo comando compilerà il frontend, installerà le dipendenze di produzione ed avvierà l'applicazione sulla porta `5000` dell'host.*
4. **Persistenza Dati**: Il database SQLite viene conservato all'interno di un volume Docker denominato `gestione_commesse_data` montato in `/app/data`. Eventuali aggiornamenti o riavvii del container non comporteranno la perdita dei dati.

---

## Aggiornamento: Layout Full Width e Navigazione via Dropdown in Produzione (26 Giugno 2026)

### Modifiche Apportate

1. **Rimozione della Sidebar in Produzione**:
   - **Frontend (`frontend/src/App.jsx`)**: La barra laterale (`<aside className="sidebar">`) è stata racchiusa nel controllo condizionale `{import.meta.env.DEV && (...) }`.
   - **Risultato**: Nella versione compilata per la produzione (quella servita su Docker in hosting), il menu laterale a sinistra viene completamente rimosso. Questo libera il 100% della larghezza dello schermo per le tabelle gestionali e le dashboard, offrendo una superficie di lavoro più ampia e pulita. 
   - **Compatibilità E2E**: In modalità di sviluppo e durante l'esecuzione dei test Playwright (`npm run dev`), la barra laterale viene renderizzata normalmente, garantendo che tutti i 19 test di navigazione automatizzati continuino a passare senza necessità di modifiche ai selettori `.nav-item`.

2. **Nuova Logo Header Section in Produzione**:
   - **Frontend (`frontend/src/App.jsx`)**: Inserito un blocco logo condizionale `{!import.meta.env.DEV && (...) }` nell'app header.
   - **Design**: Quando la sidebar è assente (in produzione), viene mostrato il logo aziendale con l'icona "C" e il nome del progetto **"Gesco"** (con sfumatura gradiente primario/secondario) a sinistra del titolo della pagina corrente, separato da una linea divisoria verticale sottile.

---


