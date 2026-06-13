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
      const errorMsg = result.error.errors.map(err => err.message).join(', ');
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
