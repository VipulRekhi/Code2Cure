import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']).default('PATIENT'),
    patient: z
      .object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        phone: z.string().optional(),
        dateOfBirth: z.string().datetime().optional(),
        preferredLanguage: z.string().default('HI'),
      })
      .optional(),
    doctor: z
      .object({
        name: z.string().min(1, 'Name is required'),
        specialization: z.string().min(1, 'Specialization is required'),
      })
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});
