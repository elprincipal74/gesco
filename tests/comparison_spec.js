// tests/comparison_spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

async function dismissModals(page) {
  const modalBackdrop = page.locator('.modal-backdrop');
  for (let i = 0; i < 5; i++) {
    try {
      await expect(modalBackdrop).toBeVisible({ timeout: i === 0 ? 1500 : 500 });
    } catch (e) {
      break;
    }
    const ackButton = modalBackdrop.locator('button:has-text("Ho letto e confermo la lettura")');
    if (await ackButton.count() > 0) {
      const currentText = await page.locator('.modal-backdrop .modal-body').textContent();
      await ackButton.click();
      await expect(async () => {
        const isStillVisible = await modalBackdrop.isVisible();
        if (!isStillVisible) return true;
        const newText = await page.locator('.modal-backdrop .modal-body').textContent();
        if (newText !== currentText) return true;
        throw new Error("Modal text not updated yet");
      }).toPass({ timeout: 10000 });
    } else {
      break;
    }
  }
}

test.describe('Dashboard Preventivo vs Consuntivo - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    await page.goto(BASE_URL);
  });

  test('Flusso completo di confronto preventivo vs consuntivo', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Accedi come Admin User per creare la commessa e assegnarla a Mario Rossi
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();
    await dismissModals(page);

    // 2. Naviga in Gestione Commesse
    await page.click('.nav-item:has-text("Gestione Commesse")');

    // 3. Crea una commessa "Confronto Progetto" con prezzo di vendita 3000.00 e margine 20%
    await page.fill('input[placeholder="es. Progetto Delta"]', 'Confronto Progetto');
    await page.fill('textarea[placeholder="Fornisci una breve descrizione della commessa..."]', 'Progetto per testare gli scostamenti preventivo/consuntivo');
    await page.fill('input[placeholder="es. 15000.00"]', '3000.00');
    await page.fill('input[placeholder="es. 20"]', '20');
    await page.fill('input[type="date"] >> nth=0', '2026-08-01');
    await page.fill('input[type="date"] >> nth=1', '2026-08-31');
    await page.fill('input[placeholder="Nome del responsabile"]', 'Giuseppe Verdi');
    await page.fill('input[placeholder="Nome del Project Manager"]', 'Admin User');
    await page.click('button:has-text("Crea Commessa")');
    await expect(page.locator('.toast.success').filter({ hasText: 'creata con successo' })).toBeVisible();

    // 4. Assegna la commessa "Confronto Progetto" a Mario Rossi
    await page.selectOption('select:has-text("Seleziona un dipendente...")', { label: 'Mario Rossi (Dipendente)' });
    await expect(page.locator('label:has-text("Progetto Alpha") input[type="checkbox"]')).toBeChecked();
    await page.locator('label:has-text("Confronto Progetto") input[type="checkbox"]').evaluate(el => el.click());
    await expect(page.locator('.toast.success').filter({ hasText: 'Assegnazione aggiornata' })).toBeVisible();

    // 5. Naviga nel tab "Simulazione Commesse" per impostare la pianificazione ottimale
    await page.click('.nav-item:has-text("Simulazione Commesse")');
    await page.selectOption('select:has-text("Seleziona una commessa")', { label: 'Confronto Progetto' });

    // Aggiungi Mario Rossi con 10 giorni
    await page.click('button:has-text("Aggiungi Risorsa")');
    const resourceRow = page.locator('.custom-table tbody tr').first();
    await resourceRow.locator('select').selectOption({ label: 'Mario Rossi (Dipendente)' });
    await resourceRow.locator('input[type="number"] >> nth=1').fill('10'); // Giorni allocati

    // Salva lo scenario
    await page.fill('input[placeholder="es. Scenario Ottimista"]', 'Scenario Ottimale');
    await page.click('button:has-text("Salva")');
    await expect(page.locator('.toast.success').filter({ hasText: 'salvata nello storico' })).toBeVisible();

    // Imposta lo scenario come ottimale
    await page.click('button:has-text("Imposta Ottimale")');
    await expect(page.locator('.toast.success').filter({ hasText: 'impostato come PIANIFICAZIONE OTTIMALE' })).toBeVisible();

    // Sconnetti Admin
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item:has-text("Disconnetti")');

    // 6. Accedi come Mario Rossi per registrare le ore nei rapportini
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();
    await dismissModals(page);

    // Naviga nella scheda Rapportino
    await page.click('.nav-item:has-text("Rapportino")');

    // Seleziona Agosto 2026
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');

    // Compila 5 giorni con 8 ore ciascuno (totale 40 ore) su "Confronto Progetto"
    const dates = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'];
    for (const dt of dates) {
      const row = page.locator(`tr[data-date="${dt}"]`);
      await row.locator('select.timesheet-project-select').selectOption('Confronto Progetto');
      await row.locator('input[type="number"]').fill('8');
    }

    // Salva bozza e invia in approvazione
    await page.click('.timesheet-tab-container button:has-text("Salva Bozza")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.click('.timesheet-tab-container button:has-text("Invia per Approvazione")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // Sconnetti Mario Rossi
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item:has-text("Disconnetti")');

    // 7. Accedi come Team Leader (Giuseppe Verdi) per visualizzare il confronto preventivo vs consuntivo
    await page.locator('.quick-login-btn', { hasText: 'Giuseppe Verdi' }).click();
    await dismissModals(page);

    // Naviga nella dashboard "Preventivo vs Consuntivo"
    await page.click('.nav-item:has-text("Preventivo vs Consuntivo")');

    // Seleziona la commessa "Confronto Progetto"
    await page.selectOption('select:has-text("-- Seleziona una commessa --")', { label: 'Confronto Progetto' });

    // Verifica il riepilogo dei costi
    // Preventivato: Costo = 120 (costo giornaliero Mario Rossi) * 10 = 1200
    // Consuntivato: Costo = 40 ore / 8 * 120 = 600
    // Variance: Costo = 600 - 1200 = -600 (risparmio)
    const plannedCard = page.locator('.glass-card', { hasText: 'Costo pianificato per' });
    await expect(plannedCard).toContainText(/1[.,]?200[.,]00/);
    await expect(plannedCard).toContainText(/60[.,]0%/); // Margine preventivo

    const actualCard = page.locator('.glass-card', { hasText: 'Costo effettivo registrato' });
    await expect(actualCard).toContainText(/600[.,]00/);
    await expect(actualCard).toContainText(/80[.,]0%/); // Margine consuntivo (3000-600)/3000 = 80%

    const varianceCard = page.locator('.glass-card', { hasText: 'Varianza di costo' });
    await expect(varianceCard).toContainText(/-600[.,]00/);
    await expect(varianceCard).toContainText(/\+20[.,]0%/); // Margine varianza
    await expect(varianceCard).toContainText('Ore da consuntivare mancanti:');
    await expect(varianceCard).toContainText('40h');

    // Verifica il dettaglio risorsa
    const tableRow = page.locator('.custom-table tbody tr', { hasText: 'Mario Rossi' });
    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText('80h'); // Ore pianificate (10gg * 8h)
    await expect(tableRow).toContainText('40h'); // Ore consuntivate (5gg * 8h)
    await expect(tableRow).toContainText('-40h'); // Scostamento ore
    await expect(tableRow).toContainText(/1[.,]?200[.,]00/); // Costo preventivo
    await expect(tableRow).toContainText(/600[.,]00/); // Costo consuntivo
    await expect(tableRow).toContainText(/-600[.,]00/); // Varianza costo
  });

});
