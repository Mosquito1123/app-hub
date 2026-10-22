import { ref } from 'vue'

export interface ToastItem {
  id: number
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

const toasts = ref<ToastItem[]>([])
let seq = 0

export function useToast() {
  function toast(input: Omit<ToastItem, 'id'>) {
    const id = ++seq
    toasts.value.push({ id, ...input })
    window.setTimeout(() => dismiss(id), 3500)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, toast, dismiss }
}
