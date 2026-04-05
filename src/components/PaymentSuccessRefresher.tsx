// Re-export bridge — real file is at src/features/payment/PaymentSuccessRefresher.tsx
// This bridge exists so DashboardLayout.tsx (locked) can keep importing from @/components/PaymentSuccessRefresher
export { default } from '@/features/payment/PaymentSuccessRefresher';
