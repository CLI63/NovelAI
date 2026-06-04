import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { keepAlive: true },
      component: () => import('../views/NovelCreate.vue'),
    },
    {
      path: '/novels',
      name: 'novelList',
      meta: { keepAlive: true },
      component: () => import('../views/NovelList.vue'),
    },
    {
      path: '/inspiration',
      name: 'inspiration',
      meta: { keepAlive: true },
      component: () => import('../views/InspirationWorkshop.vue'),
    },
    {
      path: '/tools',
      name: 'writingTools',
      meta: { keepAlive: true },
      component: () => import('../views/WritingTools.vue'),
    },
    {
      path: '/novel/create',
      redirect: '/',
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
      path: '/reader/:id',
      name: 'reader',
      component: () => import('../views/NovelReader.vue'),
    },
    {
      path: '/reader/:id/chapter/:chapter',
      name: 'readerChapter',
      component: () => import('../views/NovelReader.vue'),
    },
    {
      path: '/novel/:id/outline',
      name: 'outlineEditor',
      component: () => import('../views/OutlineEditor.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      meta: { keepAlive: true },
      component: () => import('../views/Settings.vue'),
    },
  ],
})

export default router
