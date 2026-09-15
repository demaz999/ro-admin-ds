import { onMounted, ref } from 'vue'

export interface DesignToken {
  /** Имя переменной вместе с двумя дефисами, например `--color-accent`. */
  name: string
  /** Значение, как оно объявлено в CSS. */
  raw: string
  /** Значение, разрешённое браузером: `var()` уже развёрнут. */
  resolved: string
}

/**
 * Считывает токены прямо из таблиц стилей документа, а не из захардкоженного списка.
 * Витрина за счёт этого не расходится с файлом токенов: добавили переменную в CSS —
 * она сама появилась на витрине.
 */
export function useDesignTokens(selector = ':root') {
  const tokens = ref<DesignToken[]>([])

  onMounted(() => {
    const found = new Map<string, string>()

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sheet.cssRules
      }
      catch {
        // Стороннюю таблицу стилей читать нельзя — пропускаем.
        continue
      }

      collectFromRules(rules, selector, found)
    }

    const computed = getComputedStyle(document.documentElement)

    tokens.value = Array.from(found, ([name, raw]) => ({
      name,
      raw,
      resolved: computed.getPropertyValue(name).trim() || raw,
    })).sort((a, b) => a.name.localeCompare(b.name))
  })

  return { tokens }
}

/**
 * Сравнивается каждый селектор из списка, а не строка целиком.
 *
 * Ловушка: блок темы объявлен как `:root, [data-theme="rososmotr"]`, а `@theme` Tailwind
 * выпускает `:root, :host`. Строгое `selectorText === ':root'` не находило ни того, ни
 * другого — на витрине оставались 21 токен палитры из 120 цветовых, а «Радиусы» и
 * «Типографика» показывали «Токенов нет».
 */
function matchesSelector(selectorText: string, selector: string) {
  return selectorText.split(',').some(part => part.trim() === selector)
}

/**
 * Все кастомные свойства корня и блоков тем: имя → { селектор: объявленное значение }.
 * Нужно, чтобы отличить значение, объявленное темой, от унаследованного с корня.
 */
export function collectThemeDeclarations(): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>()

  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const parts = rule.selectorText.split(',').map(s => s.trim())
          .filter(s => s === ':root' || s.startsWith('[data-theme='))
        if (!parts.length) continue
        for (const prop of Array.from(rule.style)) {
          if (!prop.startsWith('--')) continue
          const entry = out.get(prop) ?? {}
          for (const part of parts) entry[part] = rule.style.getPropertyValue(prop).trim()
          out.set(prop, entry)
        }
      }
      else if ('cssRules' in rule) {
        walk((rule as CSSGroupingRule).cssRules)
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules)
    }
    catch {
      // Стороннюю таблицу стилей читать нельзя — пропускаем.
    }
  }

  return out
}

function collectFromRules(rules: CSSRuleList, selector: string, out: Map<string, string>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && matchesSelector(rule.selectorText, selector)) {
      const style = rule.style
      for (const prop of Array.from(style)) {
        if (prop.startsWith('--')) {
          out.set(prop, style.getPropertyValue(prop).trim())
        }
      }
    }
    // Правила внутри @media, @supports и @layer лежат вложенно.
    else if ('cssRules' in rule) {
      collectFromRules((rule as CSSGroupingRule).cssRules, selector, out)
    }
  }
}

/** Грубая эвристика: по значению понять, что это за токен, чтобы выбрать способ показа. */
export function tokenKind(token: DesignToken): 'color' | 'length' | 'font' | 'other' {
  const v = token.resolved

  if (/^(#|rgb|hsl|oklch|color\()/i.test(v)) return 'color'
  if (/^-?[\d.]+(px|rem|em|%)$/.test(v)) return 'length'
  if (token.name.startsWith('--font') || /serif|sans|mono/i.test(v)) return 'font'

  return 'other'
}
