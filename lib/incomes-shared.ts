// Tipos y constantes compartidas (puede importarse desde server o client).
export type IncomeSource = 'aporte_ac' | 'aporte_jc' | 'otros';

export const SOURCE_LABEL: Record<IncomeSource, string> = {
  aporte_ac: 'Aporte AC',
  aporte_jc: 'Aporte JC',
  otros: 'Otros',
};

export const SOURCE_EMOJI: Record<IncomeSource, string> = {
  aporte_ac: '👩',
  aporte_jc: '👨',
  otros: '💵',
};
