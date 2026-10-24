<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { ArrowLeft, Copy, ImagePlus, LoaderCircle, Pencil, Trash2, CloudUpload } from 'lucide-vue-next'
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
import { deleteApp, deleteBuild, fetchApp, getAppStats, updateApp, uploadBuild, uploadIcon } from '@/api'
import { absoluteUrl, copyText, formatBytes, formatDate, platformMeta } from '@/lib/utils'
import { useToast } from '@/composables/useToast'
import type { AppDetail, AppStats, Build, Platform } from '@/types'

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
    loadStats()
  } catch {
    toast({ title: '应用加载失败', variant: 'destructive' })
    router.replace('/admin')
  } finally {
    loading.value = false
  }
}

// 下载统计
const stats = ref<AppStats | null>(null)
const dailyMax = computed(() => Math.max(1, ...(stats.value?.daily.map((d) => d.count) ?? [])))

async function loadStats() {
  try {
    stats.value = await getAppStats(String(route.params.id))
  } catch {
    stats.value = null
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

// 更换图标
const iconInput = ref<HTMLInputElement>()
const uploadingIcon = ref(false)

function pickIcon(files: FileList | null) {
  const f = files?.[0]
  if (f) void submitIcon(f)
  if (iconInput.value) iconInput.value.value = ''
}

async function submitIcon(f: File) {
  if (!app.value) return
  uploadingIcon.value = true
  try {
    await uploadIcon(app.value.id, f)
    toast({ title: '图标已更新' })
    await load()
  } catch (e: any) {
    const msg = e?.response?.data?.message
    toast({
      title: '图标上传失败',
      description: Array.isArray(msg) ? msg.join('，') : msg,
      variant: 'destructive',
    })
  } finally {
    uploadingIcon.value = false
  }
}

// 编辑应用
const editOpen = ref(false)
const savingApp = ref(false)
const editForm = reactive({ name: '', description: '' })

function openEdit() {
  if (!app.value) return
  editForm.name = app.value.name
  editForm.description = app.value.description ?? ''
  editOpen.value = true
}

async function submitEdit() {
  if (!app.value) return
  const name = editForm.name.trim()
  if (!name) {
    toast({ title: '请填写应用名称', variant: 'destructive' })
    return
  }
  savingApp.value = true
  try {
    await updateApp(app.value.id, { name, description: editForm.description.trim() })
    editOpen.value = false
    toast({ title: '已保存' })
    await load()
  } catch {
    toast({ title: '保存失败', variant: 'destructive' })
  } finally {
    savingApp.value = false
  }
}

// 分享密码（密码值接口不回传，输入框永远为空）
const sharePassword = ref('')
const savingPassword = ref(false)

async function saveSharePassword() {
  if (!app.value) return
  const pwd = sharePassword.value.trim()
  if (!pwd) {
    toast({ title: '请输入密码', variant: 'destructive' })
    return
  }
  savingPassword.value = true
  try {
    await updateApp(app.value.id, { sharePassword: pwd })
    sharePassword.value = ''
    toast({ title: '分享密码已设置' })
    await load()
  } catch {
    toast({ title: '设置失败', variant: 'destructive' })
  } finally {
    savingPassword.value = false
  }
}

async function clearSharePassword() {
  if (!app.value) return
  savingPassword.value = true
  try {
    await updateApp(app.value.id, { sharePassword: '' })
    toast({ title: '分享密码已清除' })
    await load()
  } catch {
    toast({ title: '清除失败', variant: 'destructive' })
  } finally {
    savingPassword.value = false
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
    router.replace('/admin')
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
  <div class="mx-auto max-w-5xl space-y-6">
    <Button variant="ghost" size="sm" as-child class="-ml-2">
      <router-link to="/admin">
        <ArrowLeft />
        返回列表
      </router-link>
    </Button>

    <p v-if="loading" class="mt-16 text-center text-sm text-muted-foreground">加载中…</p>

      <template v-else-if="app">
        <!-- 基本信息 -->
        <Card>
          <CardContent class="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
            <div
              class="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-primary/10 text-2xl font-bold text-primary"
              @click="iconInput?.click()"
            >
              <img v-if="app.iconUrl" :src="app.iconUrl" class="h-full w-full object-cover" alt="" />
              <span v-else>{{ app.name.charAt(0).toUpperCase() }}</span>
              <div
                class="absolute inset-0 hidden items-center justify-center bg-black/40 text-xs font-medium text-white group-hover:flex"
              >
                <LoaderCircle v-if="uploadingIcon" class="h-5 w-5 animate-spin" />
                <span v-else class="flex items-center gap-1">
                  <ImagePlus class="h-4 w-4" />
                  更换图标
                </span>
              </div>
              <input
                ref="iconInput"
                type="file"
                class="hidden"
                accept=".png,.jpg,.jpeg,.svg"
                @change="pickIcon(($event.target as HTMLInputElement).files)"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h1 class="truncate text-2xl font-bold">{{ app.name }}</h1>
                  <p class="mt-1 break-all text-sm text-muted-foreground">{{ app.bundleId }}</p>
                  <p v-if="app.createdBy" class="mt-1 text-xs text-muted-foreground">
                    创建者 {{ app.createdBy }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" @click="openEdit">
                    <Pencil />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="text-destructive hover:text-destructive"
                    @click="deleteAppOpen = true"
                  >
                    <Trash2 />
                    删除应用
                  </Button>
                </div>
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
          <CardContent class="p-6">
            <div class="flex items-start gap-6">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h2 class="font-semibold">分享链接</h2>
                  <Badge
                    :class="
                      app.shareProtected ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                    "
                  >
                    {{ app.shareProtected ? '已开启密码' : '无密码' }}
                  </Badge>
                </div>
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
            </div>
            <div class="mt-5 flex flex-wrap items-end gap-3 border-t pt-5">
              <div class="min-w-48 flex-1 space-y-2">
                <Label for="share-password">访问密码</Label>
                <Input
                  id="share-password"
                  v-model="sharePassword"
                  type="text"
                  placeholder="设置密码"
                  autocomplete="new-password"
                />
              </div>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  :disabled="savingPassword || !sharePassword.trim()"
                  @click="saveSharePassword"
                >
                  <LoaderCircle v-if="savingPassword" class="animate-spin" />
                  保存
                </Button>
                <Button
                  v-if="app.shareProtected"
                  size="sm"
                  variant="outline"
                  :disabled="savingPassword"
                  @click="clearSharePassword"
                >
                  清除
                </Button>
              </div>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">
              设置后，访问分享链接需输入密码；密码不会被回传显示，可输入新值覆盖或点击清除。
            </p>
          </CardContent>
        </Card>

        <!-- 下载统计 -->
        <Card v-if="stats">
          <CardContent class="p-6">
            <h2 class="font-semibold">下载统计</h2>
            <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p class="text-2xl font-bold">{{ stats.total }}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">累计下载</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-green-600">{{ stats.byPlatform.android }}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">Android</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-blue-600">{{ stats.byPlatform.ios }}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">iOS</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-orange-600">{{ stats.byPlatform.harmony }}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">鸿蒙</p>
              </div>
            </div>
            <div class="mt-6 flex h-24 items-end gap-[2px]">
              <div
                v-for="d in stats.daily"
                :key="d.date"
                class="min-h-[2px] flex-1 rounded-sm"
                :class="d.count > 0 ? 'bg-indigo-500' : 'bg-muted'"
                :style="{ height: `${(d.count / dailyMax) * 100}%` }"
                :title="`${d.date}: ${d.count}`"
              />
            </div>
            <p class="mt-2 text-xs text-muted-foreground">最近 30 天每日下载量</p>
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
                    <p>{{ formatDate(b.createdAt) }}</p>
                    <p v-if="b.createdBy" class="text-xs">{{ b.createdBy }}</p>
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

      <!-- 编辑应用 -->
      <Dialog :open="editOpen" @update:open="(v: boolean) => (editOpen = v)">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑应用</DialogTitle>
            <DialogDescription>修改应用名称和描述。</DialogDescription>
          </DialogHeader>
          <form class="space-y-4" @submit.prevent="submitEdit">
            <div class="space-y-2">
              <Label for="edit-name">应用名称</Label>
              <Input id="edit-name" v-model="editForm.name" placeholder="如：Demo App" />
            </div>
            <div class="space-y-2">
              <Label for="edit-desc">描述</Label>
              <Textarea id="edit-desc" v-model="editForm.description" placeholder="应用简介" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" @click="editOpen = false">取消</Button>
              <Button type="submit" :disabled="savingApp">
                <LoaderCircle v-if="savingApp" class="animate-spin" />
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
  </div>
</template>
