<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoaderCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { toast } = useToast()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!username.value || !password.value) {
    toast({ title: '请输入用户名和密码', variant: 'destructive' })
    return
  }
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch {
    toast({ title: '登录失败', description: '用户名或密码错误', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">AppHub</CardTitle>
        <CardDescription>登录以管理你的应用</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="username">用户名</Label>
            <Input id="username" v-model="username" placeholder="admin" autocomplete="username" />
          </div>
          <div class="space-y-2">
            <Label for="password">密码</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            <LoaderCircle v-if="loading" class="animate-spin" />
            {{ loading ? '登录中…' : '登 录' }}
          </Button>
        </form>
        <p class="mt-4 text-center text-xs text-muted-foreground">默认账号：admin / admin123</p>
      </CardContent>
    </Card>
  </div>
</template>
