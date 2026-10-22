<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { Download } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fetchPublicApp } from '@/api'
import { absoluteUrl, formatDate, platformMeta } from '@/lib/utils'
import type { Build, PublicApp } from '@/types'

const route = useRoute()
const data = ref<PublicApp | null>(null)
const notFound = ref(false)
const loading = ref(true)
const pageQr = ref('')

const latest = computed(() => data.value?.builds[0] ?? null)
const isHttps = window.location.protocol === 'https:'

onMounted(async () => {
  try {
    data.value = await fetchPublicApp(String(route.params.shareId))
    try {
      pageQr.value = await QRCode.toDataURL(window.location.href, { width: 144, margin: 1 })
    } catch {
      pageQr.value = ''
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

function downloadUrl(b: Build) {
  return absoluteUrl(b.downloadUrl)
}

function itmsUrl(b: Build) {
  const manifest = absoluteUrl(`/api/public/builds/${b.id}/ios-manifest.plist`)
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`
}
</script>

<template>
  <div class="min-h-screen px-4 py-8">
    <div class="mx-auto max-w-md">
      <p v-if="loading" class="mt-16 text-center text-sm text-muted-foreground">加载中…</p>

      <!-- 404 -->
      <Card v-else-if="notFound">
        <CardContent class="p-8 text-center">
          <p class="text-lg font-semibold">应用不存在</p>
          <p class="mt-2 text-sm text-muted-foreground">
            链接可能已失效或应用已被删除，请联系分享者获取新链接。
          </p>
        </CardContent>
      </Card>

      <template v-else-if="data && latest">
        <!-- 应用信息 -->
        <Card>
          <CardContent class="flex items-center gap-4 p-6">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-bold text-primary"
            >
              <img
                v-if="data.app.iconUrl"
                :src="data.app.iconUrl"
                class="h-full w-full object-cover"
                alt=""
              />
              <span v-else>{{ data.app.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-xl font-bold">{{ data.app.name }}</h1>
              <p class="mt-0.5 break-all text-xs text-muted-foreground">{{ data.app.bundleId }}</p>
              <p v-if="data.app.description" class="mt-2 text-sm text-muted-foreground">
                {{ data.app.description }}
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- 最新版本 -->
        <Card class="mt-4">
          <CardContent class="p-6">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-primary">最新版本</span>
              <Badge :class="platformMeta[latest.platform].badgeClass">
                {{ platformMeta[latest.platform].label }}
              </Badge>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold">v{{ latest.version }}</span>
              <span v-if="latest.buildNumber" class="text-sm text-muted-foreground">
                Build {{ latest.buildNumber }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ formatDate(latest.createdAt) }} · {{ latest.downloadCount }} 次下载
            </p>

            <div
              v-if="latest.releaseNotes"
              class="mt-4 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm"
            >
              {{ latest.releaseNotes }}
            </div>

            <!-- 主 CTA -->
            <div class="mt-5 space-y-3">
              <!-- Android：直接下载 APK -->
              <Button v-if="latest.platform === 'android'" size="lg" class="h-12 w-full text-base" as-child>
                <a :href="downloadUrl(latest)">
                  <Download />
                  下载 APK
                </a>
              </Button>

              <!-- iOS：https 下走 itms-services 安装，否则引导下载 -->
              <template v-else-if="latest.platform === 'ios'">
                <Button v-if="isHttps" size="lg" class="h-12 w-full text-base" as-child>
                  <a :href="itmsUrl(latest)">安 装</a>
                </Button>
                <Button v-else size="lg" class="h-12 w-full text-base" as-child>
                  <a :href="downloadUrl(latest)">
                    <Download />
                    下载安装包
                  </a>
                </Button>
                <p v-if="!isHttps" class="text-center text-xs text-muted-foreground">
                  提示：iOS 无线安装需在 HTTPS 页面下进行，当前环境请下载 .ipa 后通过电脑安装。
                </p>
                <div class="text-center">
                  <a
                    :href="downloadUrl(latest)"
                    class="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    下载 .ipa
                  </a>
                </div>
              </template>

              <!-- 鸿蒙：下载 hap + 安装说明 -->
              <template v-else>
                <Button size="lg" class="h-12 w-full text-base" as-child>
                  <a :href="downloadUrl(latest)">
                    <Download />
                    下载 .hap
                  </a>
                </Button>
                <details class="rounded-lg bg-muted/60 px-4 py-3 text-sm">
                  <summary class="cursor-pointer font-medium">安装说明</summary>
                  <p class="mt-2 text-muted-foreground">
                    .hap 包需在鸿蒙设备上安装，可在设备文件管理器中打开后按提示安装，
                    或通过应用市场分发。浏览器中无法直接安装。
                  </p>
                </details>
              </template>
            </div>

            <!-- 桌面端二维码 -->
            <div v-if="pageQr" class="mt-6 hidden flex-col items-center gap-2 md:flex">
              <img
                :src="pageQr"
                class="rounded-lg border bg-white p-1"
                width="136"
                height="136"
                alt="扫码访问"
              />
              <p class="text-sm text-muted-foreground">手机扫码安装</p>
            </div>
          </CardContent>
        </Card>

        <!-- 历史版本 -->
        <Card v-if="data.builds.length > 1" class="mt-4">
          <CardContent class="p-6">
            <h2 class="font-semibold">历史版本</h2>
            <div class="mt-2">
              <div
                v-for="b in data.builds.slice(1)"
                :key="b.id"
                class="flex items-center gap-3 border-t py-3 first:border-t-0"
              >
                <Badge :class="platformMeta[b.platform].badgeClass">
                  {{ platformMeta[b.platform].label }}
                </Badge>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium">
                    v{{ b.version }}
                    <span v-if="b.buildNumber" class="font-normal text-muted-foreground">
                      · {{ b.buildNumber }}
                    </span>
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ formatDate(b.createdAt) }} · {{ b.downloadCount }} 次下载
                  </p>
                </div>
                <Button variant="outline" size="sm" as-child>
                  <a :href="downloadUrl(b)">
                    <Download />
                    下载
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p class="mt-8 text-center text-xs text-muted-foreground">Powered by AppHub</p>
      </template>
    </div>
  </div>
</template>
