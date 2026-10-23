<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound, LoaderCircle, Package } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword } from '@/api'
import { errorMessage, passwordOk } from '@/lib/account'
import { cn } from '@/lib/utils'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

withDefaults(defineProps<{ maxWidthClass?: string }>(), {
  maxWidthClass: 'max-w-5xl',
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { toast } = useToast()

const pwdOpen = ref(false)
const saving = ref(false)
const pwdError = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

function resetForm() {
  pwdError.value = ''
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

function onPwdOpen(open: boolean) {
  pwdOpen.value = open
  if (!open) resetForm()
}

async function submitPassword() {
  pwdError.value = ''
  if (!oldPassword.value || !newPassword.value) {
    pwdError.value = '请填写原密码和新密码'
    return
  }
  if (!passwordOk(newPassword.value)) {
    pwdError.value = '新密码需为 6-20 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  saving.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)
    pwdOpen.value = false
    resetForm()
    toast({ title: '密码已更新' })
  } catch (e) {
    pwdError.value = errorMessage(e, '修改失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.logout()
  router.replace('/login')
}

function navClass(active: boolean) {
  return cn(
    'rounded-md px-2 py-1 text-sm hover:bg-accent',
    active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
  )
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
    <div :class="cn('mx-auto flex h-14 items-center justify-between gap-3 px-4', maxWidthClass)">
      <div class="flex min-w-0 items-center gap-3">
        <slot name="leading">
          <router-link to="/" class="flex shrink-0 items-center gap-2 text-lg font-bold">
            <Package class="h-5 w-5 text-primary" />
            AppHub
          </router-link>
          <nav class="flex items-center gap-1">
            <router-link to="/" :class="navClass(route.name === 'apps')">应用</router-link>
            <router-link v-if="auth.isAdmin" to="/users" :class="navClass(route.name === 'users')">
              用户
            </router-link>
          </nav>
        </slot>
      </div>
      <div class="flex shrink-0 items-center gap-1 text-sm">
        <span class="hidden max-w-28 truncate text-muted-foreground sm:inline">
          {{ auth.user?.username }}
        </span>
        <Badge v-if="auth.role" variant="secondary">{{ auth.role }}</Badge>
        <Button variant="ghost" size="sm" @click="onPwdOpen(true)">
          <KeyRound />
          <span class="hidden sm:inline">修改密码</span>
        </Button>
        <Button variant="ghost" size="sm" @click="logout">退出</Button>
      </div>
    </div>

    <Dialog :open="pwdOpen" @update:open="onPwdOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>新密码 6-20 位。修改后当前登录仍然有效。</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitPassword">
          <div class="space-y-2">
            <Label for="old-password">原密码</Label>
            <Input
              id="old-password"
              v-model="oldPassword"
              type="password"
              autocomplete="current-password"
            />
          </div>
          <div class="space-y-2">
            <Label for="new-password">新密码</Label>
            <Input
              id="new-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              placeholder="6-20 位"
            />
          </div>
          <div class="space-y-2">
            <Label for="confirm-new-password">确认新密码</Label>
            <Input
              id="confirm-new-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <p v-if="pwdError" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ pwdError }}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" @click="onPwdOpen(false)">取消</Button>
            <Button type="submit" :disabled="saving">
              <LoaderCircle v-if="saving" class="animate-spin" />
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </header>
</template>
