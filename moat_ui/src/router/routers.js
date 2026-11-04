import Vue from 'vue'
import Router from 'vue-router'
import Layout from '../layout/index'

Vue.use(Router)

export const constantRouterMap = [
  { path: '/login',
    meta: { title: '登录', noCache: true },
    component: (resolve) => require(['@/views/login'], resolve),
    hidden: true
  },
  {
    path: '/404',
    component: (resolve) => require(['@/views/features/404'], resolve),
    hidden: true
  },
  {
    path: '/401',
    component: (resolve) => require(['@/views/features/401'], resolve),
    hidden: true
  },
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path*',
        component: (resolve) => require(['@/views/features/redirect'], resolve)
      }
    ]
  },
  {
    path: '/visual/chart/build/:id',
    component: () => import('@/views/visual/datachart/DataChartBuild'),
    hidden: true
  },

  {
    path: '/visual/board/build/:id',
    component: () => import('@/views/visual/databoard/DataBoardBuild'),
    hidden: true
  },

  {
    path: '/visual/board/view/:id',
    component: () => import('@/views/visual/databoard/DataBoardView'),
    hidden: true
  },

  {
    path: '/visual/screen/build/:id',
    component: () => import('@/views/visual/datascreen/DataScreenBuild'),
    hidden: true
  },

  {
    path: '/visual/screen/view/:id',
    component: () => import('@/views/visual/datascreen/DataScreenView'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: (resolve) => require(['@/views/home'], resolve),
        name: 'Dashboard',
        meta: { title: '首页', icon: 'index', affix: true, noCache: true }
      }
    ]
  },
  {
    path: '/user',
    component: Layout,
    hidden: true,
    redirect: 'noredirect',
    children: [
      {
        path: 'center',
        component: (resolve) => require(['@/views/system/user/center'], resolve),
        name: '个人中心',
        meta: { title: '个人中心' }
      }
    ]
  },

  // 👇 👇 👇 将 OCR 路由加在这里 👇 👇 👇
  {
    path: '/ocr',
    component: Layout,
    redirect: '/ocr/index',
    name: 'Ocr',
    meta: { title: '智能OCR识别', icon: 'el-icon-picture-outline' },
    children: [
      {
        path: 'index',
        name: 'OcrIndex',
        component: () => import('@/views/tools/ocr/index'),
        meta: { title: 'OCR 识别', icon: 'el-icon-picture-outline' }
      }
    ]
  },
  {
    path: '/engineering',
    component: Layout,
    redirect: '/engineering/index',
    name: 'Engineering',
    meta: { title: '工程数据工作台', icon: 'el-icon-data-analysis' },
    children: [
      {
        path: 'index',
        name: 'EngineeringIndex',
        component: () => import('@/views/engineering/index'),
        meta: { title: '查询与统计', icon: 'el-icon-data-analysis' }
      }
    ]
  }
  // 👆 👆 👆 ======================= 👆 👆 👆
]

export default new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRouterMap
})
