import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_websocket_connection():
    with client.websocket_connect("/ws/market/test_client") as websocket:
        websocket.send_json({"action": "unknown", "data": "hello"})
        data = websocket.receive_json()
        assert data["type"] == "echo"
