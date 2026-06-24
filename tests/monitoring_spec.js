const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Controllo Gestione, Spese Non-Labor, Riapertura Rapportini e CRUD Collaboratori - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    await page.goto(BASE_URL);
  });

  test('Portfolio Commesse, Allerte e CRUD Spese Non-Labor', async ({ page }) => {
    // 1. Accedi come HR User
    await page.locator('.quick-login-btn', { hasText: 'HR User' }).click();

    // 2. Naviga nella scheda "Preventivo vs Consuntivo"
    await page.click('.nav-item:has-text("Preventivo vs Consuntivo")');

    // 3. Verifica visualizzazione Portfolio Commesse (quando non è selezionato nulla)
    await expect(page.locator('.card-title', { hasText: 'Portfolio Commesse & Controllo Gestione' })).toBeVisible();
    await expect(page.locator('table.custom-table tbody tr', { hasText: 'Progetto Alpha' })).toBeVisible();

    // 4. Seleziona Progetto Alpha cliccando su "Dettaglio"
    const rowAlpha = page.locator('table.custom-table tbody tr', { hasText: 'Progetto Alpha' });
    await rowAlpha.locator('button:has-text("Dettaglio")').click();

    // 5. Verifica che sia selezionato Progetto Alpha nel menu a tendina
    await expect(page.locator('select.form-input')).toHaveValue('proj-1');

    // 6. Verifica la presenza della sezione "Spese Non-Labor"
    await expect(page.locator('.card-title', { hasText: 'Spese Non-Labor' })).toBeVisible();

    // 7. Aggiungi una spesa non-labor
    await page.click('button:has-text("Aggiungi Spesa")');
    await page.fill('input[type="date"]', '2026-08-20');
    await page.selectOption('#expense-category-select', 'Software');
    await page.fill('input[placeholder="es. 120.00"]', '500.00');
    await page.fill('input[placeholder="Aggiungi dettagli sulla spesa..."]', 'Licenza IDE');
    await page.click('button:has-text("Registra Spesa")');

    // Verifica toast di successo e riga inserita
    await expect(page.locator('.toast.success', { hasText: 'Spesa registrata con successo' })).toBeVisible();
    const expenseRow = page.locator('table.custom-table tbody tr', { hasText: 'Licenza IDE' });
    await expect(expenseRow).toBeVisible();
    await expect(expenseRow).toContainText('Software');
    await expect(expenseRow).toContainText('500,00');

    // 8. Modifica la spesa non-labor
    await expenseRow.locator('button:has-text("Modifica")').click();
    await page.fill('input[placeholder="es. 120.00"]', '600.00');
    await page.fill('input[placeholder="Aggiungi dettagli sulla spesa..."]', 'Licenza IDE Sviluppo');
    await page.click('button:has-text("Salva Modifiche")');

    // Verifica toast di successo e aggiornamento riga
    await expect(page.locator('.toast.success', { hasText: 'Spesa modificata con successo' })).toBeVisible();
    const updatedRow = page.locator('table.custom-table tbody tr', { hasText: 'Licenza IDE Sviluppo' });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText('600,00');

    // 9. Elimina la spesa non-labor
    page.once('dialog', dialog => dialog.accept());
    await updatedRow.locator('button:has-text("Elimina")').click();
    await expect(page.locator('.toast.success', { hasText: 'Spesa eliminata con successo' })).toBeVisible();
    await expect(page.locator('table.custom-table tbody tr', { hasText: 'Licenza IDE Sviluppo' })).not.toBeVisible();
  });

  test('Flusso completo di Riapertura Rapportino', async ({ page }) => {
    // 1. Accedi come dipendente Mario Rossi
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // 2. Naviga nella scheda Rapportino
    await page.click('.nav-item:has-text("Rapportino")');

    // Seleziona Agosto 2026
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');

    // Compila giorno 10 come lavoro su Progetto Alpha
    const row10 = page.locator('tr[data-date="2026-08-10"]');
    await row10.locator('select.timesheet-project-select').selectOption('Progetto Alpha');
    await row10.locator('input[type="number"]').fill('8');
    await row10.locator('input[placeholder="Note..."]').fill('Test Reopen');

    // Salva bozza e invia in approvazione
    await page.click('.timesheet-tab-container button:has-text("Salva Bozza")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.click('.timesheet-tab-container button:has-text("Invia per Approvazione")');
    await expect(page.locator('.toast.success').first()).toBeVisible();
    await expect(page.locator('.timesheet-tab-container .badge', { hasText: 'Inviato' })).toBeVisible();

    // Logout
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // 3. Accedi come HR User
    await page.locator('.quick-login-btn', { hasText: 'HR User' }).click();

    // Naviga in "Approvazioni Rapportini"
    await page.click('.nav-item:has-text("Approvazioni Rapportini")');

    // Trova il rapportino di Mario Rossi
    const pendingRow = page.locator('.glass-card', { hasText: 'Mario Rossi' }).filter({ hasText: 'Agosto 2026' });
    await expect(pendingRow).toBeVisible();

    // Verifica presenza pulsante Riapri
    const reopenBtn = pendingRow.locator('button:has-text("Riapri")');
    await expect(reopenBtn).toBeVisible();

    // Clicca su Riapri
    page.once('dialog', dialog => dialog.accept());
    await reopenBtn.click();

    // Verifica successo e sparizione dalla lista
    await expect(page.locator('.toast.success', { hasText: 'Rapportino riaperto con successo' })).toBeVisible();
    await expect(pendingRow).not.toBeVisible();

    // Logout e rientra come Mario Rossi
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Controlla che il rapportino di Agosto 2026 sia tornato in Bozza ed è modificabile
    await page.click('.nav-item:has-text("Rapportino")');
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');
    await expect(page.locator('.timesheet-tab-container .badge', { hasText: 'Bozza' })).toBeVisible();
    await expect(page.locator('.timesheet-tab-container button:has-text("Invia per Approvazione")')).toBeEnabled();
  });

  test('Validazione Chiavi Esterne (Cascade Delete) Collaboratore', async ({ page }) => {
    // 1. Accedi come Admin User
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();

    // 2. Crea un nuovo collaboratore
    await page.click('.nav-item:has-text("Anagrafica Collaboratori")');
    await page.fill('input[placeholder="es. Mario Rossi"]', 'Test Cascade');
    await page.fill('input[placeholder="es. mario.rossi@azienda.it"]', 'test.cascade@azienda.it');
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.selectOption('select:has-text("Dipendente")', 'Dipendente');
    await page.click('button:has-text("Crea Collaboratore")');
    await expect(page.locator('.toast.success', { hasText: 'creato con successo' })).toBeVisible();

    // 3. Elimina il collaboratore fittizio
    const tableRow = page.locator('.custom-table tbody tr', { hasText: 'Test Cascade' });
    page.once('dialog', dialog => dialog.accept());
    await tableRow.locator('button:has-text("Elimina")').click();
    await expect(page.locator('.toast.success', { hasText: 'eliminato con successo' })).toBeVisible();
    await expect(tableRow).not.toBeVisible();
  });

});
