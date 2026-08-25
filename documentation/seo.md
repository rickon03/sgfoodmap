# SEO 现状

## 当前实现

- 应用是单页站点，仅有公开首页 `/`；
- `index.html` 设置了中文语言、viewport 和静态标题“大学城美食地图”；
- 没有服务端渲染、预渲染或动态路由元数据；
- 没有 meta description、Open Graph、Twitter Card、canonical、结构化数据、`robots.txt` 或 `sitemap.xml`；
- 页面数据由浏览器从 Supabase 加载，搜索引擎不一定能完整抓取餐厅内容。

## 路由与数据边界

| 路由 | 是否公开 | SEO 需求 | 数据要求 |
| --- | --- | --- | --- |
| `/` | 是 | 项目名称、定位和分享预览 | 只能展示公开的 Demo 餐厅信息 |

登录弹窗、个人中心、优惠券和拼桌状态不应进入公开元数据。

## 建议

1. 增加准确的 description、Open Graph、canonical 和分享图片；
2. 增加 `robots.txt` 与 `sitemap.xml`；
3. 若未来有餐厅独立链接，再评估预渲染或服务端渲染；
4. 所有公开文案继续明确 Demo 属性，不把演示价格和活动描述成实时承诺。

