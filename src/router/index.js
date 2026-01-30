import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/NovelList.vue'),
    },
    {
      path: '/novel/create',
      name: 'novelCreate',
      component: () => import('../views/NovelCreate.vue'),
    },
    {
      path: '/novel/:id',
      name: 'novelDetail',
      component: () => import('../views/NovelDetail.vue'),
    },
    {
      path: '/novel/:id/edit',
      name: 'novelEdit',
      component: () => import('../views/NovelEdit.vue'),
    },
    {
      path: '/novel/:id/chapter/create',
      name: 'chapterCreate',
      component: () => import('../views/ChapterCreate.vue'),
    },
    {
      path: '/novel/:id/chapter/:num',
      name: 'chapterDetail',
      component: () => import('../views/ChapterDetail.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue'),
    },
  ],
})

export default router
