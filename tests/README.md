# Guida ai Test Automatici - Sistema Ferie

Questa cartella contiene le specifiche dei test e i file di comportamento (BBD - Gherkin) pronti per l'automazione dei test sul progetto.

## Struttura dei File Creati

* **`tests/features/gestione_ferie.feature`**: Scenari per l'invio delle richieste (Ferie, Malattia, Permesso Studio), limitazioni in giorni e convalidazione allegati facoltativi.
* **`tests/features/approvazioni.feature`**: Scenari per il flusso di approvazione/rifiuto (Admin/HR), tracciamento delle firme di decisione e note di rifiuto obbligatorie.
* **`tests/features/impostazioni.feature`**: Scenari per la variazione e l'impatto dei limiti globali (ferie e studio).
* **`tests/playwright_spec.js`**: File di test end-to-end (E2E) pronti per l'esecuzione con **Playwright**, che implementa ciascuno dei casi d'uso sopra descritti.

---

## Come Eseguire i Test in Futuro

Per rendere questi test eseguibili sul tuo PC, segui questi semplici passaggi.

### 1. Installazione di Playwright
Dalla cartella principale del progetto (`Sistema Ferie`), installa Playwright come dipendenza di sviluppo:

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Configurazione di Playwright
Crea un file di configurazione chiamato `playwright.config.js` nella root del progetto con questo contenuto minimale:

```javascript
// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    browserName: 'chromium',
    headless: false, // impostare a true se si desidera eseguire i test in background
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. Esecuzione dei Test
Per avviare la suite di test E2E automatica:

```bash
npx playwright test
```

Per vedere il report interattivo dei test in caso di errori:

```bash
npx playwright show-report
```

---

## Integrazione con Cucumber (BDD)
Se preferisci eseguire direttamente i file `.feature` scritti in linguaggio Gherkin, puoi installare il modulo Cucumber integrato:

```bash
npm install -D @cucumber/cucumber
```
Ed associare i file di definizione dei passaggi (*step definitions*) mappando le azioni sui selettori descritti nel file `playwright_spec.js`.
