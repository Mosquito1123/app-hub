import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: '登录' },
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'admin-apps',
          component: () => import('@/views/AppsView.vue'),
          meta: { title: '应用管理' },
        },
        {
          path: 'apps/:id',
          name: 'admin-app-detail',
          component: () => import('@/views/AppDetailView.vue'),
          meta: { title: '应用详情' },
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/UsersView.vue'),
          // 仅 admin 展示管理功能；member 进入页面后看到 403，不重定向
          meta: { admin: true, title: '用户管理' },
        },
      ],
    },
    {
      path: '/d/:shareId',
      name: 'download',
      component: () => import('@/views/DownloadView.vue'),
      meta: { public: true, title: '下载' },
    },

    // 旧路径兼容：书签和已分享的管理地址不失效
    { path: '/login', redirect: (to) => ({ path: '/admin/login', query: to.query }) },
    { path: '/', redirect: '/admin' },
    { path: '/apps/:id', redirect: (to) => ({ path: `/admin/apps/${to.params.id}` }) },
    { path: '/users', redirect: '/admin/users' },
    { path: '/:pathMatch(.*)*', redirect: '/admin' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.name === 'admin-login' && auth.token) {
      const raw = to.query.redirect
      const redirect =
        typeof raw === 'string' &&
        raw.startsWith('/admin') &&
        !raw.startsWith('//') &&
        raw !== '/admin/login'
          ? raw
          : '/admin'
      return redirect
    }
    return true
  }
  if (!auth.token) return { path: '/admin/login', query: { redirect: to.fullPath } }
  try {
    await auth.ensureRole()
  } catch {
    if (!auth.token) return { path: '/admin/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
