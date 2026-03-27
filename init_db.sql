-- init_db.sql
-- Supabase (PostgreSQL) 初始化：restaurants + reviews + 16 条餐厅初始数据

-- UUID 生成函数
create extension if not exists "pgcrypto";

-- =========================
-- 1) Tables
-- =========================

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  university text not null,
  sub_location text not null,
  category text not null,
  price numeric(6,2) not null check (price >= 0),
  rating numeric(2,1) not null check (rating >= 0 and rating <= 5),
  distance text not null,
  tags text[] not null default '{}'::text[],
  signature_dishes text not null,
  image_url text
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid,
  username text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_restaurant_id_created_at
  on public.reviews (restaurant_id, created_at desc);

-- =========================
-- 2) Seed restaurants (16 rows)
-- =========================

insert into public.restaurants
  (name, university, sub_location, category, price, rating, distance, tags, signature_dishes, image_url)
values
  -- NTU (南洋理工大学)
  (
    '南大二餐印尼砸鸡 (Canteen 2 Ayam Penyet)',
    '南洋理工大学 (NTU)',
    'Canteen 2',
    '东南亚菜',
    6.50,
    4.8,
    '350m',
    array['排队王','辣得过瘾'],
    '炸鸡腿饭',
    'https://placehold.co/800x520?text=Canteen%202%20Ayam%20Penyet'
  ),
  (
    '南大二餐小笼包',
    '南洋理工大学 (NTU)',
    'Canteen 2',
    '中式面点',
    5.50,
    4.6,
    '320m',
    array['现包现蒸','早餐首选'],
    '鲜肉小笼包, 红油抄手',
    'https://placehold.co/800x520?text=Canteen%202%20XiaoLongBao'
  ),
  (
    '北区杂菜饭 (North Spine Mixed Veg Rice)',
    '南洋理工大学 (NTU)',
    'North Spine',
    '快餐简餐',
    4.50,
    4.2,
    '600m',
    array['经济实惠','菜品多'],
    '糖醋里脊, 麦片虾',
    'https://placehold.co/800x520?text=North%20Spine%20Mixed%20Veg%20Rice'
  ),
  (
    'Tamarind 麻辣香锅',
    '南洋理工大学 (NTU)',
    '宿舍区',
    '川湘菜',
    12.00,
    4.7,
    '900m',
    array['聚餐首选','够麻够辣'],
    '蒜香麻辣香锅',
    'https://placehold.co/800x520?text=Tamarind%20Mala'
  ),
  (
    '十一餐海南鸡饭 (Canteen 11 Chicken Rice)',
    '南洋理工大学 (NTU)',
    '宿舍区',
    '新加坡本地',
    5.00,
    4.5,
    '880m',
    array['鸡肉滑嫩','秘制辣椒酱'],
    '白斩鸡饭',
    'https://placehold.co/800x520?text=Canteen%2011%20Chicken%20Rice'
  ),
  (
    '九餐鸡公煲 (Canteen 9 Ji Gong Bao)',
    '南洋理工大学 (NTU)',
    '宿舍区',
    '中式炖锅',
    8.50,
    4.9,
    '820m',
    array['浓郁下饭','加泡面绝赞'],
    '招牌鸡公煲',
    'https://placehold.co/800x520?text=Canteen%209%20Ji%20Gong%20Bao'
  ),
  (
    'Rayz Bistro',
    '南洋理工大学 (NTU)',
    'North Spine',
    '西餐',
    18.00,
    4.3,
    '650m',
    array['环境好','适合约会'],
    '经典牛肉汉堡',
    'https://placehold.co/800x520?text=Rayz%20Bistro'
  ),
  (
    '凡点 (Quad Cafe) 酿豆腐',
    '南洋理工大学 (NTU)',
    'South Spine',
    '健康轻食',
    6.00,
    4.4,
    '500m',
    array['清淡','汤头鲜美'],
    '清汤酿豆腐',
    'https://placehold.co/800x520?text=Quad%20Cafe%20Yong%20Tau%20Foo'
  ),

  -- NUS (新加坡国立大学)
  (
    'The Deck 海南鸡饭',
    '新加坡国立大学 (NUS)',
    '肯特岗 (Kent Ridge)',
    '新加坡本地',
    4.50,
    4.6,
    '450m',
    array['经典必吃','性价比高'],
    '烧鸡饭',
    'https://placehold.co/800x520?text=The%20Deck%20Chicken%20Rice'
  ),
  (
    'The Deck 酿豆腐',
    '新加坡国立大学 (NUS)',
    '肯特岗 (Kent Ridge)',
    '健康轻食',
    5.50,
    4.5,
    '430m',
    array['自选食材','队伍长'],
    '叻沙酿豆腐',
    'https://placehold.co/800x520?text=The%20Deck%20Yong%20Tau%20Foo'
  ),
  (
    'Hwang''s Korean Restaurant',
    '新加坡国立大学 (NUS)',
    'UTown',
    '韩国料理',
    10.00,
    4.8,
    '300m',
    array['正宗韩味','免费小菜'],
    '铁板牛肉, 泡菜汤',
    'https://placehold.co/800x520?text=Hwang%27s%20Korean'
  ),
  (
    'Fine Food 麻辣香锅',
    '新加坡国立大学 (NUS)',
    'UTown',
    '川湘菜',
    15.00,
    4.7,
    '280m',
    array['食材新鲜','环境冷气足'],
    '特辣香锅',
    'https://placehold.co/800x520?text=Fine%20Food%20Mala'
  ),
  (
    '工学院西餐 (Techno Edge Western)',
    '新加坡国立大学 (NUS)',
    '肯特岗 (Kent Ridge)',
    '西餐',
    7.00,
    4.4,
    '520m',
    array['大份量','铁板系列'],
    '黑椒鸡排',
    'https://placehold.co/800x520?text=Techno%20Edge%20Western'
  ),
  (
    'PGPR 深夜麻辣香锅',
    '新加坡国立大学 (NUS)',
    'PGPR',
    '深夜食堂',
    14.00,
    4.5,
    '180m',
    array['开到深夜','宿舍楼下'],
    '麻辣拌',
    'https://placehold.co/800x520?text=PGPR%20Late%20Night%20Mala'
  ),
  (
    'Super Snacks',
    '新加坡国立大学 (NUS)',
    'UTown',
    '深夜食堂',
    6.00,
    4.6,
    '260m',
    array['熬夜救星','现点现做'],
    '芝士薯条, 华夫饼',
    'https://placehold.co/800x520?text=Super%20Snacks'
  ),
  (
    '理学院印尼砸鸡 (Frontier Ayam Penyet)',
    '新加坡国立大学 (NUS)',
    '科学园 (Science)',
    '东南亚菜',
    6.50,
    4.8,
    '410m',
    array['理学院之光','辣酱无敌'],
    '砸鸡腿饭',
    'https://placehold.co/800x520?text=Frontier%20Ayam%20Penyet'
  );

