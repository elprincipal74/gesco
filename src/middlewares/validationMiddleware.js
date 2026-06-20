// src/middlewares/validationMiddleware.js
const { z } = require('zod');

// Schema definitions
const schemas = {
  login: z.object({
    username: z.string().trim().min(1, "Username richiesto"),
    password: z.string().trim().min(1, "Password richiesta")
  }),
  
  profileUpdate: z.object({
    name: z.string().trim().min(1, "Nome richiesto"),
    email: z.string().email("Email non valida"),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    iban: z.string().trim().optional()
  }),
  
  requestCreate: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inizio non valida (AAAA-MM-GG)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data fine non valida (AAAA-MM-GG)"),
    type: z.enum(["Ferie", "Malattia", "Permesso Studio"]).default("Ferie"),
    attachmentName: z.string().optional().default(''),
    attachmentData: z.string().optional().default('')
  }),
  
  requestEdit: z.object({
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data fine non valida (AAAA-MM-GG)")
  }),
  
  rejectRequest: z.object({
    reason: z.string().trim().min(1, "La motivazione è obbligatoria per il rifiuto.")
  }),
  
  saveSettings: z.object({
    annualHolidayDays: z.coerce.number().int().positive("Deve essere un numero positivo"),
    maxStudyLeaveDays: z.coerce.number().int().positive("Deve essere un numero positivo")
  }),
  
  sendCommunication: z.object({
    message: z.string().trim().min(1, "Il messaggio non può essere vuoto.").max(500, "Il messaggio supera il limite di 500 caratteri.")
  }),

  saveTimesheet: z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    days: z.array(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida (AAAA-MM-GG)"),
      type: z.string(),
      projectName: z.string().trim().optional().default(''),
      hours: z.coerce.number().min(0).max(24).optional().default(8.0),
      notes: z.string().trim().max(250, "Le note non possono superare i 250 caratteri").optional().default('')
    })).refine(days => {
      for (const day of days) {
        if (day.type === 'Permesso' && (!day.hours || day.hours <= 0 || day.hours > 8)) {
          return false;
        }
      }
      return true;
    }, {
      message: "I campi ore tra 0.5 e 8 per Permesso non sono validi."
    })
  }),

  rejectTimesheet: z.object({
    reason: z.string().trim().min(1, "La motivazione è obbligatoria per il rifiuto del rapportino.")
  })
};

// Reusable express middleware generator
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: `Schema di validazione '${schemaName}' non trovato.` });
    }
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.errors || result.error.issues || [];
      const errorMsg = issues.map(err => err.message).join(', ');
      return res.status(400).json({ error: errorMsg });
    }
    
    // Assign parsed data back to req.body
    req.body = result.data;
    next();
  };
};

module.exports = {
  validate
};
