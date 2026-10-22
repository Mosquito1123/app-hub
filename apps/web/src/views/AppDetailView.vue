<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { ArrowLeft, Copy, LoaderCircle, Trash2, CloudUpload } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { deleteApp, deleteBuild, fetchApp, uploadBuild } from '@/api'
import { absoluteUrl, copyText, formatBytes, formatDate, platformMeta } from '@/lib/utils'
import { useToast } from '@/composables/useToast'
import type { AppDetail, Build, Platform } from '@/types'

const route = useRoute()
const router = useRouter()
const { toast } = useToast()

const app = ref<AppDetail | null>(null)
const loading = ref(true)

onMounted(load)
watch(() => route.params.id, load)

async function load() {
  loading.value = true
  try {
    app.value = await fetchApp(String(route.params.id))
    genShareQr()
  } catch {
    toast({ title: '应用加载失败', variant: 'destructive' })
    router.replace('/')
  } finally {
    loading.value = false
  }
}

// 分享区
const shareUrl = computed(() => (app.value ? `${window.location.origin}/d/${app.value.shareId}` : ''))
const shareQr = ref('')

async function genShareQr() {
  if (!shareUrl.value) return
  try {
    shareQr.value = await QRCode.toDataURL(shareUrl.value, { width: 120, margin: 1 })
  } catch {
    shareQr.value = ''
  }
}

async function copyLink(text: string) {
  try {
    await copyText(text)
    toast({ title: '已复制到剪贴板' })
  } catch {
    toast({ title: '复制失败，请手动复制', variant: 'destructive' })
  }
}

// 删除应用
const deleteAppOpen = ref(false)
const deletingApp = ref(false)

async function confirmDeleteApp() {
  if (!app.value) return
  deletingApp.value = true
  try {
    await deleteApp(app.value.id)
    toast({ title: '应用已删除' })
    router.replace('/')
  } catch {
    toast({ title: '删除失败', variant: 'destructive' })
    deletingApp.value = false
  }
}

// 上传构建
const uploading = ref(false)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement>()
const file = ref<File | null>(null)
const form = reactive({
  // reka-ui Select 的值类型较宽，这里收敛为 string 并在提交时断言为 Platform
  platform: undefined as any as string | undefined,
  version: '',
  buildNumber: '',
  channel: '',
  releaseNotes: '',
})

function pickFile(files: FileList | null) {
  if (files?.[0]) file.value = files[0]
}

function onDrop(e: DragEvent) {
  dragging.value = false
  pickFile(e.dataTransfer?.files ?? null)
}

async function submitUpload() {
  if (!app.value) return
  if (!file.value) {
    toast({ title: '请选择构建文件', variant: 'destructive' })
    return
  }
  if (!form.platform) {
    toast({ title: '请选择平台', variant: 'destructive' })
    return
  }
  if (!form.version.trim()) {
    toast({ title: '请填写版本号', variant: 'destructive' })
    return
  }
  uploading.value = true
  try {
    await uploadBuild(app.value.id, {
      file: file.value,
      platform: form.platform as Platform,
      version: form.version.trim(),
      buildNumber: form.buildNumber.trim() || undefined,
      channel: form.channel.trim() || undefined,
      releaseNotes: form.releaseNotes.trim() || undefined,
    })
    toast({ title: '上传成功' })
    file.value = null
    form.platform = undefined
    form.version = ''
    form.buildNumber = ''
    form.channel = ''
    form.releaseNotes = ''
    if (fileInput.value) fileInput.value.value = ''
    await load()
  } catch (e: any) {
    const msg = e?.response?.data?.message
    toast({
      title: '上传失败',
      description: Array.isArray(msg) ? msg.join('，') : undefined,
      variant: 'destructive',
    })
  } finally {
    uploading.value = false
  }
}

// 删除版本
const pendingDeleteBuild = ref<Build | null>(null)

