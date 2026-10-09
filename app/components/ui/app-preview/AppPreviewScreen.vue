<script setup lang="ts">
import type { AppScreen, AppScreenPart } from '.'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppPreview from './AppPreview.vue'
import AppPreviewButton from './AppPreviewButton.vue'
import AppPreviewField from './AppPreviewField.vue'
import AppPreviewProgress from './AppPreviewProgress.vue'
import AppPreviewRow from './AppPreviewRow.vue'
import AppPreviewShot from './AppPreviewShot.vue'
import AppPreviewText from './AppPreviewText.vue'

/**
 * Экран приложения из данных: части `AppScreenPart` в рамке `AppPreview`. Один механизм на демо-осмотр, карту экранов,
 * поповер «?» и фрагмент в оверлее процесса — один источник правды (ревью 4.2). Разбор — `index.ts`.
 *
 * Пример:
 * `<AppPreviewScreen :screen="{ title: 'Осмотр КАСКО', parts }" :marked="['setting:refuse']" interactive @go="open" @enter="hover" @leave="hover = ''" />`
 */
const props = withDefaults(defineProps<{
  screen: AppScreen
  size?: 'md' | 'lg'
  scale?: number
  fragment?: boolean
  /** Корпус телефона; `false` — экран приложения без рамки (демо-осмотр на узком экране, такт 92). */
  frame?: boolean
  /** Источники обведённых частей: часть с `source` из списка обводится (поповер «?», наведение демо-осмотра). */
  marked?: readonly string[]
  /** Кнопки и строки с переходом нажимаются: событие `go` с экраном перехода. */
  interactive?: boolean
}>(), { size: 'lg', scale: 1, fragment: false, frame: true, marked: () => [], interactive: false })

const emit = defineEmits<{
  go: [to: string]
  /** Курсор на части с источником — демо-осмотр подсвечивает строку «Из чего собран экран». */
  enter: [source: string]
  leave: []
}>()

const body = computed(() => props.screen.parts.filter(p => !p.footer))
const footer = computed(() => props.screen.parts.filter(p => p.footer))
const lit = (p: AppScreenPart) => !!p.source && props.marked.includes(p.source)
const pressable = (p: AppScreenPart) => props.interactive && 'to' in p && !!p.to
function press(p: AppScreenPart) {
  if ('to' in p && p.to && props.interactive) emit('go', p.to)
}
function enter(p: AppScreenPart) {
  if (p.source) emit('enter', p.source)
}

/**
 * Обведённая часть на длинном экране — в видимой части тела: тело прокручивается так, чтобы часть встала целиком. Своя
 * прокрутка тела, без `scrollIntoView`: тот двигал бы и прокрутку страницы, и окно поповера.
 */
const root = ref<HTMLElement | null>(null)
async function reveal() {
  await nextTick()
  const el = root.value
  const scroller = el?.querySelector<HTMLElement>('[data-slot=app-preview-body]')
  const part = el?.querySelector<HTMLElement>('[data-slot=app-preview-body] [data-highlighted]')
  if (!scroller || !part) return
  const top = part.offsetTop - scroller.offsetTop
  if (top < scroller.scrollTop || top + part.offsetHeight > scroller.scrollTop + scroller.clientHeight) {
    scroller.scrollTop = Math.max(0, top - (scroller.clientHeight - part.offsetHeight) / 2)
  }
}
onMounted(reveal)
watch(() => [props.marked.join('|'), props.screen], reveal)
</script>

<template>
  <div ref="root" data-slot="app-preview-screen-root" class="contents">
    <AppPreview :title="props.screen.title" :size="props.size" :scale="props.scale" :fragment="props.fragment" :frame="props.frame">
      <template v-for="p in body" :key="p.id">
        <AppPreviewProgress
          v-if="p.kind === 'progress'"
          :total="p.total"
          :done="p.done"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          :class="p.tight ? '-mt-2' : ''"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        />
        <AppPreviewText
          v-else-if="p.kind === 'title' || p.kind === 'text' || p.kind === 'note'"
          :variant="p.kind === 'title' ? (p.size === 'lg' ? 'title' : 'heading') : p.kind === 'note' ? 'note' : (p.tone === 'default' ? 'body' : 'secondary')"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          :class="p.tight ? '-mt-2' : ''"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        >
          {{ p.text }}
        </AppPreviewText>
        <AppPreviewText
          v-else-if="p.kind === 'empty'"
          variant="empty"
          :title="p.title"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        >
          {{ p.text }}
        </AppPreviewText>
        <AppPreviewShot
          v-else-if="p.kind === 'shot'"
          :label="p.label"
          :caption="p.caption"
          :src="p.src"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        />
        <AppPreviewField
          v-else-if="p.kind === 'field' || p.kind === 'check'"
          :label="p.kind === 'check' ? p.text : p.label"
          :type="p.kind === 'check' ? 'checkbox' : p.type"
          :required="p.kind === 'field' && !!p.required"
          :placeholder="p.kind === 'field' ? p.placeholder : ''"
          :hint="p.kind === 'field' ? p.hint : 'none'"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        />
        <AppPreviewRow
          v-else-if="p.kind === 'row'"
          :title="p.title"
          :meta="p.meta"
          :icon="p.icon"
          :src="p.src"
          :done="p.done"
          :pressable="pressable(p)"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          :data-to="p.to"
          @press="press(p)"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        />
        <AppPreviewButton
          v-else-if="p.kind === 'button'"
          :variant="p.variant"
          :pressable="pressable(p)"
          :highlighted="lit(p)"
          :data-part="p.id"
          :data-source="p.source"
          :data-to="p.to"
          @press="press(p)"
          @mouseenter="enter(p)"
          @mouseleave="emit('leave')"
        >
          {{ p.text }}
        </AppPreviewButton>
      </template>
      <template v-if="footer.length" #footer>
        <template v-for="p in footer" :key="p.id">
          <AppPreviewButton
            v-if="p.kind === 'button'"
            :variant="p.variant"
            :pressable="pressable(p)"
            :highlighted="lit(p)"
            :data-part="p.id"
            :data-source="p.source"
            :data-to="p.to"
            @press="press(p)"
            @mouseenter="enter(p)"
            @mouseleave="emit('leave')"
          >
            {{ p.text }}
          </AppPreviewButton>
          <AppPreviewRow
            v-else-if="p.kind === 'row'"
            :title="p.title"
            :meta="p.meta"
            :icon="p.icon"
            :src="p.src"
            :done="p.done"
            :pressable="pressable(p)"
            :highlighted="lit(p)"
            :data-part="p.id"
            :data-source="p.source"
            :data-to="p.to"
            @press="press(p)"
            @mouseenter="enter(p)"
            @mouseleave="emit('leave')"
          />
          <AppPreviewText
            v-else-if="p.kind === 'text' || p.kind === 'note'"
            :variant="p.kind === 'note' ? 'note' : (p.tone === 'default' ? 'body' : 'secondary')"
            :highlighted="lit(p)"
            :data-part="p.id"
            :data-source="p.source"
            @mouseenter="enter(p)"
            @mouseleave="emit('leave')"
          >
            {{ p.text }}
          </AppPreviewText>
          <AppPreviewField
            v-else-if="p.kind === 'check'"
            :label="p.text"
            type="checkbox"
            :highlighted="lit(p)"
            :data-part="p.id"
            :data-source="p.source"
            @mouseenter="enter(p)"
            @mouseleave="emit('leave')"
          />
        </template>
      </template>
    </AppPreview>
  </div>
</template>
