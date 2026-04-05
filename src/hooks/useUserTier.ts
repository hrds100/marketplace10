// Re-export bridge — real file is at src/features/payment/useUserTier.ts
// This bridge exists so frozen zones (BookingSitePage) can keep importing from @/hooks/useUserTier
export { useUserTier } from '@/features/payment/useUserTier';
