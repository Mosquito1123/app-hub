<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoaderCircle, Package } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAuthConfig } from '@/api'
import { USERNAME_RE, passwordOk } from '@/lib/account'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { toast } = useToast()

type Mode = 'login' | 'register'

const mode = ref<Mode>('login')
const registerEnabled = ref(true)
const username = ref('')
const password = ref('')
const confirmPwd = ref('')
const error = ref('')
const loading = ref(false)

const isRegister = computed(() => mode.value === 'register')
const submitLabel = computed(() => {
  if (mode.value === 'register') return loading.value ? '注册中…' : '注 册'
  return loading.value ? '登录中…' : '登 录'
})

onMounted(async () => {
  try {
    const cfg = await getAuthConfig()
    registerEnabled.value = cfg.registerEnabled
    if (!cfg.registerEnabled) mode.value = 'login'
  } catch {
    // 拉取失败按默认开放注册处理，真正提交时仍以后端为准
  }
})

function switchMode() {
  if (mode.value === 'login' && !registerEnabled.value) return
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
  password.value = ''
  confirmPwd.value = ''
}

function validate(): boolean {
  error.value = ''
  const name = username.value.trim()
  if (!name) {
    error.value = '请输入用户名'
    return false
  }
  if (!password.value) {
    error.value = '请输入密码'
    return false
  }
  if (isRegister.value) {
    if (!USERNAME_RE.test(name)) {
      error.value = '用户名需为 3-20 位字母、数字、下划线或中文'
      return false
    }
    if (!passwordOk(password.value)) {
      error.value = '密码需为 6-20 位'
      return false
    }
    if (password.value !== confirmPwd.value) {
      error.value = '两次输入的密码不一致'
      return false
    }
  }
  return true
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    if (isRegister.value) {
      await auth.register(username.value.trim(), password.value)
      toast({ title: '注册成功', description: '已自动登录' })
      router.replace('/')
    } else {
      await auth.login(username.value.trim(), password.value)
      const raw = route.query.redirect
      const redirect = typeof raw === 'string' ? raw : '/'
      router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
    }
  } catch (e: unknown) {
    error.value = mapError(e, isRegister.value)
  } finally {
    loading.value = false
  }
}

function mapError(e: unknown, register: boolean): string {
  const err = e as { response?: { status?: number; data?: { message?: unknown } } }
  const status = err?.response?.status
  const msg = err?.response?.data?.message
  const flat = Array.isArray(msg) ? msg.join('，') : typeof msg === 'string' ? msg : ''
  if (status === 409) return '用户名已存在，换一个试试'
  if (status === 403) {
    return register ? '注册已关闭，请联系管理员开通' : flat || '账号已被禁用，请联系管理员'
  }
  if (status === 401) return '用户名或密码错误'
  if (status === 400) return flat || '输入不合法，请检查后重试'
  return flat || (register ? '注册失败，请稍后重试' : '登录失败，请稍后重试')
}
</script>

<template>
  <div class="min-h-screen lg:grid lg:grid-cols-2">
    <aside class="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
      <div class="flex items-center gap-2 text-xl font-bold">
        <Package class="h-6 w-6" />
        AppHub
      </div>
      <div>
        <h1 class="text-3xl font-bold leading-snug">移动端应用内测分发平台</h1>
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
          上传构建包、生成分享链接，把内测安装包快速分发给测试用户。
        </p>
        <div class="mt-6 flex gap-2">
          <Badge class="border-transparent bg-white/15 text-white">Android</Badge>
          <Badge class="border-transparent bg-white/15 text-white">iOS</Badge>
          <Badge class="border-transparent bg-white/15 text-white">鸿蒙</Badge>
        </div>
      </div>
      <p class="text-xs text-primary-foreground/60">Powered by AppHub</p>
    </aside>

    <div class="flex min-h-screen flex-col items-center justify-center px-4 py-10 lg:min-h-0">
      <div class="mb-5 flex w-full max-w-sm items-center gap-2 text-lg font-bold lg:hidden">
        <Package class="h-5 w-5 shrink-0 text-primary" />
        AppHub
        <span class="min-w-0 truncate text-xs font-normal text-muted-foreground">
          移动端应用内测分发平台
        </span>
      </div>

      <Card class="w-full max-w-sm">
        <CardHeader class="text-center">
          <CardTitle class="text-2xl">{{ isRegister ? '创建账号' : '欢迎回来' }}</CardTitle>
          <CardDescription>
            {{ isRegister ? '注册后即可上传和分发应用' : '登录以管理你的应用' }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="space-y-2">
              <Label for="username">用户名</Label>
              <Input
                id="username"
                v-model="username"
                :placeholder="isRegister ? '如：dev_alice' : 'admin'"
                autocomplete="username"
              />
              <p v-if="isRegister" class="text-xs text-muted-foreground">
                3-20 位，支持字母、数字、下划线、中文
              </p>
            </div>
            <div class="space-y-2">
              <Label for="password">密码</Label>
              <Input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
              />
              <p v-if="isRegister" class="text-xs text-muted-foreground">6-20 位</p>
            </div>
            <div v-if="isRegister" class="space-y-2">
              <Label for="confirm-password">确认密码</Label>
              <Input
                id="confirm-password"
                v-model="confirmPwd"
                type="password"
                placeholder="再输入一次密码"
                autocomplete="new-password"
              />
            </div>

            <p v-if="error" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {{ error }}
            </p>

            <Button type="submit" class="w-full" :disabled="loading">
              <LoaderCircle v-if="loading" class="animate-spin" />
              {{ submitLabel }}
            </Button>
          </form>

          <p class="mt-4 text-center text-xs text-muted-foreground">
            <template v-if="isRegister">
              已有账号？
              <button type="button" class="font-medium text-primary hover:underline" @click="switchMode">
                去登录
              </button>
            </template>
            <template v-else-if="registerEnabled">
              还没有账号？
              <button type="button" class="font-medium text-primary hover:underline" @click="switchMode">
                去注册
              </button>
            </template>
          </p>
          <p v-if="!isRegister" class="mt-4 text-center text-xs text-muted-foreground">
            默认账号：admin / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
