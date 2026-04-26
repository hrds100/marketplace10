-- Migration: Remove all Samcart-related columns
-- Samcart is not used; payments are GHL + n8n only.
-- Safe to re-run: uses IF EXISTS.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS samcart_cust_id;
