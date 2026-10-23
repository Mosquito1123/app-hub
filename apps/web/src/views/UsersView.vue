<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderCircle, ShieldOff, Trash2, UserPlus } from 'lucide-vue-next'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createUser, deleteUser, listUsers, updateUser } from '@/api'
import { USERNAME_RE, errorMessage, passwordOk } from '@/lib/account'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { Role, UserAdmin } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const { toast } = useToast()

const users = ref<UserAdmin[]>([])
// 路由进来时角色已经对齐；member 首屏直接显示 403，避免先闪出管理表格
const forbidden = ref(!auth.isAdmin)
const loading = ref(auth.isAdmin)

const createOpen = ref(false)
const creating = ref(false)
const form = ref({ username: '', password: '', role: 'member' as Role })

const resetFor = ref<UserAdmin | null>(null)
const resetPassword = ref('')
const resetting = ref(false)

function isSelf(u: UserAdmin) {
  return u.id === auth.user?.id
}

async function load() {
  if (!auth.isAdmin) {
    forbidden.value = true
    loading.value = false
    return
  }
  loading.value = true
  try {
    users.value = await listUsers()
    forbidden.value = false
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 403) {
      forbidden.value = true
      return
    }
    toast({ title: '加载用户列表失败', description: errorMessage(e, ''), variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

onMounted(load)

function onCreateOpen(open: boolean) {
  createOpen.value = open
  if (!open) form.value = { username: '', password: '', role: 'member' }
}

async function submitCreate() {
  const username = form.value.username.trim()
  const password = form.value.password
  if (!USERNAME_RE.test(username)) {
    toast({ title: '用户名需为 3-20 位字母、数字、下划线或中文', variant: 'destructive' })
    return
  }
  if (!passwordOk(password)) {
    toast({ title: '密码需为 6-20 位', variant: 'destructive' })
    return
  }
  creating.value = true
  try {
    await createUser({ username, password, role: form.value.role })
    onCreateOpen(false)
    toast({ title: '用户已创建' })
    await load()
  } catch (e) {
    toast({ title: '创建失败', description: errorMessage(e, '请稍后重试'), variant: 'destructive' })
  } finally {
    creating.value = false
  }
}

function onResetOpen(open: boolean) {
  if (!open) {
    resetFor.value = null
    resetPassword.value = ''
  }
}

async function submitReset() {
  if (!resetFor.value) return
  if (!passwordOk(resetPassword.value)) {
    toast({ title: '新密码需为 6-20 位', variant: 'destructive' })
    return
  }
  resetting.value = true
  try {
    await updateUser(resetFor.value.id, { newPassword: resetPassword.value })
    onResetOpen(false)
    toast({ title: '密码已重置' })
    await load()
  } catch (e) {
    toast({ title: '重置失败', description: errorMessage(e, '请稍后重试'), variant: 'destructive' })
  } finally {
    resetting.value = false
  }
}

async function toggleDisable(u: UserAdmin) {
  try {
    await updateUser(u.id, { disabled: !u.disabled })
    toast({ title: u.disabled ? '已启用该用户' : '已禁用该用户' })
    await load()
  } catch (e) {
    toast({ title: '操作失败', description: errorMessage(e, '请稍后重试'), variant: 'destructive' })
  }
}

async function toggleRole(u: UserAdmin) {
  const next: Role = u.role === 'admin' ? 'member' : 'admin'
  try {
    await updateUser(u.id, { role: next })
    toast({ title: next === 'admin' ? '已设为管理员' : '已设为成员' })
    await load()
  } catch (e) {
    toast({ title: '操作失败', description: errorMessage(e, '请稍后重试'), variant: 'destructive' })
  }
}

async function onDelete(u: UserAdmin) {
  if (!window.confirm(`确定删除用户「${u.username}」？此操作不可恢复。`)) return
  try {
    await deleteUser(u.id)
    toast({ title: '用户已删除' })
    await load()
  } catch (e) {
    toast({ title: '删除失败', description: errorMessage(e, '请稍后重试'), variant: 'destructive' })
  }
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <div v-if="forbidden" class="mt-16 rounded-xl border bg-card p-8 text-center">
        <ShieldOff class="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p class="mt-3 text-base font-medium">403 无权限访问</p>
        <p class="mt-1 text-sm text-muted-foreground">用户管理仅管理员可用。</p>
        <Button variant="outline" class="mt-4" @click="router.push('/')">返回首页</Button>
      </div>

      <template v-else>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-xl font-bold">用户管理</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              添加账号、调整角色、重置密码、启用或禁用。应用对所有成员共享。
            </p>
          </div>
          <Dialog :open="createOpen" @update:open="onCreateOpen">
            <DialogTrigger as-child>
              <Button>
                <UserPlus />
                添加用户
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加用户</DialogTitle>
                <DialogDescription>直接创建账号。未指定角色时为 member。</DialogDescription>
              </DialogHeader>
              <form class="space-y-4" @submit.prevent="submitCreate">
                <div class="space-y-2">
                  <Label for="user-username">用户名</Label>
                  <Input
                    id="user-username"
                    v-model="form.username"
                    placeholder="3-20 位（字母/数字/下划线/中文）"
                    autocomplete="off"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="user-password">密码</Label>
                  <Input
                    id="user-password"
                    v-model="form.password"
                    type="password"
                    placeholder="6-20 位"
                    autocomplete="new-password"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="user-role">角色</Label>
                  <select
                    id="user-role"
                    v-model="form.role"
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="member">member（应用平权）</option>
                    <option value="admin">admin（管理用户）</option>
                  </select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" @click="onCreateOpen(false)">取消</Button>
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

        <div v-else class="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="users.length === 0">
                  <TableCell colspan="5" class="py-8 text-center text-sm text-muted-foreground">
                    暂无用户
                  </TableCell>
                </TableRow>
                <TableRow v-for="u in users" :key="u.id">
                  <TableCell class="font-medium">
                    {{ u.username }}
                    <span v-if="isSelf(u)" class="ml-2 text-xs font-normal text-muted-foreground">（我）</span>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="u.role === 'admin' ? 'default' : 'secondary'">{{ u.role }}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="u.disabled ? 'destructive' : 'secondary'">
                      {{ u.disabled ? '已禁用' : '正常' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="whitespace-nowrap text-muted-foreground">
                    {{ formatDate(u.createdAt) }}
                  </TableCell>
                  <TableCell class="text-right">
                    <div v-if="isSelf(u)" class="text-xs text-muted-foreground">当前账号</div>
                    <div v-else class="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" @click="toggleRole(u)">
                        {{ u.role === 'admin' ? '设为成员' : '设为管理员' }}
                      </Button>
                      <Button size="sm" variant="outline" @click="toggleDisable(u)">
                        {{ u.disabled ? '启用' : '禁用' }}
                      </Button>
                      <Button size="sm" variant="outline" @click="resetFor = u">重置密码</Button>
                      <Button size="sm" variant="destructive" @click="onDelete(u)">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </template>
    </main>

    <Dialog :open="resetFor !== null" @update:open="onResetOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>为「{{ resetFor?.username }}」设置新密码（6-20 位）。</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitReset">
          <div class="space-y-2">
            <Label for="user-reset-password">新密码</Label>
            <Input
              id="user-reset-password"
              v-model="resetPassword"
              type="password"
              placeholder="6-20 位"
              autocomplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="onResetOpen(false)">取消</Button>
            <Button type="submit" :disabled="resetting">
              <LoaderCircle v-if="resetting" class="animate-spin" />
              重置
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
