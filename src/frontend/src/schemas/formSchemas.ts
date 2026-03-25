import { z } from 'zod';

// ─── Partner ──────────────────────────────────────────────────────────
export const partnerFormSchema = z.object({
  partner_name: z.string().min(1, 'Partner name is required'),
  email: z.string().email('Enter a valid email address'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string(),
  primary_partner_id: z.string(),
  linkedin_url: z.string(),
}).refine(
  (data) => !data.end_date || !data.start_date || data.end_date >= data.start_date,
  { message: 'End date cannot be less than Start date', path: ['end_date'] }
);
export type PartnerFormData = z.infer<typeof partnerFormSchema>;

// ─── Investee ─────────────────────────────────────────────────────────
export const investeeFormSchema = z.object({
  investee_name: z.string().min(1, 'Investee name is required'),
  email: z.string(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string(),
}).refine(
  (data) => !data.end_date || !data.start_date || data.end_date >= data.start_date,
  { message: 'End date cannot be less than Start date', path: ['end_date'] }
);
export type InvesteeFormData = z.infer<typeof investeeFormSchema>;

// ─── Group ────────────────────────────────────────────────────────────
export const groupFormSchema = z.object({
  group_name: z.string().min(1, 'Group name is required'),
  group_type_id: z.string(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string(),
  investee_id: z.string(),
}).refine(
  (data) => !data.end_date || !data.start_date || data.end_date >= data.start_date,
  { message: 'End date must be on or after start date', path: ['end_date'] }
);
export type GroupFormData = z.infer<typeof groupFormSchema>;

// ─── Lookup Type ───────────────────────────────────────────────────────────
export const lookupTypeFormSchema = z.object({
  type_name: z.string().trim().min(1, 'Type name is required').max(150, 'Type name is too long'),
});
export type LookupTypeFormData = z.infer<typeof lookupTypeFormSchema>;

// ─── Feedback ──────────────────────────────────────────────────────────────
export const feedbackFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  report: z.string().trim().min(1, 'Feedback is required').max(5000, 'Feedback is too long'),
});
export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;
