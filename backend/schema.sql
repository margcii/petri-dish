-- Petri Dish 数据库表结构
-- SQLite 版本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    last_active TIMESTAMP,  -- 最后活跃时间（心跳更新）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 杂交事件表
CREATE TABLE IF NOT EXISTS hybrid_events (
    event_id TEXT PRIMARY KEY,
    dish_id TEXT NOT NULL,
    fungus_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(dish_id),
    FOREIGN KEY (fungus_id) REFERENCES fungi(fungus_id)
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
    status TEXT DEFAULT 'idle',  -- idle / incubating / in_air / hybridized
    location TEXT DEFAULT 'air',  -- air / dish_id
    is_parent BOOLEAN DEFAULT 0,  -- 是否已作为亲本参与杂交（杂交后不再参与）
    unlock_time TIMESTAMP,  -- 孵化完成时间
    parent1_id TEXT,  -- 杂交亲本1
    parent2_id TEXT,  -- 杂交亲本2
    dna_prompt TEXT DEFAULT NULL,  -- 真菌的DNA提示词
    fall_remaining INTEGER DEFAULT 3,  -- 空气真菌剩余落入次数（在培养皿中为0）
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

-- 真菌分配表（空气真菌落入用户培养皿的记录）
CREATE TABLE IF NOT EXISTS fungus_distributions (
    id TEXT PRIMARY KEY,
    fungus_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    dish_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fungus_id, user_id),
    FOREIGN KEY (fungus_id) REFERENCES fungi(fungus_id)
);
CREATE INDEX IF NOT EXISTS idx_distributions_fungus ON fungus_distributions(fungus_id);