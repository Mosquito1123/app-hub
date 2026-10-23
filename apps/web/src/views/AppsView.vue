<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Download, LoaderCircle, Package, Plus } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createApp, fetchApps } from '@/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/composables/useToast'
import type { AppItem, Platform } from '@/types'

const router = useRouter()
const { toast } = useToast()

const apps = ref<AppItem[]>([])
const loading = ref(true)
const query = ref('')
const debouncedQ = ref('')
const platform = ref<Platform | ''>('')

const platformOptions = [
  { value: '', label: '全部' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'harmony', label: '鸿蒙' },
] as const

let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debouncedQ.value = v.trim()), 300)
})
watch([debouncedQ, platform], load)
onMounted(load)

async function load() {
  loading.value = true
  try {
    apps.value = await fetchApps({
      q: debouncedQ.value || undefined,
      platform: platform.value || undefined,
    })
  } catch {
    toast({ title: '加载应用列表失败', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

// 新建应用
const createOpen = ref(false)
const creating = ref(false)
const form = ref({ name: '', bundleId: '', description: '' })

async function submitCreate() {
  const name = form.value.name.trim()
  const bundleId = form.value.bundleId.trim()
  if (!name || !bundleId) {
    toast({ title: '请填写应用名称和 Bundle ID', variant: 'destructive' })
    return
  }
  creating.value = true
  try {
    const app = await createApp({
      name,
      bundleId,
      description: form.value.description.trim() || undefined,
    })
    createOpen.value = false
    form.value = { name: '', bundleId: '', description: '' }
    toast({ title: '创建成功' })
    router.push(`/apps/${app.id}`)
  } catch (e: any) {
    const msg = e?.response?.data?.message
    toast({
      title: '创建失败',
      description: Array.isArray(msg) ? msg.join('，') : msg,
      variant: 'destructive',
    })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input v-model="query" placeholder="搜索应用名称或 Bundle ID" class="sm:max-w-64" />
        <div class="flex flex-wrap gap-1">
          <Button
            v-for="p in platformOptions"
            :key="p.value"
            size="sm"
            :variant="platform === p.value ? 'secondary' : 'ghost'"
            @click="platform = p.value"
          >
            {{ p.label }}
          </Button>
        </div>
        <Dialog v-model:open="createOpen">
          <DialogTrigger as-child>
            <Button class="sm:ml-auto">
              <Plus />
              新建应用
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建应用</DialogTitle>
              <DialogDescription>创建一个新的应用条目，之后可上传构建包。</DialogDescription>
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="submitCreate">
              <div class="space-y-2">
                <Label for="app-name">应用名称</Label>
                <Input id="app-name" v-model="form.name" placeholder="如：Demo App" />
              </div>
              <div class="space-y-2">
                <Label for="app-bundle">Bundle ID</Label>
                <Input id="app-bundle" v-model="form.bundleId" placeholder="如：com.example.demo" />
              </div>
              <div class="space-y-2">
                <Label for="app-desc">描述（可选）</Label>
                <Textarea id="app-desc" v-model="form.description" placeholder="应用简介" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" @click="createOpen = false">取消</Button>
                <Button type="submit" :disabled="creating">
                  <LoaderCircle v-if="creating" class="animate-spin" />
                  创建
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p v-if="loading" class="mt-16 text-center text-sm text-muted-foreground">加载中…</p>

      <div v-else-if="apps.length === 0" class="mt-16 text-center">
        <Package class="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p class="mt-3 text-sm text-muted-foreground">暂无应用，点击「新建应用」创建第一个</p>
      </div>

      <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="app in apps"
          :key="app.id"
          class="rounded-xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40"
          @click="router.push(`/apps/${app.id}`)"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-lg font-semibold text-primary"
            >
              <img v-if="app.iconUrl" :src="app.iconUrl" class="h-full w-full object-cover" alt="" />
              <span v-else>{{ app.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate font-semibold">{{ app.name }}</h3>
                <Badge v-if="app.latestBuild" variant="secondary" class="shrink-0">
                  v{{ app.latestBuild.version }}
                </Badge>
              </div>
              <p class="mt-1 truncate text-xs text-muted-foreground">{{ app.bundleId }}</p>
              <p v-if="app.description" class="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {{ app.description }}
              </p>
            </div>
          </div>
          <div
            class="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground"
          >
            <span class="inline-flex shrink-0 items-center gap-1">
              <Download class="h-3.5 w-3.5" />
              {{ app.downloadCount }} 次下载
            </span>
            <span v-if="app.createdBy" class="min-w-0 truncate">创建者 {{ app.createdBy }}</span>
            <span class="shrink-0">{{ formatDate(app.updatedAt) }}</span>
          </div>
        </button>
      </div>
    </main>
  </div>
</template>
