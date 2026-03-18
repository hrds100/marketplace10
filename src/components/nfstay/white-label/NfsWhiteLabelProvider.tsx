import { type ReactNode } from 'react';
import { NfsWhiteLabelContext, useNfsWhiteLabelDetection } from '@/hooks/nfstay/use-nfs-white-label';

interface Props {
  children: ReactNode;
}

export default function NfsWhiteLabelProvider({ children }: Props) {
  const context = useNfsWhiteLabelDetection();
  return (
    <NfsWhiteLabelContext.Provider value={context}>
      {children}
    </NfsWhiteLabelContext.Provider>
  );
}
