# language: it

Funzionalità: Approvazioni e Rifiuti Richieste (Admin / HR)
  Come utente con privilegi elevati (Admin o HR)
  Voglio poter approvare o rifiutare le richieste di assenza dei dipendenti
  E voglio che il dipendente abbia evidenza dell'esito, di chi ha deciso e dell'eventuale motivazione

  Contesto:
    Dato che il dipendente "Mario Rossi" ha inviato una richiesta di ferie dal "2026-08-10" al "2026-08-11" (2 giorni)
    E lo stato della richiesta è "In attesa di approvazione"

  Scenario: Approvazione della richiesta da parte di un utente HR
    Dato che effettuo il login come HR con email "hr@azienda.it"
    Quando accedo alla scheda "Approvazioni"
    E clicco sul pulsante "Approva" per la richiesta di "Mario Rossi"
    Allora la richiesta cambia stato in "Approvata"
    E viene registrato che l'approvatore è "HR User (HR)"
    E quando il dipendente "Mario Rossi" controlla la sua area personale
    Allora vede lo stato "Approvata" con la dicitura "Approvata da: HR User (HR)"

  Scenario: Approvazione della richiesta da parte di un utente Admin
    Dato che effettuo il login come Admin con email "admin@azienda.it"
    Quando accedo alla scheda "Approvazioni"
    E clicco sul pulsante "Approva" per la richiesta di "Mario Rossi"
    Allora la richiesta cambia stato in "Approvata"
    E viene registrato che l'approvatore è "Admin User (Admin)"
    E quando il dipendente "Mario Rossi" controlla la sua area personale
    Allora vede lo stato "Approvata" con la dicitura "Approvata da: Admin User (Admin)"

  Scenario: Rifiuto della richiesta con inserimento nota obbligatoria
    Dato che effettuo il login come HR con email "hr@azienda.it"
    Quando accedo alla scheda "Approvazioni"
    E clicco sul pulsante "Rifiuta" per la richiesta di "Mario Rossi"
    E nel modulo inserisco la motivazione "Picco di lavoro in produzione, copertura insufficiente"
    E confermo il rifiuto
    Allora la richiesta cambia stato in "Rifiutata"
    E viene registrato che il decisore è "HR User (HR)"
    E quando il dipendente "Mario Rossi" controlla la sua area personale
    Allora vede lo stato "Rifiutata" con la dicitura "Rifiutata da: HR User (HR)"
    E vede la nota di rifiuto "Motivo: \"Picco di lavoro in produzione, copertura insufficiente\""
