import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/**
 * Кнопка кита.
 *
 * В ките 1 кнопка разложена на отдельные компонент-сеты; здесь это один
 * компонент с пропом variant — соответствие в docs/tokens.md, раздел 7.
 *
 * Состояния берутся из токенов-расширений (--primary-hover и т.п.), а не
 * через прозрачность: в ките они нарисованы руками, и стоковый приём shadcn
 * дал бы другой цвет. См. docs/tokens.md, ловушка 2.
 *
 * Геометрия из кита: высота 44 (size=default) и 32 (size=sm), радиус 8,
 * горизонтальный паддинг 10, текст 15/20 Bold.
 */
export const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-clip-padding text-sm font-bold transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-3 aria-invalid:border-destructive aria-invalid:ring-destructive aria-invalid:ring-3 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:bg-primary-disabled',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-hover disabled:bg-secondary-disabled disabled:text-foreground-secondary-disabled',
        outline: 'border-border bg-background text-primary hover:bg-secondary hover:text-primary-hover active:bg-secondary-hover disabled:border-stroke-neutral disabled:text-foreground-disabled',
        ghost: 'text-primary hover:bg-secondary hover:text-primary-hover active:text-primary-pressed disabled:text-foreground-disabled',
        destructive: 'bg-destructive text-primary-foreground hover:bg-destructive-hover active:bg-destructive-pressed disabled:bg-destructive-disabled',
        link: 'text-primary underline-offset-4 hover:text-primary-hover hover:underline disabled:text-foreground-disabled',
      },
      size: {
        default: 'h-11 gap-1 px-2.5',
        sm: 'h-8 gap-1 px-2.5',
        icon: 'size-11',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
