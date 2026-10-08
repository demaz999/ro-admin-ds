import { matchRanges, queryWords } from '~/components/ui/highlight-text'
import { OBJECT_TYPES } from './catalogs'

/**
 * Словарь текстовок повторяемого процесса — такт 88 (`docs/scheme-edit-review.md`, 4.6; решение 4 оркестратора 2026-10-08).
 * Аудит, «Фидбек заказчика»: «стена текстовок повторяемого процесса → предзаполнение и варианты на выбор, таргетные по типу
 * объекта». Чистые функции и справочник: DOM и реактивности модуль не знает.
 *
 * **Шесть текстов** экрана повторяемого процесса в мобильном приложении: название повтора, кнопка добавления, подсказка перед
 * повтором, вопрос «Есть ещё?», кнопка завершения, текст пустого списка.
 *
 * **Словарь** — наборы по типу объекта съёмки (`OBJECT_TYPES`): набор — шесть согласованных текстов одной сущности повтора
 * («Повреждение» — «Добавить повреждение» — «Есть ещё повреждения?»). Варианты поля — то же поле всех наборов типа. Примеры
 * ревью: «Транспорт» — «Повреждение», «Добавить повреждение»; «Недвижимость» — «Дефект», «Добавить дефект». Демо-словарь
 * стенда; справочник словаря как экран управления — вне страницы схемы (ревью, раздел 10).
 */

export type RepeatTextKey = 'item' | 'add' | 'before' | 'more' | 'finish' | 'empty'
export type RepeatTexts = Record<RepeatTextKey, string>
export const EMPTY_REPEAT_TEXTS: RepeatTexts = { item: '', add: '', before: '', more: '', finish: '', empty: '' }

/** Поля раздела «Тексты в приложении»: подпись, где текст видит исполнитель, заполнитель и подпись строки диффа. */
export const REPEAT_TEXT_FIELDS: { key: RepeatTextKey, label: string, hint: string, placeholder: string, diff: string }[] = [
  { key: 'item', label: 'Название повтора', hint: 'Список повторов — с номером: «Повреждение 1», «Повреждение 2»', placeholder: 'Например, Повреждение', diff: 'название повтора' },
  { key: 'add', label: 'Кнопка добавления', hint: 'Под списком повторов — начинает новый повтор', placeholder: 'Например, Добавить повреждение', diff: 'кнопка добавления' },
  { key: 'before', label: 'Подсказка перед повтором', hint: 'Перед первым шагом каждого повтора', placeholder: 'Например, Снимите повреждение целиком, затем крупно', diff: 'подсказка перед повтором' },
  { key: 'more', label: 'Вопрос «Есть ещё?»', hint: 'После повтора — ответ кнопкой добавления или завершения', placeholder: 'Например, Есть ещё повреждения?', diff: 'вопрос «Есть ещё?»' },
  { key: 'finish', label: 'Кнопка завершения', hint: 'Рядом с вопросом «Есть ещё?» — завершает процесс', placeholder: 'Например, Повреждений больше нет', diff: 'кнопка завершения' },
  { key: 'empty', label: 'Текст пустого списка', hint: 'Экран списка, пока повторов нет', placeholder: 'Например, Повреждения ещё не добавлены', diff: 'текст пустого списка' },
]

const set = (item: string, add: string, before: string, more: string, finish: string, empty: string): RepeatTexts => ({ item, add, before, more, finish, empty })

/** Наборы по типу объекта: первый — основной, его берёт «Заполнить по типу объекта», пока поля пусты. */
export const REPEAT_TEXT_SETS: Record<string, RepeatTexts[]> = {
  car: [
    set('Повреждение', 'Добавить повреждение', 'Снимите повреждение целиком, затем крупно', 'Есть ещё повреждения?', 'Повреждений больше нет', 'Повреждения ещё не добавлены'),
    set('Деталь кузова', 'Добавить деталь', 'Снимите деталь, затем повреждение крупно', 'Есть ещё повреждённые детали?', 'Все детали сняты', 'Детали ещё не добавлены'),
    set('Колесо', 'Добавить колесо', 'Снимите колесо, затем протектор крупно', 'Есть ещё колёса для съёмки?', 'Все колёса сняты', 'Колёса ещё не добавлены'),
  ],
  truck: [
    set('Повреждение', 'Добавить повреждение', 'Снимите повреждение с 2–3 метров и крупно', 'Есть ещё повреждения?', 'Повреждений больше нет', 'Повреждения ещё не добавлены'),
    set('Ось', 'Добавить ось', 'Снимите ось с колёсами с обеих сторон', 'Есть ещё оси?', 'Все оси сняты', 'Оси ещё не добавлены'),
    set('Секция кузова', 'Добавить секцию', 'Снимите секцию снаружи и изнутри', 'Есть ещё секции?', 'Все секции сняты', 'Секции ещё не добавлены'),
  ],
  moto: [
    set('Повреждение', 'Добавить повреждение', 'Снимите повреждение целиком, затем крупно', 'Есть ещё повреждения?', 'Повреждений больше нет', 'Повреждения ещё не добавлены'),
    set('Деталь', 'Добавить деталь', 'Снимите деталь с двух сторон', 'Есть ещё детали?', 'Все детали сняты', 'Детали ещё не добавлены'),
  ],
  house: [
    set('Дефект', 'Добавить дефект', 'Снимите дефект целиком, затем крупно', 'Есть ещё дефекты?', 'Дефектов больше нет', 'Дефекты ещё не добавлены'),
    set('Помещение', 'Добавить помещение', 'Снимите помещение от входа', 'Есть ещё помещения?', 'Все помещения сняты', 'Помещения ещё не добавлены'),
    set('Комната', 'Добавить комнату', 'Снимите комнату от двери и из угла', 'Есть ещё комнаты?', 'Все комнаты сняты', 'Комнаты ещё не добавлены'),
  ],
  document: [
    set('Документ', 'Добавить документ', 'Снимите документ целиком, без бликов', 'Есть ещё документы?', 'Документов больше нет', 'Документы ещё не добавлены'),
    set('Страница', 'Добавить страницу', 'Снимите страницу так, чтобы текст читался', 'Есть ещё страницы?', 'Все страницы сняты', 'Страницы ещё не добавлены'),
  ],
}

