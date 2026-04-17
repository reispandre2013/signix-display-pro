import { useState, FormEvent, ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[80px]"
    />
  );
}

export function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function useModalForm<T>(initial: T) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<T>(initial);
  const reset = () => setValues(initial);
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));
  return { open, setOpen, values, set, reset };
}

export type FormSubmit = (e: FormEvent) => void;
