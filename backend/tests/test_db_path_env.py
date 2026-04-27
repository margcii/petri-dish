"""Database 路径环境变量测试"""
import os
import importlib
import pytest


def test_default_path_when_env_unset(monkeypatch):
    monkeypatch.delenv("PETRI_DB_PATH", raising=False)
    import database
    importlib.reload(database)
    assert database.db.db_path == "petri_dish.db"


def test_path_from_env(monkeypatch, tmp_path):
    custom_path = str(tmp_path / "custom.db")
    monkeypatch.setenv("PETRI_DB_PATH", custom_path)
    import database
    importlib.reload(database)
    assert database.db.db_path == custom_path


def test_explicit_path_overrides_env(monkeypatch):
    monkeypatch.setenv("PETRI_DB_PATH", "/should/not/use.db")
    import database
    importlib.reload(database)
    explicit = database.Database(db_path="explicit.db")
    assert explicit.db_path == "explicit.db"
