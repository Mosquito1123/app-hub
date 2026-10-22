<script setup lang="ts">
import { SelectTrigger } from 'reka-ui'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: any; placeholder?: string }>()
</script>

<template>
  <SelectTrigger
    :class="cn(
      'flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate',
      props.class,
    )"
  >
    <slot>{{ placeholder }}</slot>
    <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
  </SelectTrigger>
</template>
