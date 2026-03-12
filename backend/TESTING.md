# Postman 测试指南

## 启动服务

在 VS Code 终端中执行：
```powershell
cd backend
python run.py
```

或者双击运行 `start_server.bat`

## 测试步骤

### 1. 注册用户
**POST** `http://127.0.0.1:8000/register`
```json
{
    "name": "test_user"
}
```

### 2. 创建培养皿
**POST** `http://127.0.0.1:8000/create_dish`
```json
{
    "user_id": 1,
    "name": "我的培养皿"
}
```

### 3. 上传文本生成真菌（核心测试）
**POST** `http://127.0.0.1:8000/upload`
```json
{
    "text": "这是一个测试文本",
    "user_id": 1
}
```

**预期返回：**
```json
{
    "code": 200,
    "message": "真菌生成成功",
    "data": {
        "fungus_id": 1,
        "text": "这是一个测试文本",
        "image_id": "03",  // 随机 01-50
        "location": "空气"
    }
}
```

### 4. 查看培养皿内容
**GET** `http://127.0.0.1:8000/get_dish/{dish_id}`

---

## 检查点
- [ ] 返回的 `image_id` 是随机的 (01-50)
- [ ] 数据库记录了 `fungus_id`, `text`, `image_id`, `location`