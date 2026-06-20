# language: it

Funzionalità: Gestione Richieste di Assenza (Ferie, Malattia, Permesso Studio)
  Come dipendente dell'azienda
  Voglio poter pianificare e inviare richieste di ferie, malattia e permesso studio
  In modo che vengano elaborate dall'ufficio HR e dall'Admin

  Contesto:
    Dato che sono loggato come dipendente con email "mario.rossi@azienda.it"
    E il mio saldo ferie disponibile è di 26 giorni
    E il limite per il permesso studio è configurato a 5 giorni lavorativi

  Scenario: Invio richiesta di ferie singolo giorno
    Quando seleziono il giorno "2026-08-10" dal calendario
    E seleziono la tipologia di assenza "Ferie"
    E clicco sul pulsante "Invia Richiesta"
    Allora la richiesta deve essere inviata con successo
    E il mio saldo ferie pianificato deve aumentare di 1 giorno
    E lo stato della richiesta deve essere "In attesa di approvazione"

  Scenario: Invio richiesta di ferie multi-giorno (nei limiti del saldo)
    Quando seleziono l'intervallo dal "2026-08-10" al "2026-08-12" dal calendario (3 giorni lavorativi)
    E seleziono la tipologia di assenza "Ferie"
    E clicco sul pulsante "Invia Richiesta"
    Allora la richiesta deve essere inviata con successo
    E il mio saldo ferie pianificato deve aumentare di 3 giorni
    E lo stato della richiesta deve essere "In attesa di approvazione"

  Scenario: Tentativo di richiesta ferie superiore al saldo disponibile
    Quando seleziono l'intervallo dal "2026-08-01" al "2026-09-15" dal calendario (più di 26 giorni lavorativi)
    E seleziono la tipologia di assenza "Ferie"
    E clicco sul pulsante "Invia Richiesta"
    Allora il sistema mostra un messaggio di errore "Saldo ferie insufficiente"
    E il pulsante "Invia Richiesta" viene bloccato o la richiesta viene rifiutata dal client

  Scenario: Invio richiesta di malattia senza allegato (facoltativo)
    Quando seleziono il giorno "2026-08-10" dal calendario
    E seleziono la tipologia di assenza "Malattia"
    E clicco sul pulsante "Invia Richiesta" senza caricare alcun file
    Allora la richiesta deve essere inviata con successo
    E lo stato della richiesta deve essere "In attesa di approvazione"
    E il mio saldo ferie disponibile non deve essere intaccato (0 giorni scalati)

  Scenario: Invio richiesta di permesso studio entro il limite consentito
    Quando seleziono l'intervallo dal "2026-08-10" al "2026-08-14" dal calendario (5 giorni lavorativi)
    E seleziono la tipologia di assenza "Permesso Studio"
    E clicco sul pulsante "Invia Richiesta"
    Allora la richiesta deve essere inviata con successo
    E il mio saldo ferie disponibile non deve essere intaccato (0 giorni scalati)

  Scenario: Tentativo di richiesta permesso studio oltre il limite massimo
    Quando seleziono l'intervallo dal "2026-08-10" al "2026-08-18" dal calendario (6 giorni lavorativi)
    E seleziono la tipologia di assenza "Permesso Studio"
    E clicco sul pulsante "Invia Richiesta"
    Allora il sistema mostra un messaggio di errore "La richiesta di Permesso Studio supera il limite massimo consentito"
    E la richiesta non viene inviata
