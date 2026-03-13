-- Petri Dish 数据库表结构
-- SQLite 版本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 培养皿表
CREATE TABLE IF NOT EXISTS dishes (
    dish_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 真菌表
CREATE TABLE IF NOT EXISTS fungi (
    fungus_id TEXT PRIMARY KEY,
    dish_id TEXT,  -- NULL 表示在空气中
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,  -- 用户上传的文本
    image_id TEXT NOT NULL,  -- 随机生成的图片ID
    status TEXT DEFAULT 'idle',  -- idle / incubating / in_air
    location TEXT DEFAULT 'air',  -- air / dish_id
    unlock_time TIMESTAMP,  -- 孵化完成时间
    parent1_id TEXT,  -- 杂交亲本1
    parent2_id TEXT,  -- 杂交亲本2
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(dish_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (parent1_id) REFERENCES fungi(fungus_id),
    FOREIGN KEY (parent2_id) REFERENCES fungi(fungus_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_fungi_dish_id ON fungi(dish_id);
CREATE INDEX IF NOT EXISTS idx_fungi_user_id ON fungi(user_id);
CREATE INDEX IF NOT EXISTS idx_fungi_status ON fungi(status);
CREATE INDEX IF NOT EXISTS idx_fungi_location ON fungi(location);
CREATE INDEX IF NOT EXISTS idx_dishes_user_id ON dishes(user_id);