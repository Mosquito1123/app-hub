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
      path: '/d/:shareId',
      name: 'download',
      component: () => import('@/views/DownloadView.vue'),
      meta: { public: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.path === '/login') return '/'
  return true
})

export default router
