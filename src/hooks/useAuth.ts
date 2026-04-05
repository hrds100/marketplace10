// Re-export bridge — real file is at src/core/auth/useAuth.ts
// This bridge exists so frozen zones (invest, nfstay) can keep importing from @/hooks/useAuth
export { useAuth } from '@/core/auth/useAuth';
