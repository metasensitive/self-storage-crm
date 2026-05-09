import { useEffect, type ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  children: ReactNode;
}

export function Drawer({ open, onClose, width, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-back" onClick={onClose} />
      <aside
        className="drawer"
        style={width ? { width } : undefined}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </aside>
    </>
  );
}

interface DrawerSectionProps {
  children: ReactNode;
  className?: string;
}

export function DrawerHead({ children, className }: DrawerSectionProps) {
  return (
    <div className={['drawer-head', className].filter(Boolean).join(' ')}>{children}</div>
  );
}

export function DrawerBody({ children, className }: DrawerSectionProps) {
  return (
    <div className={['drawer-body', className].filter(Boolean).join(' ')}>{children}</div>
  );
}

export function DrawerFoot({ children, className }: DrawerSectionProps) {
  return (
    <div className={['drawer-foot', className].filter(Boolean).join(' ')}>{children}</div>
  );
}
