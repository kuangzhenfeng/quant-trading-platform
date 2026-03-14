from typing import Dict, Any
from app.adapters.base import BrokerAdapter
from app.adapters.mock import MockAdapter

class AdapterFactory:
    """适配器工厂"""

    _adapters = {
        "mock": MockAdapter,
    }

    @classmethod
    def create(cls, broker: str, config: Dict[str, Any]) -> BrokerAdapter:
        adapter_class = cls._adapters.get(broker)
        if not adapter_class:
            raise ValueError(f"Unknown broker: {broker}")
        return adapter_class(config)
