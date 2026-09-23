<script setup lang="ts">
import { computed } from 'vue'
import { ButtonAction } from '../button-action'
import { cn } from '@/lib/utils'
import { REPEAT_FORM_COMPACT, type RepeatFormField } from '.'

/**
 * Компактная форма повтора — прототип v17 `formPreview`, спека §14.1–14.3. Такт 32.
 *
 * Свёрнута — первые 6 заполненных или обязательных полей парами «подпись — значение»;
 * развёрнута — все поля по группам, у каждой группы своё «Изменить». Окно редактирования
 * (§14.4) и подсказки из распознанного (§14.5) — вне компонента: события `edit` и `delete`.
 *
 * | часть | кит | прототип |
 * |---|---|---|
 * | подложка | `--accent`, линия `--border-soft`, радиус 4, паддинг 8/8 | `.fp` `#F7F9FB`, `#EEF2F7`, 4, 8/10/6 |
 * | подпись / значение | 13/16 `--muted-foreground` / 13/16 medium `--foreground`, колонки 36% и остаток | 12.5/17.5 `#8A9AAB` / 500 `#20303F`, `minmax(96px,36%) 1fr` |
 * | не заполнено | «не заполнено» medium `--destructive` | 600 `#D9534F`; роль — как строка ошибки поля кита |
 * | источник | «распознано» 10/12 `--muted-foreground`; «по умолчанию» — `--warning-strong` | `.fp-src` 10.5 `#8A9AAB` / `#B07A1E`; §14.2 |
 * | пояснение | «„по умолчанию“ — не с кадра, проверьте» 12/16 `--warning-strong` | `.fp-af` 11 `#8A5A0B` |
 * | заголовок группы | 12/16 medium `--muted-foreground`, строчными | `.fp-g` 10.5 700 прописными; прописных в ките нет |
 * | действия | `ButtonAction sm`: «Все поля (N)» / «Свернуть», «Изменить»; «Удалить» — `destructive` | `.lnk` 12 `#337AB7`, «Удалить» серым; удаление — роль разрушительного действия |
 */
const props = withDefaults(defineProps<{
  fields: RepeatFormField[]
  /** Развёрнута целиком, по группам (§14.3). */
  expanded?: boolean
  /** «Удалить» — только у повтора без проверенных шагов и не предложенного (§6.2). */
  deletable?: boolean
  class?: string
}>(), {
  expanded: false,
  deletable: false,
})

const emit = defineEmits<{
  /** «Все поля (N)» / «Свернуть». */
  toggle: []
  /** «Изменить»: без группы — форма целиком, с группой — сразу на ней (§14.3). */
  edit: [group?: string]
  delete: []
}>()

const compact = computed(() => props.fields.filter(f => f.value || f.required).slice(0, REPEAT_FORM_COMPACT))
const groups = computed(() => {
  const out: { title: string; fields: RepeatFormField[] }[] = []
  for (const f of props.fields) {
    const title = f.group ?? ''
    const last = out[out.length - 1]
    if (last && last.title === title) last.fields.push(f)
    else out.push({ title, fields: [f] })
  }
  return out
})
const hasDefaults = computed(() => props.fields.some(f => f.source === 'default'))
</script>

<template>
  <div data-slot="repeat-form" :class="cn('rounded-xs border border-border-soft bg-accent px-2 pt-2 pb-1.5', props.class)">
    <template v-if="!props.expanded">
      <div v-for="f in compact" :key="f.key" data-slot="repeat-form-row" class="grid grid-cols-[minmax(--spacing(24),36%)_1fr] gap-2 py-0.5 text-xs">
        <span class="text-muted-foreground">{{ f.label }}</span>
        <span class="min-w-0 truncate" :class="!f.value && f.required ? 'font-medium text-destructive' : 'font-medium text-foreground'">
          {{ f.value || (f.required ? 'не заполнено' : '—') }}<span
            v-if="f.source"
            class="ml-1.5 text-3xs font-normal"
            :class="f.source === 'default' ? 'text-warning-strong' : 'text-muted-foreground'"
          >{{ f.source === 'default' ? 'по умолчанию' : 'распознано' }}</span>
        </span>
      </div>
    </template>
    <template v-else>
      <template v-for="(g, k) in groups" :key="g.title || k">
        <div v-if="g.title" data-slot="repeat-form-group" class="flex items-center justify-between pt-2 pb-1 text-2xs font-medium text-muted-foreground first:pt-0">
          <span>{{ g.title }}</span>
          <ButtonAction size="sm" :show-icon="false" @click="emit('edit', g.title)">Изменить</ButtonAction>
        </div>
        <div v-for="f in g.fields" :key="f.key" data-slot="repeat-form-row" class="grid grid-cols-[minmax(--spacing(24),36%)_1fr] gap-2 py-0.5 text-xs">
          <span class="text-muted-foreground">{{ f.label }}</span>
          <span class="min-w-0" :class="!f.value && f.required ? 'font-medium text-destructive' : 'font-medium text-foreground'">
            {{ f.value || (f.required ? 'не заполнено' : '—') }}<span
              v-if="f.source"
              class="ml-1.5 text-3xs font-normal"
              :class="f.source === 'default' ? 'text-warning-strong' : 'text-muted-foreground'"
            >{{ f.source === 'default' ? 'по умолчанию' : 'распознано' }}</span>
          </span>
        </div>
      </template>
    </template>

    <div data-slot="repeat-form-foot" class="mt-1.5 flex items-center gap-3 border-t border-border-soft pt-1.5">
      <span class="min-w-0 flex-1 text-2xs text-warning-strong">
        <template v-if="hasDefaults">«по умолчанию» — не с кадра, проверьте</template>
      </span>
      <ButtonAction size="sm" :show-icon="false" @click="emit('toggle')">
        {{ props.expanded ? 'Свернуть' : `Все поля (${props.fields.length})` }}
      </ButtonAction>
      <ButtonAction size="sm" :show-icon="false" @click="emit('edit')">Изменить</ButtonAction>
      <ButtonAction v-if="props.deletable" size="sm" variant="destructive" :show-icon="false" @click="emit('delete')">Удалить</ButtonAction>
    </div>
  </div>
</template>
