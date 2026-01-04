import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '网页教师 - Web Teacher',
    description: '将网页教程转化为交互式引导教学体验',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
  },
});
