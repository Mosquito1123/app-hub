<script setup lang="ts">
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <ToastProvider :duration="3500">
    <div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <ToastRoot
        v-for="t in toasts"
        :key="t.id"
        :open="true"
        :class="cn(
          'pointer-events-auto relative w-full rounded-lg border bg-background p-4 pr-10 shadow-lg',
          t.variant === 'destructive' && 'border-red-200 bg-red-50 text-red-900',
        )"
        @update:open="dismiss(t.id)"
      >
        <ToastTitle v-if="t.title" class="text-sm font-semibold">
          {{ t.title }}
        </ToastTitle>
        <ToastDescription v-if="t.description" class="mt-1 text-sm opacity-90">
          {{ t.description }}
        </ToastDescription>
        <ToastClose
          class="absolute right-2 top-2 rounded-sm p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X class="h-4 w-4" />
          <span class="sr-only">关闭</span>
        </ToastClose>
      </ToastRoot>
    </div>
  </ToastProvider>
</template>
