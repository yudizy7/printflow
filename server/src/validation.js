import { z } from 'zod';
import { ORDER_STATUSES, PRIORITIES } from './db.js';

/** Texto opcional: string vazia/undefined vira null. */
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .nullish()
    .transform((v) => (v ? v : null));

const optionalEmail = z
  .union([z.literal(''), z.string().trim().toLowerCase().email('E-mail inválido')])
  .nullish()
  .transform((v) => (v ? v : null));

const optionalDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)')])
  .nullish()
  .transform((v) => (v ? v : null));

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  company: optionalText(120),
  email: optionalEmail,
  phone: optionalText(30),
  document: optionalText(20),
  city: optionalText(80),
  notes: optionalText(1000),
});

export const orderSchema = z.object({
  client_id: z.coerce.number().int().positive('Selecione um cliente'),
  title: z.string().trim().min(3, 'Título deve ter ao menos 3 caracteres').max(150),
  description: optionalText(2000),
  product_type: z.string().trim().min(2, 'Informe o tipo de produto').max(60),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser maior que zero').max(10_000_000),
  unit_price_cents: z.coerce.number().int().min(0, 'Preço não pode ser negativo').max(1_000_000_000),
  status: z.enum(ORDER_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  due_date: optionalDate,
});

export const moveSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  position: z.coerce.number().int().min(0),
});
