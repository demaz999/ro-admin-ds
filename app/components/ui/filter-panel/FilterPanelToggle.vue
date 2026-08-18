<script setup lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'

/**
 * Кнопка сворачивания панели фильтров. Подпись и глиф — с обоих кадров
 * макета: развёрнутая панель даёт «Свернуть фильтры» и шеврон вверх,
 * свёрнутая — «Развернуть фильтры» и шеврон вниз.
 */
const collapsed = defineModel<boolean>('collapsed', { default: false })
</script>

<template>
  <Button
    data-slot="filter-panel-toggle"
    variant="secondary"
    wide
    show-icon
    :aria-expanded="!collapsed"
    @click="collapsed = !collapsed"
  >
    <template #icon>
      <Icon :name="collapsed ? 'expand-circle-down' : 'expand-circle-up'" :size="24" />
    </template>
    {{ collapsed ? 'Развернуть фильтры' : 'Свернуть фильтры' }}
  </Button>
</template>
