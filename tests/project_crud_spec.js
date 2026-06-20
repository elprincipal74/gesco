// tests/project_crud_spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Gestione Commesse - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    await page.goto(BASE_URL);
  });

  test('CRUD completo commessa con campi finanziari e gestionali come Admin', async ({ page }) => {
    // 1. Accedi come Admin User
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();

    // 2. Naviga nella scheda "Gestione Commesse"
    await page.click('.nav-item:has-text("Gestione Commesse")');

    // 3. Verifica la presenza del modulo "Configurazione Nuova Commessa"
    await expect(page.locator('.glass-card', { hasText: 'Configurazione Nuova Commessa' })).toBeVisible();

    // 4. Compila il modulo di creazione
    await page.fill('input[placeholder="es. Progetto Delta"]', 'Progetto Gamma');
    await page.fill('textarea[placeholder="Fornisci una breve descrizione della commessa..."]', 'Sviluppo frontend con React');
    await page.fill('input[placeholder="es. 15000.00"]', '12000.00');
    await page.fill('input[placeholder="es. 20"]', '25');
    
    // Riempi i nuovi campi
    await page.fill('input[type="date"] >> nth=0', '2026-07-01');
    await page.fill('input[type="date"] >> nth=1', '2026-12-31');
    await page.fill('input[placeholder="Nome del responsabile"]', 'Mario Rossi');
    await page.fill('input[placeholder="Nome del Project Manager"]', 'Giuseppe Verdi');

    // 5. Clicca su "Crea Commessa"
    await page.click('button:has-text("Crea Commessa")');

    // 6. Verifica la notifica di successo
    const toastSuccess = page.locator('.toast.success').filter({ hasText: 'creata con successo' });
    await expect(toastSuccess).toBeVisible();

    // 7. Verifica la presenza della nuova commessa nella tabella "Commesse Configurate"
    const tableRow = page.locator('.custom-table tbody tr', { hasText: 'Progetto Gamma' });
    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText('Sviluppo frontend con React');
    await expect(tableRow).toContainText('Mario Rossi');
    await expect(tableRow).toContainText('Giuseppe Verdi');
    await expect(tableRow).toContainText('01/07/2026');
    await expect(tableRow).toContainText('31/12/2026');
    await expect(tableRow).toContainText('€ 12000.00');
    await expect(tableRow).toContainText('25%');

    // 8. Clicca su "Modifica" per la commessa
    await tableRow.locator('button:has-text("Modifica")').click();

    // 9. Modifica il Project Manager
    await page.fill('input[placeholder="Nome del Project Manager"]', 'HR User');

    // 10. Salva le modifiche
    await page.click('button:has-text("Salva Modifiche")');

    // 11. Verifica la notifica di successo per aggiornamento
    const toastUpdateSuccess = page.locator('.toast.success').filter({ hasText: 'aggiornata con successo' });
    await expect(toastUpdateSuccess).toBeVisible();

    // 12. Verifica i dati aggiornati nella tabella
    await expect(tableRow).toContainText('HR User');

    // Annulla o pulisci
    await tableRow.locator('button:has-text("Modifica")').click();
    await page.click('button:has-text("Annulla")');

    // 13. Elimina la commessa
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await tableRow.locator('button:has-text("Elimina")').click();

    // 14. Verifica la notifica di successo per eliminazione
    const toastDeleteSuccess = page.locator('.toast.success').filter({ hasText: 'eliminata con successo' });
    await expect(toastDeleteSuccess).toBeVisible();

    // 15. Verifica che non sia più presente nella tabella
    await expect(page.locator('.custom-table tbody tr', { hasText: 'Progetto Gamma' })).not.toBeVisible();
  });

});
