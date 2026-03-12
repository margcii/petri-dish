-- Petri Dish 数据库表结构
-- AI媒介艺术实验 - 以真菌隐喻文本传播与杂交

-- ============================================
-- users 表 - 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- dishes 表 - 培养皿表（个人接收/处理空间）
-- ============================================
CREATE TABLE IF NOT EXISTS dishes (
    dish_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================
-- fungi 表 - 真菌表（文本的具象化表征）
-- ============================================
CREATE TABLE IF NOT EXISTS fungi (
    fungus_id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    image_id TEXT NOT NULL,
    creator_id INTEGER NOT NULL,
    parent_ids JSON,
    status TEXT DEFAULT 'idle',      -- idle / incubating / in_air
    location TEXT DEFAULT 'air',      -- air / dish_id
    unlock_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(user_id)
);

-- ============================================
-- 索引优化查询性能
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dishes_user_id ON dishes(user_id);
CREATE INDEX IF NOT EXISTS idx_fungi_creator_id ON fungi(creator_id);
CREATE INDEX IF NOT EXISTS idx_fungi_status ON fungi(status);
CREATE INDEX IF NOT EXISTS idx_fungi_location ON fungi(location);
CREATE INDEX IF NOT EXISTS idx_fungi_unlock_time ON fungi(unlock_time);