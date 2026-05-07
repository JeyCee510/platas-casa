import { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: 'white' | 'mint' | 'sky' | 'peach' | 'lemon' | 'lilac' | 'bubble' | 'teal';
}

const tones: Record<NonNullable<Props['tone']>, string> = {
  white: 'bg-white',
  mint: 'bg-mint',
  sky: 'bg-sky',
  peach: 'bg-peach',
  lemon: 'bg-lemon',
  lilac: 'bg-lilac',
  bubble: 'bg-bubble',
  teal: 'bg-teal',
};

export function Card({ tone = 'white', className = '', children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`border-3 border-ink rounded-md shadow-brut ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
