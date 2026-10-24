<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { KeyRound, LoaderCircle, Menu } from 'lucide-vue-next'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
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
import { useToast } from '@/composables/useToast'

const route = useRoute()
const { toast } = useToast()

const title = computed(() => String(route.meta.title ?? '管理台'))
const mobileOpen = ref(false)

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
</script>

<template>
  <div class="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
    <aside class="sticky top-0 hidden h-screen border-r lg:block">
      <AdminSidebar />
    </aside>

    <!-- 移动端抽屉 -->
    <div v-if="mobileOpen" class="fixed inset-0 z-50 lg:hidden">
      <div class="absolute inset-0 bg-black/40" @click="mobileOpen = false" />
      <div class="absolute inset-y-0 left-0 w-64 border-r bg-card shadow-xl">
        <AdminSidebar mobile @close="mobileOpen = false" />
      </div>
    </div>

    <div class="flex min-h-screen min-w-0 flex-col">
      <header class="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          class="lg:hidden"
          aria-label="打开菜单"
          @click="mobileOpen = true"
        >
          <Menu />
        </Button>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base font-semibold">{{ title }}</h1>
        </div>
        <Button variant="ghost" size="sm" @click="onPwdOpen(true)">
          <KeyRound />
          <span class="hidden sm:inline">修改密码</span>
        </Button>
      </header>

      <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
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
  </div>
</template>
