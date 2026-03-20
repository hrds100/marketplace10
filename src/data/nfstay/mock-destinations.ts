export interface Destination {
  city: string;
  country: string;
  propertyCount: number;
  image: string;
}

export const mockDestinations: Destination[] = [
  { city: 'Dubai', country: 'UAE', propertyCount: 42, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop' },
  { city: 'Bali', country: 'Indonesia', propertyCount: 38, image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=500&fit=crop' },
  { city: 'London', country: 'UK', propertyCount: 56, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=500&fit=crop' },
  { city: 'Lisbon', country: 'Portugal', propertyCount: 29, image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=500&fit=crop' },
  { city: 'Algarve', country: 'Portugal', propertyCount: 34, image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=500&fit=crop' },
  { city: 'Barcelona', country: 'Spain', propertyCount: 47, image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=500&fit=crop' },
  { city: 'Amsterdam', country: 'Netherlands', propertyCount: 31, image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=500&fit=crop' },
  { city: 'Paris', country: 'France', propertyCount: 63, image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=500&fit=crop' },
  { city: 'New York', country: 'USA', propertyCount: 71, image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=500&fit=crop' },
  { city: 'Sydney', country: 'Australia', propertyCount: 25, image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=500&fit=crop' },
];
