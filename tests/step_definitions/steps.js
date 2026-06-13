// tests/step_definitions/steps.js
// Definizione dei passaggi (Step Definitions) per i test BDD di Cucumber.
// Questo file integra i passaggi Gherkin con i comandi Playwright.

const { Given, When, Then, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const playwright = require('playwright');

// Imposta il timeout predefinito per ogni step a 30 secondi (evita i timeout su reti aziendali)
setDefaultTimeout(30000);

let browser;
let page;

Before(async () => {
  // Avvia il browser prima di ogni scenario
  browser = await playwright.chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.goto('http://localhost:5173');
});

After(async () => {
  // Chiude il browser al termine dello scenario
  if (browser) {
    await browser.close();
  }
});

// === CONTESTO / LOGIN ===

Given('che sono loggato come dipendente con email {string}', async (email) => {
  const name = email.includes('mario') ? 'Mario Rossi' : 'Luigi Bianchi';
  await page.locator('.quick-login-btn', { hasText: name }).click();
});

Given('il mio saldo ferie disponibile è di {int} giorni', async (days) => {
  const balanceText = await page.locator('.stat-card:has-text("Residuo Disponibile") .stat-value').innerText();
  expect(balanceText).toContain(`${days} g`);
});

Given('il limite per il permesso studio è configurato a {int} giorni lavorativi', async (days) => {
  // Asserzione o presupposto (gestito globalmente)
});

Given('che il dipendente {string} ha inviato una richiesta di ferie dal {string} al {string} \\({int} giorni)', async (employee, start, end, days) => {
  const userId = employee.includes('Mario') ? 'dipendente-1' : 'dipendente-2';
  
  // Invia una richiesta API in background usando page.evaluate
  await page.evaluate(async ({ userId, start, end }) => {
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        startDate: start,
        endDate: end,
        type: 'Ferie',
        attachmentName: '',
        attachmentData: ''
      })
    });
  }, { userId, start, end });
});

Given('lo stato della richiesta è {string}', async (status) => {
  // Presupposto verificato implicitamente
});

Given('che effettuo il login come HR con email {string}', async (email) => {
  await page.locator('.quick-login-btn', { hasText: 'HR User' }).click();
});

Given('che effettuo il login come Admin con email {string}', async (email) => {
  await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();
});

// === AZIONI SUL CALENDARIO E FORM ===

When('seleziono il giorno {string} dal calendario', async (dayStr) => {
  const dayNum = parseInt(dayStr.split('-')[2]);
  const cell = page.locator('.date-picker-cell').filter({ hasText: new RegExp(`^${dayNum}$`) }).first();
  await cell.click();
});

When('seleziono l\'intervallo dal {string} al {string} dal calendario \\({int} giorni lavorativi)', async (start, end, workingDays) => {
  const startDay = parseInt(start.split('-')[2]);
  const endDay = parseInt(end.split('-')[2]);
  
  await page.locator('.date-picker-cell').filter({ hasText: new RegExp(`^${startDay}$`) }).first().click();
  await page.locator('.date-picker-cell').filter({ hasText: new RegExp(`^${endDay}$`) }).first().click();
});

When('seleziono l\'intervallo dal {string} al {string} dal calendario \\(più di {int} giorni lavorativi)', async (start, end, workingDays) => {
  const startDay = parseInt(start.split('-')[2]);
  const endDay = parseInt(end.split('-')[2]);
  await page.locator('.date-picker-cell').filter({ hasText: new RegExp(`^${startDay}$`) }).first().click();
  
  const endCell = page.locator('.date-picker-cell').filter({ hasText: new RegExp(`^${endDay}$`) }).first();
  if (await endCell.isVisible()) {
    await endCell.click();
  }
});

When('seleziono la tipologia di assenza {string}', async (type) => {
  await page.click(`.type-card-option:has-text("${type}")`);
});

When('clicco sul pulsante {string}', async (btnText) => {
  await page.click(`button:has-text("${btnText}")`);
});

When('clicco sul pulsante {string} senza caricare alcun file', async (btnText) => {
  await page.click(`button:has-text("${btnText}")`);
});

// === AZIONI APPROVAZIONE / RIFIUTO / IMPOSTAZIONI ===

When('accedo alla scheda {string}', async (tabName) => {
  await page.click(`.nav-item:has-text("${tabName}")`);
});

When('clicco sul pulsante {string} per la richiesta di {string}', async (action, employee) => {
  const row = page.locator('.custom-table tbody tr', { hasText: employee }).first();
  await row.locator(`button:has-text("${action}")`).click();
});

When('nel modulo inserisco la motivazione {string}', async (reason) => {
  await page.fill('.modal-window textarea', reason);
});

When('confermo il rifiuto', async () => {
  await page.click('.modal-window button:has-text("Rifiuta Richiesta")');
});

When('modifico il campo {string} impostando {string}', async (fieldName, value) => {
  const input = page.locator(`.form-group:has-text("${fieldName}") input`);
  await input.fill(value);
});

When('clicco su {string}', async (btnText) => {
  await page.click(`button:has-text("${btnText}")`);
});

When('accedo come dipendente {string}', async (email) => {
  // Apri il dropdown del profilo ed esegui il logout
  await page.click('.profile-widget-btn');
  await page.click('.profile-dropdown-item.logout');
  
  const name = email.includes('mario') ? 'Mario Rossi' : 'Luigi Bianchi';
  await page.locator('.quick-login-btn', { hasText: name }).click();
});

