// tests/playwright_spec.js
// Esempio di implementazione dei test automatici E2E con Playwright.
// Questa suite testa i flussi principali dell'applicazione "Sistema Ferie".

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Sistema Gestione Ferie - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Carica la pagina e imposta la sessione pulita
    await page.goto(BASE_URL);
  });

  test('1. Login come Dipendente e inserimento richiesta ferie di 1 giorno', async ({ page }) => {
    // Esegui l'accesso rapido come "Mario Rossi"
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica la visualizzazione della dashboard
    await expect(page.locator('.logo-text')).toContainText('Sistema Ferie');
    await expect(page.locator('.user-profile-widget')).toContainText('Mario Rossi');

    // Clicca su un giorno specifico del calendario (es. il giorno 15 del mese corrente)
    const targetCell = page.locator('.date-picker-cell').filter({ hasText: /^15$/ }).first();
    await targetCell.click();

    // Scegli la tipologia di assenza "Ferie"
    await page.click('.type-card-option:has-text("Ferie")');

    // Invia la richiesta
    await page.click('button:has-text("Invia Richiesta")');

    // Verifica la notifica di successo
    const toast = page.locator('.toast.success');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('successo');

    // Controlla che la richiesta compaia nella tabella "Le Mie Richieste" in stato "In attesa"
    const firstRowStatus = page.locator('.custom-table tbody tr').first().locator('.badge');
    await expect(firstRowStatus).toContainText('In attesa di approvazione');
  });

  test('2. Richiesta di Malattia senza allegato obbligatorio (ora facoltativo)', async ({ page }) => {
    // Accedi come dipendente "Mario Rossi"
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Clicca sul giorno 18
    const targetCell = page.locator('.date-picker-cell').filter({ hasText: /^18$/ }).first();
    await targetCell.click();

    // Seleziona "Malattia"
    await page.click('.type-card-option:has-text("Malattia")');

    // Verifica che l'etichetta dell'allegato indichi "Facoltativo"
    await expect(page.locator('.form-group label:has-text("Certificato Medico")')).toContainText('Facoltativo');

    // Invia senza caricare allegati
    await page.click('button:has-text("Invia Richiesta")');

    // Verifica il successo
    const toast = page.locator('.toast.success');
    await expect(toast).toBeVisible();
  });

  test('3. Approvazione richiesta da parte dell\'utente HR con evidenza approvatore', async ({ page }) => {
    // Accedi come HR User
    await page.locator('.quick-login-btn', { hasText: 'HR User' }).click();

    // Naviga nella scheda Approvazioni
    await page.click('.nav-item:has-text("Approvazioni")');

    // Verifica la presenza della tabella richieste pendenti
    await expect(page.locator('.card-title')).toContainText('Richieste Ferie Pendenti');
    await expect(page.locator('.role-badge-pill')).toContainText('HR Panel');

    // Approva la prima richiesta pendente
    await page.locator('button:has-text("Approva")').first().click();
    await expect(page.locator('.toast.success')).toContainText('approvata');

    // Esegui logout
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // Rientra come dipendente per verificare la firma di approvazione
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica che la richiesta approvata rechi la dicitura "Approvata da: HR User (HR)"
    const approvedByText = page.locator('.custom-table tbody tr').first().locator('div');
    await expect(approvedByText).toContainText('Approvata da: HR User (HR)');
  });

  test('4. Rifiuto richiesta da parte dell\'Admin con motivazione visibile', async ({ page }) => {
    // Accedi come Admin
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();

    // Naviga su Approvazioni
    await page.click('.nav-item:has-text("Approvazioni")');

    // Clicca su Rifiuta per la prima richiesta pendente
    await page.locator('button:has-text("Rifiuta")').first().click();

    // Compila la motivazione nel modal
    const textarea = page.locator('.modal-window textarea');
    await textarea.fill('Rifiutata per sovrapposizione turni');
    await page.click('.modal-window button:has-text("Rifiuta Richiesta")');

    await expect(page.locator('.toast.success')).toContainText('rifiutata');

    // Logout e login dipendente per verifica
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica diciture di rifiuto e motivo
    const targetCell = page.locator('.custom-table tbody tr').first();
    await expect(targetCell).toContainText('Rifiutata da: Admin User (Admin)');
    await expect(targetCell.locator('.rejection-reason-box')).toContainText('Motivo: "Rifiutata per sovrapposizione turni"');
  });

  test('5. Configurazione dei limiti globali e convalida regole d\'uso', async ({ page }) => {
    // Accedi come Admin ed entra nelle impostazioni
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();
    await page.click('.nav-item:has-text("Impostazioni")');

    // Modifica le impostazioni delle ferie e dei permessi studio
    await page.fill('input:below(:text("Ferie Annuali Dipendenti"))', '28');
    await page.fill('input:below(:text("Limite Massimo Permesso Studio"))', '3');
    await page.click('button:has-text("Salva Impostazioni")');
    await expect(page.locator('.toast.success')).toContainText('salvate');

    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // Accedi come dipendente
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica che il saldo totale ferie del dipendente sia ora 28
    await expect(page.locator('.stat-card:has-text("Residuo Disponibile") .stat-value')).toContainText('28 g');
  });

  test('6. Invio comunicazione da Admin e visualizzazione popup bloccante per dipendente', async ({ page }) => {
    // Accedi come Admin ed entra nelle comunicazioni
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();
    await page.click('.nav-item:has-text("Comunicazioni")');

    // Digita ed invia comunicazione
    await page.fill('textarea[placeholder*="Scrivi qui la comunicazione"]', 'Nuovo orario estivo');
    await page.click('button:has-text("Invia Comunicazione a Tutti")');
    await expect(page.locator('.toast.success')).toContainText('successo');

    // Logout
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // Accedi come dipendente
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica la presenza del popup bloccante
    const modal = page.locator('.modal-backdrop:has-text("Comunicazione Importante")');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Nuovo orario estivo');

    // Conferma la lettura
    await modal.locator('button:has-text("Ho letto e confermo la lettura")').click();
    await expect(modal).not.toBeVisible();
  });

});
