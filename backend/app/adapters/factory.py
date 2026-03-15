from typing import Dict, Any
from app.adapters.base import BrokerAdapter
from app.adapters.mock import MockAdapter
from app.core.config import TradingMode


class AdapterFactory:
    """适配器工厂 - 三层架构：Mock/Paper/Live"""

    @classmethod
    def create(
        cls,
        broker: str,
        config: Dict[str, Any],
        mode: TradingMode = TradingMode.MOCK
    ) -> BrokerAdapter:
        """创建适配器实例"""

        # Mock 模式：统一使用 MockAdapter
        if mode == TradingMode.MOCK:
            return MockAdapter(config)

        # Live 模式：加载平台的 LiveAdapter
        if mode == TradingMode.LIVE:
            return cls._create_live_adapter(broker, config)

        # Paper 模式：加载平台的 PaperAdapter
        if mode == TradingMode.PAPER:
            return cls._create_paper_adapter(broker, config)

        raise ValueError(f"Unknown trading mode: {mode}")

    @classmethod
    def _create_live_adapter(cls, broker: str, config: Dict[str, Any]) -> BrokerAdapter:
        """创建 Live 适配器"""
        if broker == "okx":
            from app.adapters.okx import OKXLiveAdapter
            return OKXLiveAdapter(config)
        elif broker == "moomoo":
            from app.adapters.moomoo import MoomooLiveAdapter
            return MoomooLiveAdapter(config)
        elif broker == "guojin":
            from app.adapters.guojin import GuojinLiveAdapter
            return GuojinLiveAdapter(config)
        else:
            raise ValueError(f"Unknown broker: {broker}")

    @classmethod
    def _create_paper_adapter(cls, broker: str, config: Dict[str, Any]) -> BrokerAdapter:
        """创建 Paper 适配器"""
        if broker == "okx":
            from app.adapters.okx import OKXPaperAdapter
            return OKXPaperAdapter(config)
        elif broker == "moomoo":
            raise NotImplementedError(f"Paper trading not supported for {broker}")
        elif broker == "guojin":
            raise NotImplementedError(f"Paper trading not supported for {broker}")
        else:
            raise ValueError(f"Unknown broker: {broker}")
