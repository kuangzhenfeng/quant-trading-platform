from typing import Dict, Any
from .live import OKXLiveAdapter


class OKXPaperAdapter(OKXLiveAdapter):
    """OKX 模拟盘适配器（使用官方 Sandbox API）"""

    def _get_headers(self, method: str, path: str, body: str = "") -> dict:
        """生成请求头，添加模拟盘标识"""
        headers = super()._get_headers(method, path, body)
        headers['x-simulated-trading'] = '1'
        return headers
