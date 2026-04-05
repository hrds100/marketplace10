// Re-export bridge — real file is at src/features/wallet/WalletProvisioner.tsx
// This bridge exists so frozen zones (invest pages) can keep importing from @/components/WalletProvisioner
export { default, useWalletGate } from '@/features/wallet/WalletProvisioner';
