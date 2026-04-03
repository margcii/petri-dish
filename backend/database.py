"""
Petri Dish 数据库操作类
使用 aiosqlite 实现异步数据库操作
"""

import os
import aiosqlite
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

# 获取backend目录路径
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


class Database:
    """异步数据库操作类"""
    
    def __init__(self, db_path: str = "petri_dish.db"):
        self.db_path = db_path
        self._db: Optional[aiosqlite.Connection] = None
    
    async def connect(self):
        """建立数据库连接"""
        if self._db is None:
            self._db = await aiosqlite.connect(self.db_path)
            # 启用外键约束
            await self._db.execute("PRAGMA foreign_keys = ON")
            # 初始化表结构
            await self._init_tables()
    
    async def close(self):
        """关闭数据库连接"""
        if self._db:
            await self._db.close()
            self._db = None
    
    async def _init_tables(self):
        """初始化数据库表"""
        schema_path = os.path.join(BACKEND_DIR, "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = f.read()
        await self._db.executescript(schema)
        await self._db.commit()
    
    # ==================== 用户操作 ====================
    
    async def create_user(self, name: str) -> str:
        """创建用户，返回 user_id"""
        user_id = str(uuid.uuid4())
        await self._db.execute(
            "INSERT INTO users (user_id, name) VALUES (?, ?)",
            (user_id, name)
        )
        await self._db.commit()
        return user_id
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户信息"""
        async with self._db.execute(
            "SELECT user_id, name, created_at FROM users WHERE user_id = ?",
            (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    "user_id": row[0],
                    "name": row[1],
                    "created_at": row[2]
                }
            return None
    
    # ==================== 培养皿操作 ====================
    
    async def create_dish(self, user_id: str, name: str) -> str:
        """创建培养皿，返回 dish_id"""
        dish_id = str(uuid.uuid4())
        await self._db.execute(
            "INSERT INTO dishes (dish_id, user_id, name) VALUES (?, ?, ?)",
            (dish_id, user_id, name)
        )
        await self._db.commit()
        return dish_id
    
    async def get_dish(self, dish_id: str) -> Optional[Dict[str, Any]]:
        """获取培养皿信息"""
        async with self._db.execute(
            "SELECT dish_id, user_id, name, created_at FROM dishes WHERE dish_id = ?",
            (dish_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    "dish_id": row[0],
                    "user_id": row[1],
                    "name": row[2],
                    "created_at": row[3]
                }
            return None
    
    async def get_user_dishes(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户的所有培养皿（包含真菌数量）"""
        dishes = []
        async with self._db.execute(
            """SELECT d.dish_id, d.user_id, d.name, d.created_at,
                      (SELECT COUNT(*) FROM fungi WHERE dish_id = d.dish_id AND status != 'in_air') as fungus_count
               FROM dishes d WHERE d.user_id = ?""",
            (user_id,)
        ) as cursor:
            async for row in cursor:
                dishes.append({
                    "dish_id": row[0],
                    "user_id": row[1],
                    "name": row[2],
                    "created_at": row[3],
                    "fungus_count": row[4] or 0
                })
        return dishes
    
    # ==================== 真菌操作 ====================
    
    async def create_fungus(
        self, 
        user_id: str, 
        content: str, 
        image_id: str,
        dish_id: Optional[str] = None,
        status: str = "idle",
        location: str = "air"
    ) -> str:
        """创建真菌，返回 fungus_id"""
        fungus_id = str(uuid.uuid4())
        await self._db.execute(
            """INSERT INTO fungi 
               (fungus_id, dish_id, user_id, content, image_id, status, location) 
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (fungus_id, dish_id, user_id, content, image_id, status, location)
        )
        await self._db.commit()
        return fungus_id
    
    async def get_fungus(self, fungus_id: str) -> Optional[Dict[str, Any]]:
        """获取真菌信息"""
        async with self._db.execute(
            """SELECT fungus_id, dish_id, user_id, content, image_id, status, 
                      location, unlock_time, parent1_id, parent2_id, created_at 
               FROM fungi WHERE fungus_id = ?""",
            (fungus_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    "fungus_id": row[0],
                    "dish_id": row[1],
                    "user_id": row[2],
                    "content": row[3],
                    "image_id": row[4],
                    "status": row[5],
                    "location": row[6],
                    "unlock_time": row[7],
                    "parent1_id": row[8],
                    "parent2_id": row[9],
                    "created_at": row[10]
                }
            return None
    
    async def get_dish_fungi(self, dish_id: str) -> List[Dict[str, Any]]:
        """获取培养皿中的所有真菌"""
        fungi = []
        async with self._db.execute(
            """SELECT fungus_id, dish_id, user_id, content, image_id, status, 
                      location, unlock_time, parent1_id, parent2_id, created_at 
               FROM fungi WHERE dish_id = ?""",
            (dish_id,)
        ) as cursor:
            async for row in cursor:
                fungi.append({
                    "fungus_id": row[0],
                    "dish_id": row[1],
                    "user_id": row[2],
                    "content": row[3],
                    "image_id": row[4],
                    "status": row[5],
                    "location": row[6],
                    "unlock_time": row[7],
                    "parent1_id": row[8],
                    "parent2_id": row[9],
                    "created_at": row[10]
                })
        return fungi
    
    async def get_air_fungi(self) -> List[Dict[str, Any]]:
        """获取空气中的所有真菌"""
        fungi = []
        async with self._db.execute(
            """SELECT fungus_id, dish_id, user_id, content, image_id, status, 
                      location, unlock_time, parent1_id, parent2_id, created_at 
               FROM fungi WHERE location = 'air'"""
        ) as cursor:
            async for row in cursor:
                fungi.append({
                    "fungus_id": row[0],
                    "dish_id": row[1],
                    "user_id": row[2],
                    "content": row[3],
                    "image_id": row[4],
                    "status": row[5],
                    "location": row[6],
                    "unlock_time": row[7],
                    "parent1_id": row[8],
                    "parent2_id": row[9],
                    "created_at": row[10]
                })
        return fungi
    
    async def update_fungus_status(
        self, 
        fungus_id: str, 
        status: str,
        location: Optional[str] = None,
        dish_id: Optional[str] = None,
        unlock_time: Optional[str] = None
    ):
        """更新真菌状态"""
        updates = ["status = ?"]
        params = [status]
        
        if location is not None:
            updates.append("location = ?")
            params.append(location)
        
        if dish_id is not None:
            updates.append("dish_id = ?")
            params.append(dish_id)
        
        if unlock_time is not None:
            updates.append("unlock_time = ?")
            params.append(unlock_time)
        
        params.append(fungus_id)
        
        await self._db.execute(
            f"UPDATE fungi SET {', '.join(updates)} WHERE fungus_id = ?",
            params
        )
        await self._db.commit()
    
    async def create_hybrid_fungus(
        self,
        user_id: str,
        content: str,
        image_id: str,
        parent1_id: str,
        parent2_id: str,
        dish_id: Optional[str] = None
    ) -> str:
        """创建杂交真菌"""
        fungus_id = str(uuid.uuid4())
        # 5秒后解锁
        unlock_time = (datetime.now() + timedelta(seconds=5)).isoformat()

        await self._db.execute(
            """INSERT INTO fungi
               (fungus_id, dish_id, user_id, content, image_id, status, location,
                unlock_time, parent1_id, parent2_id)
               VALUES (?, ?, ?, ?, ?, 'incubating', ?, ?, ?, ?)""",
            (fungus_id, dish_id, user_id, content, image_id,
             dish_id if dish_id else 'air', unlock_time,
             parent1_id, parent2_id)
        )
        await self._db.commit()
        return fungus_id


# 全局数据库实例
db = Database()