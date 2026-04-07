import type { SmsPipelineStage } from '../types';

export const mockStages: SmsPipelineStage[] = [
  { id: 'stg-1', name: 'New', colour: '#9CA3AF', position: 0 },
  { id: 'stg-2', name: 'Contacted', colour: '#6B7280', position: 1 },
  { id: 'stg-3', name: 'Waiting', colour: '#F59E0B', position: 2 },
  { id: 'stg-4', name: 'Hot Lead', colour: '#EF4444', position: 3 },
  { id: 'stg-5', name: 'Closed', colour: '#1E9A80', position: 4 },
];
