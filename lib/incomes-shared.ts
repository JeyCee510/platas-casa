// Tipos y constantes compartidas (puede importarse desde server o client).
export type IncomeSource = 'aporte_ac' | 'aporte_jc' | 'intereses' | 'otros';

export const SOURCE_LABEL: Record<IncomeSource, string> = {
  aporte_ac: 'Aporte AC',
  aporte_jc: 'Aporte JC',
  intereses: 'Intereses',
  otros: 'Otros',
};

export const SOURCE_EMOJI: Record<IncomeSource, string> = {
  aporte_ac: '👩',
  aporte_jc: '👨',
  intereses: '📈',
  otros: '💵',
};
