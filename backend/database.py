"""数据库操作模块"""

import asyncio
import aiosqlite
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import os

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "petri.db")


class Database:
    """SQLite数据库异步操作类"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or DB_PATH

    async def init(self):
        """初始化数据库，创建表"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS dishes (
                    dish_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS fungi (
                    fungus_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    image_id TEXT NOT NULL,
                    creator_id INTEGER NOT NULL,
                    parent_ids JSON,
                    status TEXT DEFAULT 'idle',
                    location TEXT DEFAULT 'air',
                    unlock_time DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (creator_id) REFERENCES users(user_id)
                )
            """)
            await db.commit()

    # ========== 用户操作 ==========

    async def create_user(self, name: str) -> Optional[int]:
        """创建用户，返回 user_id"""
        async with aiosqlite.connect(self.db_path) as db:
            try:
                cursor = await db.execute(
                    "INSERT INTO users (name) VALUES (?)",
                    (name,)
                )
                await db.commit()
                return cursor.lastrowid
            except aiosqlite.IntegrityError:
                # 用户已存在
                cursor = await db.execute(
                    "SELECT user_id FROM users WHERE name = ?",
                    (name,)
                )
                result = await cursor.fetchone()
                return result[0] if result else None

    async def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取用户"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_user_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """根据名称获取用户"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM users WHERE name = ?",
                (name,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    # ========== 培养皿操作 ==========

    async def create_dish(self, user_id: int, name: str) -> Optional[int]:
        """创建培养皿，返回 dish_id"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO dishes (user_id, name) VALUES (?, ?)",
                (user_id, name)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_dish(self, dish_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取培养皿"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM dishes WHERE dish_id = ?",
                (dish_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_dishes_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        """获取用户的所有培养皿"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM dishes WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    # ========== 真菌操作 ==========

    async def create_fungus(
        self,
        text: str,
        image_id: str,
        creator_id: int,
        parent_ids: List[int] = None,
        status: str = "idle",
        location: str = "air"
    ) -> int:
        """创建真菌，返回 fungus_id"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO fungi 
                   (text, image_id, creator_id, parent_ids, status, location, unlock_time)
                   VALUES (?, ?, ?, ?, ?, ?, NULL)""",
                (text, image_id, creator_id, json.dumps(parent_ids) if parent_ids else None, status, location)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_fungus(self, fungus_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取真菌"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM fungi WHERE fungus_id = ?",
                (fungus_id,)
            )
            row = await cursor.fetchone()
            result = dict(row) if row else None
            if result and result.get("parent_ids"):
                result["parent_ids"] = json.loads(result["parent_ids"])
            return result

    async def get_fungi_by_dish(self, dish_id: int) -> List[Dict[str, Any]]:
        """获取培养皿中的真菌（status='idle'）"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """SELECT * FROM fungi 
                   WHERE location = ? AND status = 'idle' 
                   ORDER BY created_at DESC""",
                (str(dish_id),)
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                if d.get("parent_ids"):
                    d["parent_ids"] = json.loads(d["parent_ids"])
                result.append(d)
            return result

    async def get_all_air_fungi(self) -> List[Dict[str, Any]]:
        """获取空气中所有真菌"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """SELECT * FROM fungi 
                   WHERE location = 'air' AND status = 'idle' 
                   ORDER BY created_at DESC"""
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                if d.get("parent_ids"):
                    d["parent_ids"] = json.loads(d["parent_ids"])
                result.append(d)
            return result

    async def update_fungus_location(self, fungus_id: int, location: str) -> bool:
        """更新真菌位置"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE fungi SET location = ? WHERE fungus_id = ?",
                (location, fungus_id)
            )
            await db.commit()
            return True

    async def update_fungus_status(self, fungus_id: int, status: str, unlock_time: datetime = None) -> bool:
        """更新真菌状态"""
        async with aiosqlite.connect(self.db_path) as db:
            if unlock_time:
                await db.execute(
                    "UPDATE fungi SET status = ?, unlock_time = ? WHERE fungus_id = ?",
                    (status, unlock_time, fungus_id)
                )
            else:
                await db.execute(
                    "UPDATE fungi SET status = ? WHERE fungus_id = ?",
                    (status, fungus_id)
                )
            await db.commit()
            return True

    async def get_incubating_fungi(self) -> List[Dict[str, Any]]:
        """获取正在孵化的真菌"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            now = datetime.utcnow()
            cursor = await db.execute(
                "SELECT * FROM fungi WHERE status = 'incubating' AND unlock_time <= ?",
                (now,)
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                if d.get("parent_ids"):
                    d["parent_ids"] = json.loads(d["parent_ids"])
                result.append(d)
            return result

    async def get_idle_fungi_in_dish(self, dish_id: int, count: int = 2) -> List[Dict[str, Any]]:
        """获取培养皿中处于 idle 状态的真菌"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """SELECT * FROM fungi 
                   WHERE location = ? AND status = 'idle' 
                   ORDER BY RANDOM() LIMIT ?""",
                (str(dish_id), count)
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                if d.get("parent_ids"):
                    d["parent_ids"] = json.loads(d["parent_ids"])
                result.append(d)
            return result


# 全局数据库实例
db = Database()