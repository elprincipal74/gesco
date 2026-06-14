# language: it

Funzionalità: Gestione Rapportini (Timesheet)
  Come dipendente o team leader
  Voglio poter compilare, salvare e inviare il mio rapportino mensile
  E come validatore (Team Leader, HR o Admin) voglio poter verificare, approvare o rifiutare il rapportino dei dipendenti

  Contesto:
    Dato che il dipendente "Mario Rossi" è registrato nel sistema

  Scenario: Compilazione e invio in approvazione di un rapportino
    Dato che sono loggato come dipendente con email "mario.rossi@azienda.it"
    Quando accedo alla scheda "Rapportino"
    E seleziono il giorno "2026-08-10" dal calendario del rapportino
    E inserisco l'attività di tipo "Lavoro" sul progetto "Progetto Alpha" con ore 8 e nota "Sviluppo backend"
    E applico le modifiche al giorno
    E seleziono il giorno "2026-08-11" dal calendario del rapportino
    E inserisco l'attività di tipo "Permesso" sul progetto "" con ore 2 e nota "Visita dal dentista"
    E applico le modifiche al giorno
    E clicco sul pulsante "Salva Bozza" del rapportino
    Allora il rapportino viene salvato nello stato "Bozza"
    Quando clicco sul pulsante "Invia per Approvazione" del rapportino
    Allora lo stato del rapportino diventa "Inviato"

  Scenario: Approvazione del rapportino da parte del Team Leader Giuseppe Verdi
    Dato che il dipendente "Mario Rossi" ha inviato il rapportino per Agosto 2026
    E effettuo il login come Team Leader con email "giuseppe.verdi@azienda.it"
    Quando accedo alla scheda "Approvazioni Rapportini"
    Allora vedo il rapportino inviato di "Mario Rossi" per il mese "Agosto"
    Quando clicco su "Visualizza Dettagli" per il rapportino di "Mario Rossi"
    Allora vedo che ha lavorato 8 ore sul progetto "Progetto Alpha" il giorno "2026-08-10"
    Quando clicco su "Approva" per il rapportino di "Mario Rossi"
    Allora il rapportino di "Mario Rossi" cambia stato in "Approvato"

  Scenario: Rifiuto del rapportino da parte del Team Leader con motivazione
    Dato che il dipendente "Mario Rossi" ha inviato il rapportino per Agosto 2026
    E effettuo il login come Team Leader con email "giuseppe.verdi@azienda.it"
    Quando accedo alla scheda "Approvazioni Rapportini"
    E clicco su "Rifiuta" per il rapportino di "Mario Rossi"
    E nel modulo di rifiuto rapportino inserisco la motivazione "Si prega di specificare meglio le note di Lavoro del 10 Agosto."
    E confermo il rifiuto del rapportino
    Allora il rapportino di "Mario Rossi" cambia stato in "Rifiutato"
    Quando il dipendente "Mario Rossi" accede alla scheda "Rapportino" per il mese di Agosto 2026
    Allora vede lo stato "Rifiutato" con la motivazione "Si prega di specificare meglio le note di Lavoro del 10 Agosto."
