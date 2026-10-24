<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutGrid, LogOut, Package, Users, X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

defineProps<{ mobile?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const items = computed(() => [
  {
    label: '应用管理',
    to: '/admin',
    icon: LayoutGrid,
    active: route.name === 'admin-apps' || route.name === 'admin-app-detail',
  },
  ...(auth.isAdmin
    ? [{ label: '用户管理', to: '/admin/users', icon: Users, active: route.name === 'admin-users' }]
    : []),
])

function logout() {
  auth.logout()
  router.replace('/admin/login')
}
</script>

<template>
  <div class="flex h-full flex-col bg-card">
    <div class="flex h-16 items-center gap-2 border-b px-5">
      <router-link
        to="/admin"
        class="flex min-w-0 items-center gap-2 text-lg font-bold"
        @click="emit('close')"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package class="h-4 w-4" />
        </span>
        <span class="truncate">AppHub</span>
        <span class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          管理台
        </span>
      </router-link>
      <Button
        v-if="mobile"
        variant="ghost"
        size="icon"
        class="ml-auto h-8 w-8 lg:hidden"
        aria-label="关闭菜单"
        @click="emit('close')"
      >
        <X />
      </Button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3">
      <p class="px-2 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        工作区
      </p>
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :class="
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            item.active
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )
        "
        @click="emit('close')"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        {{ item.label }}
      </router-link>
    </nav>

    <div class="border-t p-3">
      <div class="flex items-center gap-2 rounded-lg px-2 py-2">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {{ auth.user?.username?.charAt(0).toUpperCase() || '?' }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ auth.user?.username }}</p>
          <Badge v-if="auth.role" variant="secondary" class="mt-0.5">{{ auth.role }}</Badge>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8" title="退出登录" @click="logout">
          <LogOut />
        </Button>
      </div>
    </div>
  </div>
</template>
