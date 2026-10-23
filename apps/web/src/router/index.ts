import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'apps',
      component: () => import('@/views/AppsView.vue'),
    },
    {
      path: '/apps/:id',
      name: 'app-detail',
      component: () => import('@/views/AppDetailView.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      // 仅 admin 展示管理功能；member 进入页面后看到 403，不重定向
      meta: { admin: true },
    },
    {
      path: '/d/:shareId',
      name: 'download',
      component: () => import('@/views/DownloadView.vue'),
      meta: { public: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && auth.token) return '/'
    return true
  }
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  try {
    await auth.ensureRole()
  } catch {
    if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login') return '/'
  return true
})

export default router
