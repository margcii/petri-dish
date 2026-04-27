"""StaticFiles 挂载与路由优先级测试"""
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    # 准备假的 frontend/dist
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text("<html><body>petri</body></html>")
    (dist_dir / "favicon.ico").write_bytes(b"\x00\x00")

    # 让 api.py 知道去哪儿找静态产物
    monkeypatch.setenv("PETRI_FRONTEND_DIST", str(dist_dir))
    monkeypatch.setenv("PETRI_DB_PATH", str(tmp_path / "test.db"))

    import importlib
    import api
    importlib.reload(api)
    return TestClient(api.app)


def test_root_serves_index_html(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "petri" in resp.text


def test_health_still_returns_json(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy"}


def test_api_info_returns_version(client):
    resp = client.get("/api/info")
    assert resp.status_code == 200
    assert resp.json()["version"] == "0.1.0"


def test_static_asset_served(client):
    resp = client.get("/favicon.ico")
    assert resp.status_code == 200
    assert resp.content == b"\x00\x00"
