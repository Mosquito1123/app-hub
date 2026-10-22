<script setup lang="ts">
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string
  class?: any
  type?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  autocomplete?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <input
    :id="id"
    :type="type || 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :class="cn(
      'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
