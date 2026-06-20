// tests/playwright_spec.js
// Esempio di implementazione dei test automatici E2E con Playwright.
// Questa suite testa i flussi principali dell'applicazione "Sistema Ferie".

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('Sistema Gestione Ferie - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset database to initial seed state
    await page.request.post(`${BASE_URL}/api/test/reset`);
    
    // Carica la pagina e imposta la sessione pulita
    await page.goto(BASE_URL);
  });

  test('1. Login come Dipendente e inserimento richiesta ferie di 1 giorno', async ({ page }) => {
    // Esegui l'accesso rapido come "Mario Rossi"
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica la visualizzazione della dashboard
    await expect(page.locator('.logo-text')).toContainText('Sistema Ferie');
    await expect(page.locator('.user-profile-widget')).toContainText('Mario Rossi');

    // Clicca su un giorno specifico del calendario (es. il giorno 17 del mese corrente)
    const targetCell = page.locator('.date-picker-cell').filter({ hasText: /^17$/ }).first();
    await targetCell.click();

    // Scegli la tipologia di assenza "Ferie"
    await page.click('.type-card-option:has-text("Ferie")');

    // Invia la richiesta
    await page.click('button:has-text("Invia Richiesta")');

    // Verifica la notifica di successo
    const toast = page.locator('.toast.success').filter({ hasText: 'successo' });
    await expect(toast).toBeVisible();

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
    const toast = page.locator('.toast.success').filter({ hasText: 'successo' });
    await expect(toast).toBeVisible();
  });

  test('3. Approvazione richiesta da parte dell\'utente HR con evidenza approvatore', async ({ page }) => {
    // 1. Mario Rossi compila e invia una richiesta
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();
    const targetCell = page.locator('.date-picker-cell').filter({ hasText: /^17$/ }).first();
    await targetCell.click();
    await page.click('.type-card-option:has-text("Ferie")');
    await page.click('button:has-text("Invia Richiesta")');
    await expect(page.locator('.toast.success').filter({ hasText: 'successo' })).toBeVisible();

    // Logout
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // 2. Accedi come HR User
    await page.locator('.quick-login-btn', { hasText: 'HR User' }).click();

    // Naviga nella scheda Approvazioni
    await page.locator('.nav-item').filter({ hasText: /Approvazioni \(\d+\)/ }).first().click();

    // Verifica la presenza della tabella richieste pendenti
    await expect(page.locator('.card-title')).toContainText('Richieste Ferie Pendenti');
    await expect(page.locator('.role-badge-pill.hr').filter({ hasText: 'HR Panel' })).toBeVisible();

    // Approva la prima richiesta pendente
    await page.locator('button:has-text("Approva")').first().click();
    await expect(page.locator('.toast.success').filter({ hasText: 'approvata' })).toBeVisible();

    // Esegui logout
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // Rientra come dipendente per verificare la firma di approvazione
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica che la richiesta approvata rechi la dicitura "Approvata da: HR User (HR)"
    const approvedByText = page.locator('.custom-table tbody tr').first();
    await expect(approvedByText).toContainText('Approvata da: HR User (HR)');
  });

  test('4. Rifiuto richiesta da parte dell\'Admin con motivazione visibile', async ({ page }) => {
    // 1. Mario Rossi compila e invia una richiesta
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();
    const targetCell = page.locator('.date-picker-cell').filter({ hasText: /^18$/ }).first();
    await targetCell.click();
    await page.click('.type-card-option:has-text("Malattia")');
    await page.click('button:has-text("Invia Richiesta")');
    await expect(page.locator('.toast.success').filter({ hasText: 'successo' })).toBeVisible();

    // Logout
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');

    // 2. Accedi come Admin
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();

    // Naviga su Approvazioni
    await page.locator('.nav-item').filter({ hasText: /Approvazioni \(\d+\)/ }).first().click();

    // Clicca su Rifiuta per la prima richiesta pendente
    await page.locator('button:has-text("Rifiuta")').first().click();

    // Compila la motivazione nel modal
    const textarea = page.locator('.modal-window textarea');
    await textarea.fill('Rifiutata per sovrapposizione turni');
    await page.click('.modal-window button:has-text("Rifiuta Richiesta")');

    await expect(page.locator('.toast.success').filter({ hasText: 'rifiutata' })).toBeVisible();

    // Logout e login dipendente per verifica
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Verifica diciture di rifiuto e motivo
    const targetCellVerify = page.locator('.custom-table tbody tr').first();
    await expect(targetCellVerify).toContainText('Rifiutata da: Admin User (Admin)');
    await expect(targetCellVerify.locator('.rejection-reason-box')).toContainText('Motivo: "Rifiutata per sovrapposizione turni"');
  });

  test('5. Configurazione dei limiti globali e convalida regole d\'uso', async ({ page }) => {
    // Accedi come Admin ed entra nelle impostazioni
    await page.locator('.quick-login-btn', { hasText: 'Admin User' }).click();
    await page.click('.nav-item:has-text("Impostazioni")');

    // Modifica le impostazioni delle ferie e dei permessi studio
    await page.fill('input:below(:text("Ferie Annuali Dipendenti"))', '28');
    await page.fill('input:below(:text("Limite Massimo Permesso Studio"))', '3');
    await page.click('button:has-text("Salva Impostazioni")');
    await expect(page.locator('.toast.success').filter({ hasText: 'salvate' })).toBeVisible();

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
    await expect(page.locator('.toast.success').filter({ hasText: 'successo' })).toBeVisible();

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

  test('7. Compilazione e invio in approvazione di un rapportino', async ({ page }) => {
    // Esegui l'accesso rapido come "Mario Rossi"
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();

    // Naviga nella scheda Rapportino
    await page.click('.nav-item:has-text("Rapportino")');

    // Seleziona Agosto 2026
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');

    // Compila i dettagli del giorno 10 come Lavoro
    const row10 = page.locator('tr[data-date="2026-08-10"]');
    await row10.locator('select.timesheet-project-select').selectOption('Progetto Alpha');
    await row10.locator('input[type="number"]').fill('8');
    await row10.locator('input[placeholder="Note..."]').fill('Sviluppo backend');

    // Compila i dettagli del giorno 11 come Permesso
    const row11 = page.locator('tr[data-date="2026-08-11"]');
    await row11.locator('select.timesheet-permesso-select').selectOption('2');
    await row11.locator('input[placeholder="Note..."]').fill('Visita dal dentista');

    // Salva bozza
    await page.click('.timesheet-tab-container button:has-text("Salva Bozza")');
    await expect(page.locator('.toast.success').first()).toBeVisible();
    await expect(page.locator('.timesheet-tab-container .badge', { hasText: 'Bozza' })).toBeVisible();

    // Invia in approvazione
    page.once('dialog', dialog => dialog.accept());
    await page.click('.timesheet-tab-container button:has-text("Invia per Approvazione")');
    await expect(page.locator('.toast.success').first()).toBeVisible();
    await expect(page.locator('.timesheet-tab-container .badge', { hasText: 'Inviato' })).toBeVisible();
  });

  test('8. Approvazione del rapportino da parte del Team Leader Giuseppe Verdi', async ({ page }) => {
    // 1. Mario Rossi compila e invia il rapportino
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();
    await page.click('.nav-item:has-text("Rapportino")');

    // Seleziona Agosto 2026
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');

    // Compila i dettagli del giorno 10 come Lavoro
    const row10 = page.locator('tr[data-date="2026-08-10"]');
    await row10.locator('select.timesheet-project-select').selectOption('Progetto Alpha');
    await row10.locator('input[type="number"]').fill('8');
    
    page.once('dialog', dialog => dialog.accept());
    await page.click('.timesheet-tab-container button:has-text("Invia per Approvazione")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // 2. Logout e Login come Giuseppe Verdi (Team Leader)
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');
    await page.locator('.quick-login-btn', { hasText: 'Giuseppe Verdi' }).click();
    
    // Aspetta il caricamento delle notifiche dal server
    try {
      await page.waitForResponse(response => response.url().includes('/api/notifications/'), { timeout: 5000 });
    } catch (e) {}

    // Chiudi popup comunicazione bloccante per Giuseppe Verdi (potrebbero essercene molteplici)
    const modalComm8 = page.locator('.modal-backdrop:has-text("Comunicazione Importante")');
    for (let i = 0; i < 5; i++) {
      try {
        await expect(modalComm8).toBeVisible({ timeout: i === 0 ? 1500 : 500 });
      } catch (e) {
        break;
      }
      const currentText = await page.locator('.modal-backdrop .modal-body').textContent();
      await modalComm8.locator('button:has-text("Ho letto e confermo la lettura")').click();
      await expect(async () => {
        const isStillVisible = await modalComm8.isVisible();
        if (!isStillVisible) return true;
        const newText = await page.locator('.modal-backdrop .modal-body').textContent();
        if (newText !== currentText) return true;
        throw new Error("Modal text not updated yet");
      }).toPass({ timeout: 3000 });
    }

    // 3. Naviga su Approvazioni Rapportini
    await page.click('.nav-item:has-text("Approvazioni Rapportini")');
    const card = page.locator('.timesheet-approvals-tab-container .glass-card', { hasText: 'Mario Rossi' }).first();
    await expect(card).toBeVisible();

    // 4. Espandi dettagli e verifica
    await card.locator('button:has-text("Visualizza Dettagli")').click();
    const row = card.locator('.custom-table tbody tr', { hasText: '10/' }).first();
    await expect(row).toContainText('Progetto Alpha');
    await expect(row).toContainText('8');

    // 5. Approva
    page.once('dialog', dialog => dialog.accept());
    await card.locator('button:has-text("Approva")').click();
    await expect(page.locator('.toast.success').first()).toBeVisible();
  });

  test('9. Rifiuto del rapportino da parte del Team Leader con motivazione', async ({ page }) => {
    // 1. Mario Rossi compila e invia il rapportino
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();
    await page.click('.nav-item:has-text("Rapportino")');

    // Seleziona Agosto 2026
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');

    // Compila i dettagli del giorno 10 come Lavoro
    const row10 = page.locator('tr[data-date="2026-08-10"]');
    await row10.locator('select.timesheet-project-select').selectOption('Progetto Alpha');
    await row10.locator('input[type="number"]').fill('8');
    
    page.once('dialog', dialog => dialog.accept());
    await page.click('.timesheet-tab-container button:has-text("Invia per Approvazione")');
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // 2. Logout e Login come Giuseppe Verdi (Team Leader)
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');
    await page.locator('.quick-login-btn', { hasText: 'Giuseppe Verdi' }).click();

    // Aspetta il caricamento delle notifiche dal server
    try {
      await page.waitForResponse(response => response.url().includes('/api/notifications/'), { timeout: 5000 });
    } catch (e) {}

    // Chiudi popup comunicazione bloccante per Giuseppe Verdi (potrebbero essercene molteplici)
    const modalComm9 = page.locator('.modal-backdrop:has-text("Comunicazione Importante")');
    for (let i = 0; i < 5; i++) {
      try {
        await expect(modalComm9).toBeVisible({ timeout: i === 0 ? 1500 : 500 });
      } catch (e) {
        break;
      }
      const currentText = await page.locator('.modal-backdrop .modal-body').textContent();
      await modalComm9.locator('button:has-text("Ho letto e confermo la lettura")').click();
      await expect(async () => {
        const isStillVisible = await modalComm9.isVisible();
        if (!isStillVisible) return true;
        const newText = await page.locator('.modal-backdrop .modal-body').textContent();
        if (newText !== currentText) return true;
        throw new Error("Modal text not updated yet");
      }).toPass({ timeout: 3000 });
    }

    // 3. Naviga su Approvazioni Rapportini
    await page.click('.nav-item:has-text("Approvazioni Rapportini")');
    const card = page.locator('.timesheet-approvals-tab-container .glass-card', { hasText: 'Mario Rossi' }).first();
    await expect(card).toBeVisible();

    // 4. Rifiuta
    await card.locator('button:has-text("Rifiuta")').click();
    const modal = page.locator('.modal-window');
    await expect(modal).toBeVisible();
    await modal.locator('textarea').fill('Specificare meglio le note del giorno 10.');
    await modal.locator('button:has-text("Rifiuta Rapportino")').click();
    await expect(page.locator('.toast.success').first()).toBeVisible();

    // 5. Logout e Login come Mario Rossi per controllare il refusal e la nota
    await page.click('.profile-widget-btn');
    await page.click('.profile-dropdown-item.logout');
    await page.locator('.quick-login-btn', { hasText: 'Mario Rossi' }).click();
    await page.click('.nav-item:has-text("Rapportino")');

    // Seleziona Agosto 2026
    await page.selectOption('#timesheet-month-select', '8');
    await page.selectOption('#timesheet-year-select', '2026');

    // 6. Verifica lo stato e la motivazione
    await expect(page.locator('.timesheet-tab-container .badge', { hasText: 'Rifiutato' })).toBeVisible();
    await expect(page.locator('.timesheet-tab-container p')).toContainText('Specificare meglio le note del giorno 10.');
  });

});

