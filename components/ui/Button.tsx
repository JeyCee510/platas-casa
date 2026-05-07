import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

const styles: Record<Variant, string> = {
  primary:   'bg-sky text-ink hover:translate-x-[1px] hover:translate-y-[1px]',
  secondary: 'bg-mint text-ink hover:translate-x-[1px] hover:translate-y-[1px]',
  danger:    'bg-peach text-ink hover:translate-x-[1px] hover:translate-y-[1px]',
  ghost:     'bg-white text-ink hover:bg-bg',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', full, className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={`inline-flex items-center justify-center gap-2 border-3 border-ink shadow-brutSm rounded-md px-4 py-2 font-bold transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
});
