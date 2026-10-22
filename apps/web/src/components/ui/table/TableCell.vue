<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: any }>()
</script>

<template>
  <td :class="cn('p-2 align-middle', props.class)">
    <slot />
  </td>
</template>
