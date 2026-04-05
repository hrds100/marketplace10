// Re-export bridge — real file is at src/features/deals/useFavourites.ts
// This bridge exists so App.tsx and other files can keep importing from @/hooks/useFavourites
export { FavouritesProvider, useFavourites } from '@/features/deals/useFavourites';