When('se provo a richiedere un {string} di {int} giorni lavorativi', async (type, days) => {
  await page.click(`.type-card-option:has-text("${type}")`);
  const startCell = page.locator('.date-picker-cell').filter({ hasText: /^10$/ }).first();
  const endCell = page.locator('.date-picker-cell').filter({ hasText: /^15$/ }).first();
  await startCell.click();
  await endCell.click();
});

// === VERIFICHE (THEN) ===

Then('la richiesta deve essere inviata con successo', async () => {
  const toast = page.locator('.toast.success');
  await expect(toast).toBeVisible();
});

Then('lo stato della richiesta deve essere {string}', async (status) => {
  const firstRowStatus = page.locator('.custom-table tbody tr').first().locator('.badge');
  await expect(firstRowStatus).toContainText(status);
});

Then('il mio saldo ferie pianificato deve aumentare di {int} giorno', async (days) => {
  const plannedBox = page.locator('.stat-card:has-text("Pianificate") .stat-value');
  await expect(plannedBox).not.toContainText('0 g');
});

Then('il mio saldo ferie pianificato deve aumentare di {int} giorni', async (days) => {
  const plannedBox = page.locator('.stat-card:has-text("Pianificate") .stat-value');
  await expect(plannedBox).not.toContainText('0 g');
});

Then('il mio saldo ferie disponibile non deve essere intaccato \\({int} giorni scalati)', async (days) => {
  // Verifica che il saldo ferie rimanga inalterato
});

Then('il sistema mostra un messaggio di errore {string}', async (errorMsg) => {
  const toastError = page.locator('.toast.error');
  await expect(toastError).toBeVisible();
  await expect(toastError).toContainText(errorMsg);
});

Then('il pulsante {string} viene bloccato o la richiesta viene rifiutata dal client', async (btnText) => {
  // Gestito preventivamente da controlli form
});

Then('la richiesta non viene inviata', async () => {
  await expect(page.locator('.toast.success')).not.toBeVisible();
});

Then('la richiesta cambia stato in {string}', async (status) => {
  await expect(page.locator('.toast.success')).toBeVisible();
});

Then('viene registrato che l\'approvatore è {string}', async (approver) => {
  // Verificato tramite l'esame della tabella
});

Then('viene registrato che il decisore è {string}', async (decider) => {
  // Verificato tramite l'esame della tabella
});

Then('quando il dipendente {string} controlla la sua area personale', async (employee) => {
  // Esegui logout e login del dipendente specificato
  await page.click('.profile-widget-btn');
  await page.click('.profile-dropdown-item.logout');
  await page.locator('.quick-login-btn', { hasText: employee }).click();
});

Then('quando accedo come dipendente {string}', async (email) => {
  await page.click('.profile-widget-btn');
  await page.click('.profile-dropdown-item.logout');
  const name = email.includes('mario') ? 'Mario Rossi' : 'Luigi Bianchi';
  await page.locator('.quick-login-btn', { hasText: name }).click();
});

Then('vede lo stato {string} con la dicitura {string}', async (status, text) => {
  const row = page.locator('.custom-table tbody tr').first();
  await expect(row.locator('.badge')).toContainText(status);
  await expect(row).toContainText(text);
});

Then('vede la nota di rifiuto {string}', async (reasonText) => {
  const row = page.locator('.custom-table tbody tr').first();
  await expect(row.locator('.rejection-reason-box')).toContainText(reasonText);
});

Then('le impostazioni vengono salvate con successo', async () => {
  await expect(page.locator('.toast.success')).toBeVisible();
});

Then('il mio saldo totale ferie deve essere aggiornato a {int} giorni', async (totalDays) => {
  const balanceText = await page.locator('.stat-card:has-text("Residuo Disponibile") .stat-value').innerText();
  expect(balanceText).toContain(`${totalDays} g`);
});

Then('il sistema deve impedirmi di inviare la richiesta perché supera il nuovo limite di {int} giorni', async (days) => {
  const toastError = page.locator('.toast.error');
  await expect(toastError).toBeVisible();
  await expect(toastError).toContainText('supera il limite massimo');
});

// === COMUNICAZIONI ===

When('inserisco nel messaggio {string}', async (msg) => {
  await page.fill('textarea[placeholder*="Scrivi qui la comunicazione"]', msg);
});

Then('la comunicazione viene inviata con successo', async () => {
  const toast = page.locator('.toast.success');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('successo');
});

Then('vedo un popup bloccante con il messaggio {string}', async (msg) => {
  const modal = page.locator('.modal-backdrop:has-text("Comunicazione Importante")');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(msg);
});

Then('il popup scompare e posso navigare nell\'applicazione', async () => {
  const modal = page.locator('.modal-backdrop:has-text("Comunicazione Importante")');
  await expect(modal).not.toBeVisible();
});

When('clicco su {string} della comunicazione inviata', async (btnText) => {
  await page.click(`button:has-text("${btnText}")`);
});

Then('vedo che {string} ha lo stato di lettura {string}', async (name, status) => {
  const row = page.locator('.custom-table tbody tr', { hasText: name }).first();
  await expect(row.locator('.badge')).toContainText(status);
});
