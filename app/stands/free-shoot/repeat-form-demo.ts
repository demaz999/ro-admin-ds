/**
 * Демо-данные стенда `/free-shoot/states`, раздел «Field left · FieldSet — окно формы повтора» — такт 36.
 * Форма этапа «Единица оборудования» прототипа v17 (`STAGES.eq.form`), значения — повтор `o2` набора
 * «Частично проверен». Оснастка приёмки, не продукт.
 */
export interface RfDef { k: string, l: string, req?: boolean, opts?: string[], dep?: { k: string, v: string }, grp?: string }

export const RF_EQ: RfDef[] = [
  { k: 'mark', l: 'Наименование, марка, модель', req: true, grp: 'Характеристики оборудования' },
  { k: 'sn', l: 'Заводской / серийный номер' },
  { k: 'inv', l: 'Инвентарный номер' },
  { k: 'shop', l: 'Цеховой номер' },
  { k: 'year', l: 'Год выпуска' },
  { k: 'bld', l: 'Здание / цех' },
  { k: 'cond', l: 'Состояние', opts: ['Рабочее', 'Нерабочее'], grp: 'Состояние и эксплуатация' },
  { k: 'mount', l: 'Монтаж', opts: ['Установлено', 'Не установлено', 'Не требует установки'] },
  { k: 'use', l: 'Эксплуатация', opts: ['Эксплуатируется', 'Не эксплуатируется', 'Консервация'] },
  { k: 'idle', l: 'Причины простоя', dep: { k: 'use', v: 'Не эксплуатируется' } },
  { k: 'def', l: 'Дефекты', opts: ['Не выявлены', 'Выявлены'] },
  { k: 'defdesc', l: 'Выявленные дефекты', dep: { k: 'def', v: 'Выявлены' } },
  { k: 'comment', l: 'Комментарий', grp: 'Дополнительно' },
]

export const RF_VALUES: Record<string, string> = {
  mark: 'Пропиточная линия POLYPRISE', sn: '', inv: '10798', shop: '', year: '', bld: 'ЦЕХ-6',
  cond: 'Рабочее', mount: 'Установлено', use: 'Эксплуатируется', idle: '', def: 'Не выявлены', defdesc: '', comment: '',
}

/** Пустое значение выбора — пункт «—» прототипа (`openObjForm`). */
export const rfItems = (opts: string[]) => ['—', ...opts].map(x => ({ value: x, label: x }))

/** Группы как у прототипа: `grp` стоит у первого поля группы, следующие поля идут в неё же. */
export function rfGroups(defs: RfDef[]) {
  const out: { title: string, fields: RfDef[] }[] = []
  for (const f of defs) {
    const last = out[out.length - 1]
    if (!last || (f.grp && f.grp !== last.title)) out.push({ title: f.grp ?? '', fields: [f] })
    else last.fields.push(f)
  }
  return out
}
export const RF_GROUPS = rfGroups(RF_EQ)

export const REPEAT_FORM_WINDOW_EXAMPLE = `<!-- окно формы повтора, §14.3–14.6: открывают оба «Изменить» RepeatForm — @edit="(group) => openForm(repeat.id, group)" -->
<ModalCard v-model:open="open">
  <ModalCardContent>                                  <!-- center md 600 -->
    <ModalCardHeader :title="\`Форма · \${stage.title}\`" subtitle="Динамическая форма повторяемого этапа" />
    <ModalCardBody>
      <FieldSet v-for="g in groups" :key="g.title" :legend="g.title" :autofocus="g.title === openedGroup">
        <template v-for="f in g.fields" :key="f.k">
          <!-- зависимое поле (§14.4): видимость считает страница по dep из данных этапа -->
          <Field v-if="!f.dep || draft[f.dep.k] === f.dep.v" orientation="left" label-width="form"
                 :label="f.l" :required="f.req" :invalid="errors.has(f.k) && !draft[f.k]">
            <Select v-if="f.opts" v-model="draft[f.k]" :items="['—', ...f.opts].map(x => ({ value: x, label: x }))" :show-icon="false" placeholder="" />
            <Input v-else v-model="draft[f.k]" :invalid="errors.has(f.k) && !draft[f.k]" :show-icon="false" placeholder="" />
          </Field>
        </template>
      </FieldSet>
    </ModalCardBody>
    <ModalCardFooter>
      <Button variant="secondary" @click="open = false">Отмена</Button>
      <Button @click="save()">Сохранить</Button>   <!-- пустые обязательные: errors и Toast «Заполните: …» (§18 form.required), окно открыто -->
    </ModalCardFooter>
  </ModalCardContent>
</ModalCard>

<!-- строка формы вне окна -->
<Field orientation="left" label-width="form" label="Наименование, марка, модель" required>
  <Input v-model="mark" :show-icon="false" placeholder="" />
</Field>`
