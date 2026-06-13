# language: it

Funzionalità: Configurazione Limiti Globali (Impostazioni)
  Come Admin o HR
  Voglio poter modificare i limiti annuali di ferie e la durata massima dei permessi studio
  In modo da adattare le regole di convalida alle esigenze aziendali

  Scenario: Modifica delle impostazioni globali da parte di HR
    Dato che effettuo il login come HR con email "hr@azienda.it"
    Quando accedo alla scheda "Impostazioni"
    E modifico il campo "Ferie Annuali Dipendenti" impostando "30"
    E modifico il campo "Limite Massimo Permesso Studio" impostando "3"
    E clicco su "Salva Impostazioni"
    Allora le impostazioni vengono salvate con successo
    E quando accedo come dipendente "mario.rossi@azienda.it"
    Allora il mio saldo totale ferie deve essere aggiornato a 30 giorni
    E se provo a richiedere un "Permesso Studio" di 4 giorni lavorativi
    Allora il sistema deve impedirmi di inviare la richiesta perché supera il nuovo limite di 3 giorni
