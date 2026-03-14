import { z } from 'zod';

export const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    countryCode: z.string().min(1, 'Select a country code'),
    phone: z.string().min(4, 'Enter your WhatsApp number'),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (d) => {
      const full = d.countryCode + d.phone.replace(/[^0-9]/g, '');
      return /^\+[1-9]\d{7,14}$/.test(full);
    },
    { message: 'Enter a valid WhatsApp number (7-15 digits)', path: ['phone'] },
  );

export type SignupFormData = z.infer<typeof signupSchema>;

/** Password strength: 0 = weak, 1 = fair, 2 = good, 3 = strong */
export function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 0;
  if (score <= 2) return 1;
  if (score <= 3) return 2;
  return 3;
}

export const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'] as const;
export const strengthColors = ['#EF4444', '#F59E0B', '#F97316', '#00D084'] as const;
