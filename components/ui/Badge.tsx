import { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'mint' | 'sky' | 'peach' | 'lemon' | 'lilac' | 'bubble' | 'teal';
}

const tones: Record<NonNullable<Props['tone']>, string> = {
  mint: 'bg-mint',
  sky: 'bg-sky',
  peach: 'bg-peach',
  lemon: 'bg-lemon',
  lilac: 'bg-lilac',
  bubble: 'bg-bubble',
  teal: 'bg-teal',
};

export function Badge({ tone = 'sky', className = '', children, ...rest }: Props) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1 border-3 border-ink rounded-full px-3 py-0.5 text-sm font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