async function confirmDeleteBuild() {
  const b = pendingDeleteBuild.value
  if (!b) return
  try {
    await deleteBuild(b.id)
    toast({ title: '版本已删除' })
    pendingDeleteBuild.value = null
    await load()
  } catch {
    toast({ title: '删除失败', variant: 'destructive' })
  }
}
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-4xl items-center px-4">
        <Button variant="ghost" size="sm" as-child>
          <router-link to="/">
            <ArrowLeft />
            返回列表
          </router-link>
        </Button>
      </div>
    </header>

    <main class="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <p v-if="loading" class="mt-16 text-center text-sm text-muted-foreground">加载中…</p>

      <template v-else-if="app">
        <!-- 基本信息 -->
        <Card>
          <CardContent class="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
            <div
              class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-bold text-primary"
            >
              <img v-if="app.iconUrl" :src="app.iconUrl" class="h-full w-full object-cover" alt="" />
              <span v-else>{{ app.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h1 class="truncate text-2xl font-bold">{{ app.name }}</h1>
                  <p class="mt-1 break-all text-sm text-muted-foreground">{{ app.bundleId }}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  class="shrink-0 text-destructive hover:text-destructive"
                  @click="deleteAppOpen = true"
                >
                  <Trash2 />
                  删除应用
                </Button>
              </div>
              <p v-if="app.description" class="mt-3 text-sm">{{ app.description }}</p>
              <p class="mt-3 text-xs text-muted-foreground">
                共 {{ app.buildCount }} 个版本 · 累计 {{ app.downloadCount }} 次下载
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- 分享区 -->
        <Card>
          <CardContent class="flex items-center gap-6 p-6">
            <div class="min-w-0 flex-1">
              <h2 class="font-semibold">分享链接</h2>
              <p class="mt-1 break-all text-sm text-muted-foreground">{{ shareUrl }}</p>
              <Button variant="outline" size="sm" class="mt-3" @click="copyLink(shareUrl)">
                <Copy />
                复制链接
              </Button>
            </div>
            <div v-if="shareQr" class="hidden shrink-0 text-center sm:block">
              <img :src="shareQr" class="rounded-lg border bg-white p-1" width="112" height="112" alt="分享二维码" />
              <p class="mt-1 text-xs text-muted-foreground">手机扫码访问</p>
            </div>
          </CardContent>
        </Card>

        <!-- 上传构建 -->
        <Card>
          <CardContent class="p-6">
            <h2 class="font-semibold">上传构建</h2>
            <form class="mt-4 space-y-4" @submit.prevent="submitUpload">
              <div
                class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center"
                :class="dragging ? 'border-primary bg-primary/5' : 'border-border'"
                @dragover.prevent="dragging = true"
                @dragleave="dragging = false"
                @drop.prevent="onDrop"
              >
                <CloudUpload class="h-8 w-8 text-muted-foreground" />
                <p class="text-sm" :class="file ? 'font-medium' : 'text-muted-foreground'">
                  {{ file ? file.name : '拖拽文件到此处，或点击选择' }}
                </p>
                <p class="text-xs text-muted-foreground">
                  支持 .ipa / .apk / .hap / .app / .zip / .tar.gz，≤ 500MB
                </p>
                <input
                  ref="fileInput"
                  type="file"
                  class="hidden"
                  accept=".ipa,.apk,.hap,.app,.zip,.tar.gz"
                  @change="pickFile(($event.target as HTMLInputElement).files)"
                />
                <Button type="button" variant="outline" size="sm" @click="fileInput?.click()">
                  选择文件
                </Button>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="space-y-2">
                  <Label>平台</Label>
                  <Select v-model="form.platform">
                    <SelectTrigger>
                      <SelectValue placeholder="选择平台" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="harmony">鸿蒙</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="version">版本号 *</Label>
                  <Input id="version" v-model="form.version" placeholder="如：1.2.0" />
                </div>
                <div class="space-y-2">
                  <Label for="build-number">Build 号（可选）</Label>
                  <Input id="build-number" v-model="form.buildNumber" placeholder="如：128" />
                </div>
              </div>

              <div class="space-y-2">
                <Label for="channel">渠道（可选）</Label>
                <Input id="channel" v-model="form.channel" placeholder="如：prod / xiaomi" />
              </div>

              <div class="space-y-2">
                <Label for="release-notes">更新说明（可选）</Label>
                <Textarea
                  id="release-notes"
                  v-model="form.releaseNotes"
                  placeholder="本次更新的内容"
                />
              </div>

              <Button type="submit" :disabled="uploading">
                <LoaderCircle v-if="uploading" class="animate-spin" />
                <CloudUpload v-else />
                {{ uploading ? '上传中…' : '上传' }}
              </Button>
            </form>
          </CardContent>
        </Card>

        <!-- 版本历史 -->
        <Card>
          <CardContent class="p-6">
            <h2 class="font-semibold">版本历史</h2>
            <p v-if="app.builds.length === 0" class="mt-4 text-sm text-muted-foreground">
              还没有上传过构建包
            </p>
            <Table v-else class="mt-4 min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>版本</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>Build</TableHead>
                  <TableHead>渠道</TableHead>
                  <TableHead>文件</TableHead>
                  <TableHead>下载量</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead class="w-20 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="b in app.builds" :key="b.id">
                  <TableCell class="font-medium">{{ b.version }}</TableCell>
                  <TableCell>
                    <Badge :class="platformMeta[b.platform].badgeClass">
                      {{ platformMeta[b.platform].label }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ b.buildNumber || '—' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ b.channel || '—' }}</TableCell>
                  <TableCell>
                    <p class="max-w-48 truncate">{{ b.fileName }}</p>
                    <p class="text-xs text-muted-foreground">{{ formatBytes(b.fileSize) }}</p>
                  </TableCell>
                  <TableCell>{{ b.downloadCount }}</TableCell>
                  <TableCell class="whitespace-nowrap text-muted-foreground">
                    {{ formatDate(b.createdAt) }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      title="复制下载链接"
                      @click="copyLink(absoluteUrl(b.downloadUrl))"
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-destructive hover:text-destructive"
                      title="删除版本"
                      @click="pendingDeleteBuild = b"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </template>

      <!-- 删除应用确认 -->
      <Dialog :open="deleteAppOpen" @update:open="(v: boolean) => (deleteAppOpen = v)">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除应用</DialogTitle>
            <DialogDescription>
              确定删除「{{ app?.name }}」吗？所有构建记录及磁盘文件都会被一并删除，此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="deleteAppOpen = false">取消</Button>
            <Button variant="destructive" :disabled="deletingApp" @click="confirmDeleteApp">
              <LoaderCircle v-if="deletingApp" class="animate-spin" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 删除版本确认 -->
      <Dialog
        :open="!!pendingDeleteBuild"
        @update:open="(v: boolean) => { if (!v) pendingDeleteBuild = null }"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除版本</DialogTitle>
            <DialogDescription>
              确定删除 v{{ pendingDeleteBuild?.version }}（{{ pendingDeleteBuild?.fileName
              }}）吗？磁盘文件也会被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="pendingDeleteBuild = null">取消</Button>
            <Button variant="destructive" @click="confirmDeleteBuild">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  </div>
</template>
