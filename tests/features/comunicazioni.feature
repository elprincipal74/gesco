# language: it

Funzionalità: Comunicazioni di Servizio con Popup Bloccante
  Come Admin o HR
  Voglio poter inviare comunicazioni di servizio a tutti i dipendenti
  E verificare chi ha confermato la lettura del messaggio
  
  Come Dipendente
  Voglio visualizzare le comunicazioni importanti come popup bloccante
  E confermarne la lettura per sbloccare l'applicazione

  Scenario: Invio di una comunicazione da parte di Admin e conferma di lettura da parte del dipendente
    Dato che effettuo il login come Admin con email "admin@azienda.it"
    Quando accedo alla scheda "Comunicazioni"
    E inserisco nel messaggio "Nuovo orario di lavoro estivo in vigore da lunedì"
    E clicco sul pulsante "Invia Comunicazione a Tutti"
    Allora la comunicazione viene inviata con successo
    E quando accedo come dipendente "mario.rossi@azienda.it"
    Allora vedo un popup bloccante con il messaggio "Nuovo orario di lavoro estivo in vigore da lunedì"
    Quando clicco sul pulsante "Ho letto e confermo la lettura"
    Allora il popup scompare e posso navigare nell'applicazione
    E quando accedo come dipendente "admin@azienda.it"
    E accedo alla scheda "Comunicazioni"
    E clicco su "Vedi Stato Letture" della comunicazione inviata
    Allora vedo che "Mario Rossi" ha lo stato di lettura "Letto"
