export const LABEL_COLORS = [
  { key: 'slate',  label: 'Cinza',    bg: 'bg-slate-500/15',  text: 'text-slate-700',  dot: 'bg-slate-500',  dark_text: 'dark:text-slate-300' },
  { key: 'red',    label: 'Vermelho', bg: 'bg-red-500/15',    text: 'text-red-700',    dot: 'bg-red-500',    dark_text: 'dark:text-red-300' },
  { key: 'orange', label: 'Laranja',  bg: 'bg-orange-500/15', text: 'text-orange-700', dot: 'bg-orange-500', dark_text: 'dark:text-orange-300' },
  { key: 'amber',  label: 'Amarelo',  bg: 'bg-amber-500/15',  text: 'text-amber-700',  dot: 'bg-amber-500',  dark_text: 'dark:text-amber-300' },
  { key: 'green',  label: 'Verde',    bg: 'bg-green-500/15',  text: 'text-green-700',  dot: 'bg-green-500',  dark_text: 'dark:text-green-300' },
  { key: 'teal',   label: 'Teal',     bg: 'bg-teal-500/15',   text: 'text-teal-700',   dot: 'bg-teal-500',   dark_text: 'dark:text-teal-300' },
  { key: 'blue',   label: 'Azul',     bg: 'bg-blue-500/15',   text: 'text-blue-700',   dot: 'bg-blue-500',   dark_text: 'dark:text-blue-300' },
  { key: 'purple', label: 'Roxo',     bg: 'bg-purple-500/15', text: 'text-purple-700', dot: 'bg-purple-500', dark_text: 'dark:text-purple-300' },
  { key: 'pink',   label: 'Rosa',     bg: 'bg-pink-500/15',   text: 'text-pink-700',   dot: 'bg-pink-500',   dark_text: 'dark:text-pink-300' },
  { key: 'indigo', label: 'Indigo',   bg: 'bg-indigo-500/15', text: 'text-indigo-700', dot: 'bg-indigo-500', dark_text: 'dark:text-indigo-300' },
] as const

export type LabelColorKey = (typeof LABEL_COLORS)[number]['key']

export function getLabelColor(key: string) {
  return LABEL_COLORS.find((color) => color.key === key) ?? LABEL_COLORS[0]
}
