// tests/employee_crud_spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Gestione Anagrafica Collaboratori - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    await page.goto(BASE_URL);
  });

  test('CRUD completo collaboratore come Admin', async ({ page }) => {
    // 1. Accedi come Admin User
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();

    // 2. Naviga nella scheda "Anagrafica Collaboratori"
    await page.click('.nav-item:has-text("Anagrafica Collaboratori")');

    // 3. Verifica la presenza del modulo "Nuovo Collaboratore"
    await expect(page.locator('.glass-card', { hasText: 'Nuovo Collaboratore' })).toBeVisible();

    // 4. Compila il modulo di creazione
    await page.fill('input[placeholder="es. Mario Rossi"]', 'Giovanni Neri');
    await page.fill('input[placeholder="es. mario.rossi@azienda.it"]', 'giovanni.neri@azienda.it');
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.selectOption('select:has-text("Dipendente")', 'Dipendente');
    await page.fill('input[placeholder="es. +39 333 1234567"]', '+39 340 1234567');
    await page.fill('input[placeholder="es. Via Roma 10, Milano"]', 'Via Milano 15, Roma');
    await page.fill('input[placeholder="es. 45.00"]', '35.50');
    await page.fill('input[placeholder="es. A1"]', 'B2');
    await page.fill('input[placeholder="es. 30"]', '28');

    // 5. Clicca su "Crea Collaboratore"
    await page.click('button:has-text("Crea Collaboratore")');

    // 6. Verifica la notifica di successo
    const toastSuccess = page.locator('.toast.success').filter({ hasText: 'creato con successo' });
    await expect(toastSuccess).toBeVisible();

    // 7. Verifica la presenza del nuovo dipendente nella tabella
    const tableRow = page.locator('.custom-table tbody tr', { hasText: 'Giovanni Neri' });
    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText('giovanni.neri@azienda.it');
    await expect(tableRow).toContainText('B2');
    await expect(tableRow).toContainText('€ 35.50/giorno');
    await expect(tableRow).toContainText('26 / 26 gg');

    // 8. Clicca su "Modifica" per il dipendente
    await tableRow.locator('button:has-text("Modifica")').click();

    // 9. Modifica il costo interno e il livello aziendale
    await page.fill('input[placeholder="es. 45.00"]', '40.00');
    await page.fill('input[placeholder="es. A1"]', 'C1');

    // 10. Salva le modifiche
    await page.click('button:has-text("Salva Modifiche")');

    // 11. Verifica la notifica di successo per aggiornamento
    const toastUpdateSuccess = page.locator('.toast.success').filter({ hasText: 'aggiornato con successo' });
    await expect(toastUpdateSuccess).toBeVisible();

    // 12. Verifica i dati aggiornati nella tabella
    await expect(tableRow).toContainText('C1');
    await expect(tableRow).toContainText('€ 40.00/giorno');

    // 13. Verifica il limite di 4 caratteri per il livello aziendale
    await tableRow.locator('button:has-text("Modifica")').click();
    const levelInput = page.locator('input[placeholder="es. A1"]');
    await levelInput.fill('LEVELTOO-LONG');
    const levelValue = await levelInput.inputValue();
    expect(levelValue.length).toBeLessThanOrEqual(4);
    expect(levelValue).toBe('LEVE'); // Should be truncated to first 4 chars

    // Annulla la modifica
    await page.click('button:has-text("Annulla")');

    // 14. Elimina il dipendente
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await tableRow.locator('button:has-text("Elimina")').click();

    // 15. Verifica la notifica di successo per eliminazione
    const toastDeleteSuccess = page.locator('.toast.success').filter({ hasText: 'eliminato con successo' });
    await expect(toastDeleteSuccess).toBeVisible();

    // 16. Verifica che non sia più presente nella tabella
    await expect(page.locator('.custom-table tbody tr', { hasText: 'Giovanni Neri' })).not.toBeVisible();
  });

  test('CRUD completo collaboratore come HR', async ({ page }) => {
    // 1. Accedi come HR User
    await page.locator('.quick-login-btn', { hasText: 'HR User' }).click();

    // 2. Naviga nella scheda "Anagrafica Collaboratori"
    await page.click('.nav-item:has-text("Anagrafica Collaboratori")');

    // 3. Verifica la presenza del modulo "Nuovo Collaboratore"
    await expect(page.locator('.glass-card', { hasText: 'Nuovo Collaboratore' })).toBeVisible();

    // 4. Compila il modulo di creazione
    await page.fill('input[placeholder="es. Mario Rossi"]', 'Francesca Bianchi');
    await page.fill('input[placeholder="es. mario.rossi@azienda.it"]', 'francesca.bianchi@azienda.it');
    await page.fill('input[placeholder="Password"]', 'password456');
    await page.selectOption('select:has-text("Dipendente")', 'Dipendente');
    await page.fill('input[placeholder="es. +39 333 1234567"]', '+39 349 7654321');
    await page.fill('input[placeholder="es. Via Roma 10, Milano"]', 'Via Firenze 20, Pisa');
    await page.fill('input[placeholder="es. 45.00"]', '42.00');
    await page.fill('input[placeholder="es. A1"]', 'C2');
    await page.fill('input[placeholder="es. 30"]', '30');

    // 5. Clicca su "Crea Collaboratore"
    await page.click('button:has-text("Crea Collaboratore")');

    // 6. Verifica la notifica di successo
    const toastSuccess = page.locator('.toast.success').filter({ hasText: 'creato con successo' });
    await expect(toastSuccess).toBeVisible();

    // 7. Verifica la presenza del nuovo dipendente nella tabella
    const tableRow = page.locator('.custom-table tbody tr', { hasText: 'Francesca Bianchi' });
    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText('francesca.bianchi@azienda.it');
    await expect(tableRow).toContainText('C2');
    await expect(tableRow).toContainText('€ 42.00/giorno');
    await expect(tableRow).toContainText('26 / 26 gg');

    // 8. Clicca su "Modifica" per il dipendente
    await tableRow.locator('button:has-text("Modifica")').click();

    // 9. Modifica il costo interno e il livello aziendale
    await page.fill('input[placeholder="es. 45.00"]', '48.00');
    await page.fill('input[placeholder="es. A1"]', 'B1');

    // 10. Salva le modifiche
    await page.click('button:has-text("Salva Modifiche")');

    // 11. Verifica la notifica di successo per aggiornamento
    const toastUpdateSuccess = page.locator('.toast.success').filter({ hasText: 'aggiornato con successo' });
    await expect(toastUpdateSuccess).toBeVisible();

    // 12. Verifica i dati aggiornati nella tabella
    await expect(tableRow).toContainText('B1');
    await expect(tableRow).toContainText('€ 48.00/giorno');

    // 13. Elimina il dipendente
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await tableRow.locator('button:has-text("Elimina")').click();

    // 14. Verifica la notifica di successo per eliminazione
    const toastDeleteSuccess = page.locator('.toast.success').filter({ hasText: 'eliminato con successo' });
    await expect(toastDeleteSuccess).toBeVisible();

    // 15. Verifica che non sia più presente nella tabella
    await expect(page.locator('.custom-table tbody tr', { hasText: 'Francesca Bianchi' })).not.toBeVisible();
  });

});
