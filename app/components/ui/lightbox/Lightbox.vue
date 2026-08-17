<script setup lang="ts">
import { computed } from 'vue'
import { DialogClose, DialogContent, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Badge } from '../badge'
import { ButtonArrow } from '../button-arrow'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'

/**
 * Полноэкранный просмотр фото и видео — композиция `LightBox` `8867:69956`.
 *
 * Собран на примитиве `Dialog` Reka напрямую, а не поверх нашего `DialogContent`:
 * поверхность у них общая, а внутреннее устройство разное — у окна шапка с
 * возвратом и колонка на 8 колонок, у лайтбокса три полосы во всю ширину.
 * Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  open?: boolean
  /** Номер текущего кадра, с единицы. */
  index?: number
  /** Всего кадров. Ноль — счётчик не рисуется. */
  total?: number
  /** Подпись под кадром. */
  caption?: string
  /**
   * Без портала и во весь родитель, а не во весь экран — то же, что у
   * `DialogContent`: нужно наложению на `/compare`, в продукте не используется.
   */
  inline?: boolean
}>(), {
  open: false,
  index: 1,
  total: 0,
  caption: '',
  inline: false,
})

const emits = defineEmits<{
  'update:open': [value: boolean]
  'update:index': [value: number]
}>()

/**
 * Стрелки на границах диапазона **гаснут, но остаются**.
 *
 * Две композиции отвечают на этот вопрос по-разному, и обе подписаны «1 из 25»:
 * у светлой `8867:69956` нарисованы обе стрелки, у тёмной `8887:63887` правая
 * не рисуется вовсе — `absoluteRenderBounds` равен `null` при видимом узле.
 * Прятать правую на первом кадре бессмысленно, то есть это расхождение самих
 * композиций, а не правило. Взята светлая — с неё снят эталон. Строка — в
 * `docs/atom-inconsistencies.md`.
 */
const hasPrev = computed(() => props.index > 1)
const hasNext = computed(() => props.index < props.total)

function go(step: number) {
  emits('update:index', props.index + step)
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emits('update:open', $event)">
    <DialogPortal :disabled="props.inline">
      <DialogContent
        data-slot="lightbox"
        :class="[
          'z-50 flex flex-col bg-dialog text-foreground outline-none',
          props.inline ? 'absolute inset-0' : 'fixed inset-0',
        ]"
      >
        <!--
          Верхняя полоса 56. Отступы асимметричны и так в композиции: счётчик
          отбит на 16 слева, крестик на 8 справа — 40-я кнопка центрируется в
          полосе, то есть (56−40)/2.
        -->
        <div data-slot="lightbox-bar" class="flex h-14 shrink-0 items-center gap-4 pr-2 pl-4">
          <Badge v-if="props.total" variant="inverse" size="md">
            {{ props.index }} из {{ props.total }}
          </Badge>

          <!-- Слот действий: в композиции это пустая розовая плашка «Slot» 861×40. -->
          <div class="flex min-w-0 flex-1 items-center justify-center">
            <slot name="actions" />
          </div>

          <DialogClose as-child>
            <IconButton variant="ghost" size="lg" label="Закрыть">
              <Icon name="close" :size="20" />
            </IconButton>
          </DialogClose>
        </div>

        <!--
          Кадр: боковой паддинг 48. Стрелки прижаты к краям окна и центрируются
          по этой области, а не по всему слою, — отсюда сдвиг центра на 4px
          вверх при высоте 640, замеренный в композиции.
        -->
        <div data-slot="lightbox-frame" class="relative flex min-h-0 flex-1 items-center justify-center px-12">
          <ButtonArrow
            variant="ghost"
            size="lg"
            direction="left"
            label="Предыдущий кадр"
            :disabled="!hasPrev"
            class="absolute top-1/2 left-0 -translate-y-1/2"
            @click="go(-1)"
          />

          <DialogTitle class="sr-only">
            {{ props.caption || 'Просмотр' }}
          </DialogTitle>

          <div class="flex size-full items-center justify-center overflow-hidden">
            <slot />
          </div>

          <ButtonArrow
            variant="ghost"
            size="lg"
            direction="right"
            label="Следующий кадр"
            :disabled="!hasNext"
            class="absolute top-1/2 right-0 -translate-y-1/2"
            @click="go(1)"
          />
        </div>

        <!-- Нижняя полоса 64: подпись 16/20, отступ сверху 20 — оба с композиции. -->
        <div
          v-if="props.caption"
          data-slot="lightbox-caption"
          class="flex h-16 shrink-0 items-start justify-center px-12 pt-5"
        >
          <span class="truncate text-base text-foreground">{{ props.caption }}</span>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
