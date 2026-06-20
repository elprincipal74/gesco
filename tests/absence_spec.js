// tests/absence_spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Gestione Tipi Assenza - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    await page.goto(BASE_URL);
  });

  test('Creazione di un nuovo tipo di assenza come Admin', async ({ page }) => {
    // 1. Accedi come Admin User
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();

    // 2. Naviga nella scheda "Gestione Tipi Assenza"
    await page.click('.nav-item:has-text("Gestione Tipi Assenza")');

    // 3. Verifica la presenza del modulo "Configurazione Nuovo Tipo Assenza"
    await expect(page.locator('.glass-card', { hasText: 'Configurazione Nuovo Tipo Assenza' })).toBeVisible();

    // 4. Compila il modulo
    await page.fill('input[placeholder="es. Congedo Straordinario"]', 'Congedo Straordinario');
    await page.fill('textarea[placeholder="Fornisci una breve descrizione del tipo di assenza..."]', 'Descrizione di prova');

    // 5. Clicca su "Crea Tipo Assenza"
    await page.click('button:has-text("Crea Tipo Assenza")');

    // 6. Verifica la notifica di successo
    const toast = page.locator('.toast.success').filter({ hasText: 'successo' });
    await expect(toast).toBeVisible();

    // 7. Verifica la presenza del nuovo tipo di assenza nella tabella dei tipi configurati
    const tableRow = page.locator('.custom-table tbody tr', { hasText: 'Congedo Straordinario' });
    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText('Descrizione di prova');
  });

});
