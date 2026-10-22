<script setup lang="ts">
import { SelectContent, SelectPortal, SelectViewport } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: any }>()
</script>

<template>
  <SelectPortal>
    <SelectContent
      position="popper"
      :side-offset="4"
      :class="cn(
        'relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        props.class,
      )"
    >
      <SelectViewport class="p-1">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