const uniq = (xs: readonly string[]) => [...new Set(xs)]
const setsOf = (objectType: string) => REPEAT_TEXT_SETS[objectType] ?? []
/** Тип объекта известен словарю: у него есть наборы. */
export const knownObjectType = (objectType: string) => setsOf(objectType).length > 0

/** Варианты поля: наборы типа объекта; без типа — все типы по порядку справочника, без повторов. */
export function textVariants(objectType: string, key: RepeatTextKey): string[] {
  if (knownObjectType(objectType)) return uniq(setsOf(objectType).map(s => s[key]))
  return uniq(OBJECT_TYPES.flatMap(t => setsOf(t.value).map(s => s[key])))
}

/**
 * До трёх вариантов чипами — 4.6: варианты типа объекта; без типа — основные наборы разных типов, по одному на сущность
 * повтора («Повреждение» у легкового, грузового и мототехники — один набор): у всех шести полей чипы одних и тех же наборов.
 */
export function variantChips(objectType: string, key: RepeatTextKey, n = 3): string[] {
  if (knownObjectType(objectType)) return textVariants(objectType, key).slice(0, n)
  const main = OBJECT_TYPES.map(t => setsOf(t.value)[0]).filter((s): s is RepeatTexts => !!s)
  const distinct = main.filter((s, k) => main.findIndex(x => x.item === s.item) === k)
  return uniq(distinct.map(s => s[key])).slice(0, n)
}

/** Слово запроса — начало слова в тексте, иначе середина слова от трёх знаков (сопоставление поиска страницы). */
const fits = (text: string, words: readonly string[]) => words.every(w => matchRanges(text, [w]).length > 0)

export interface VariantGroup { type: string, label: string, items: string[] }
/**
 * Полный список вариантов поля — поповер «Все варианты»: группы по типу объекта, тип процесса первым; запрос сужает варианты,
 * группа без совпадений пропадает.
 */
export function variantGroups(objectType: string, key: RepeatTextKey, query = ''): VariantGroup[] {
  const words = queryWords(query)
  const types = [...OBJECT_TYPES].sort((a, b) => Number(b.value === objectType) - Number(a.value === objectType))
  return types
    .map(t => ({ type: t.value, label: t.label, items: uniq(setsOf(t.value).map(s => s[key])).filter(v => fits(v, words)) }))
    .filter(g => g.items.length)
}

/**
 * «Заполнить по типу объекта» — 4.6: заполняются только пустые тексты, заданные не меняются. Набор — тот, к которому
 * относится уже заполненный текст («Деталь кузова» — кнопка «Добавить деталь»); пусто всё — основной набор типа.
 */
export function fillRepeatTexts(texts: RepeatTexts, objectType: string): { texts: RepeatTexts, filled: RepeatTextKey[] } {
  const sets = setsOf(objectType)
  if (!sets.length) return { texts: { ...texts }, filled: [] }
  const keys = REPEAT_TEXT_FIELDS.map(f => f.key)
  const k = keys.map(key => sets.findIndex(s => s[key] === texts[key]?.trim())).find(i => i >= 0) ?? 0
  const source = sets[Math.max(0, k)]!
  const out: RepeatTexts = { ...EMPTY_REPEAT_TEXTS, ...texts }
  const filled: RepeatTextKey[] = []
  for (const key of keys) {
    if (out[key].trim()) continue
    out[key] = source[key]
    filled.push(key)
  }
  return { texts: out, filled }
}
