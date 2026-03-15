from typing import Dict, Any
from app.adapters.base import BrokerAdapter
from app.adapters.mock import MockAdapter
from app.adapters.okx import OKXAdapter
from app.adapters.guojin import GuojinAdapter
from app.adapters.moomoo import MoomooAdapter

class AdapterFactory:
    """适配器工厂"""

    _adapters = {
        "mock": MockAdapter,
        "okx": OKXAdapter,
        "guojin": GuojinAdapter,
        "moomoo": MoomooAdapter,
    }

    @classmethod
    def create(cls, broker: str, config: Dict[str, Any]) -> BrokerAdapter:
        adapter_class = cls._adapters.get(broker)
        if not adapter_class:
            raise ValueError(f"Unknown broker: {broker}")
        return adapter_class(config)
