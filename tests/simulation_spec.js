// tests/simulation_spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Simulazione Commesse - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    await page.goto(BASE_URL);
  });

  test('Pianificazione e calcolo margine commessa come Team Leader', async ({ page }) => {
    // 1. Esegui l'accesso rapido come Giuseppe Verdi (Team Leader)
    await page.locator('.quick-login-btn', { hasText: 'Giuseppe Verdi' }).click();

    // Dismiss any blocking communication modals
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
        }).toPass({ timeout: 3000 });
      } else {
        break;
      }
    }

    // 2. Naviga nella scheda "Simulazione Commesse"
    await page.click('.nav-item:has-text("Simulazione Commesse")');

    // 3. Verifica il titolo della pagina
    await expect(page.locator('.header-title')).toContainText('Simulatore Margine Commessa');

    // 4. Seleziona la commessa "Progetto Alpha"
    await page.selectOption('select:has-text("Seleziona una commessa")', { label: 'Progetto Alpha' });

    // 5. Verifica i dettagli del Progetto Alpha
    await expect(page.locator('.glass-card', { hasText: 'Dettagli Commessa' })).toBeVisible();
    await expect(page.locator('.glass-card', { hasText: 'Dettagli Commessa' })).toContainText('Progetto Alpha');

    // 6. Clicca su "+ Aggiungi Risorsa"
    await page.click('button:has-text("+ Aggiungi Risorsa")');

    // 7. Seleziona il collaboratore "Mario Rossi" nella prima riga
    const firstRow = page.locator('.custom-table tbody tr').first();
    await firstRow.locator('select').selectOption({ label: 'Mario Rossi (Dipendente)' });

    // Verifica che il costo interno di Mario Rossi venga caricato ed i campi Nome e Costo siano disabilitati
    await expect(firstRow.locator('input[type="text"]')).toBeDisabled();
    await expect(firstRow.locator('input[placeholder="0.00"]')).toBeDisabled();
    const marioCost = await firstRow.locator('input[placeholder="0.00"]').inputValue();
    expect(parseFloat(marioCost)).toBeGreaterThan(0);

    // Inserisci 10 giorni allocati per Mario Rossi
    await firstRow.locator('input[placeholder="0"]').fill('10');

    // 8. Clicca su "+ Aggiungi Risorsa" di nuovo
    await page.click('button:has-text("+ Aggiungi Risorsa")');
    const secondRow = page.locator('.custom-table tbody tr').nth(1);
    
    // Seleziona "Nuova figura professionale"
    await secondRow.locator('select').selectOption({ label: 'Nuova figura professionale' });

    // Verifica che Nome e Costo siano abilitati
    await expect(secondRow.locator('input[type="text"]')).toBeEnabled();
    await expect(secondRow.locator('input[placeholder="0.00"]')).toBeEnabled();

    // Inserisci Nome, Costo e Giorni
    await secondRow.locator('input[type="text"]').fill('Senior Dev External');
    await secondRow.locator('input[placeholder="0.00"]').fill('400.00');
    await secondRow.locator('input[placeholder="0"]').fill('5');

    // 9. Verifica i calcoli nel cruscotto finanziario
    const expectedMarioTotal = parseFloat(marioCost) * 10;
    const expectedSeniorTotal = 400 * 5;
    const expectedTotalCosts = expectedMarioTotal + expectedSeniorTotal;

    const financialCard = page.locator('.glass-card', { hasText: 'Analisi Finanziaria' });
    await expect(financialCard).toBeVisible();

    const formattedTotalCosts = expectedTotalCosts.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    await expect(financialCard).toContainText(formattedTotalCosts.replace(/\u00a0/g, ' '));

    // 10. Rimuovi la seconda risorsa e verifica che i calcoli si aggiornino
    await secondRow.locator('button:has-text("Rimuovi")').click();

    // Ora dovrebbero esserci solo i costi di Mario Rossi
    const updatedTotalCosts = parseFloat(marioCost) * 10;
    const formattedUpdatedCosts = updatedTotalCosts.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    await expect(financialCard).toContainText(formattedUpdatedCosts.replace(/\u00a0/g, ' '));
  });

  test('Salvataggio molteplici scenari, caricamento e impostazione pianificazione ottimale esclusiva', async ({ page }) => {
    // 1. Esegui l'accesso rapido come Giuseppe Verdi (Team Leader)
    await page.locator('.quick-login-btn', { hasText: 'Giuseppe Verdi' }).click();

    // Dismiss blocking communication modals
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
        }).toPass({ timeout: 3000 });
      } else {
        break;
      }
    }

    // 2. Naviga nella scheda "Simulazione Commesse"
    await page.click('.nav-item:has-text("Simulazione Commesse")');

    // 3. Seleziona la commessa "Progetto Alpha"
    await page.selectOption('select:has-text("Seleziona una commessa")', { label: 'Progetto Alpha' });

    // 4. Inizialmente non ci dovrebbero essere scenari salvati
    await expect(page.locator('.glass-card', { hasText: 'Storico Scenari' })).toContainText('Nessuno scenario salvato');

    // 5. Componi Scenario A (Aggiungi Mario Rossi per 5 giorni)
    await page.click('button:has-text("+ Aggiungi Risorsa")');
    const firstRow = page.locator('.custom-table tbody tr').first();
    await firstRow.locator('select').selectOption({ label: 'Mario Rossi (Dipendente)' });
    await firstRow.locator('input[placeholder="0"]').fill('5');

    // Salva come "Scenario A"
    await page.fill('input[placeholder="es. Scenario Ottimista"]', 'Scenario A');
    await page.click('button:has-text("Salva")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // 6. Crea una nuova pianificazione pulita (Scenario B)
    await page.click('button:has-text("Nuova")');
    // Verifica che la tabella sia vuota (mostrando la riga segnaposto)
    await expect(page.locator('.custom-table tbody tr')).toContainText('Nessuna risorsa aggiunta');

    // Componi Scenario B (Aggiungi una figura custom a 500€ per 10 giorni)
    await page.click('button:has-text("+ Aggiungi Risorsa")');
    const bRow = page.locator('.custom-table tbody tr').first();
    await bRow.locator('select').selectOption({ label: 'Nuova figura professionale' });
    await bRow.locator('input[type="text"]').fill('Architect Custom');
    await bRow.locator('input[placeholder="0.00"]').fill('500.00');
    await bRow.locator('input[placeholder="0"]').fill('10');

    // Salva come "Scenario B"
    await page.fill('input[placeholder="es. Scenario Ottimista"]', 'Scenario B');
    await page.click('button:has-text("Salva")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // 7. Lo storico ora deve contenere Scenario A e Scenario B
    const historyCard = page.locator('.glass-card', { hasText: 'Storico Scenari' });
    await expect(historyCard.locator('text=Scenario A')).toBeVisible();
    await expect(historyCard.locator('text=Scenario B')).toBeVisible();

    // 8. Imposta Scenario B come PIANIFICAZIONE OTTIMALE
    const scenarioBItem = historyCard.locator('.simulation-history-item', { hasText: 'Scenario B' }).first();
    await scenarioBItem.locator('button:has-text("Imposta Ottimale")').click();
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // Scenario B deve avere il badge "PIANIFICAZIONE OTTIMALE"
    await expect(scenarioBItem.locator('text=PIANIFICAZIONE OTTIMALE')).toBeVisible();

    // Scenario A NON deve averlo
    const scenarioAItem = historyCard.locator('.simulation-history-item', { hasText: 'Scenario A' }).first();
    await expect(scenarioAItem.locator('text=PIANIFICAZIONE OTTIMALE')).not.toBeVisible();

    // 9. Imposta Scenario A come PIANIFICAZIONE OTTIMALE (exclusivity check)
    await scenarioAItem.locator('button:has-text("Imposta Ottimale")').click();
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // Ora Scenario A ha il badge
    await expect(scenarioAItem.locator('text=PIANIFICAZIONE OTTIMALE')).toBeVisible();
    // E Scenario B NON lo ha più
    await expect(scenarioBItem.locator('text=PIANIFICAZIONE OTTIMALE')).not.toBeVisible();
  });

});
