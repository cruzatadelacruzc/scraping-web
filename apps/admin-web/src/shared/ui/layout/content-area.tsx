import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ContentArea({ children }: Props): JSX.Element {
  return <main className="flex-1 overflow-auto p-md">{children}</main>;
}
