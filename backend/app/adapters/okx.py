import asyncio
import json
import hmac
import base64
from typing import List, Dict, Any, Callable
import httpx
from datetime import datetime
from app.adapters.base import BrokerAdapter
from app.models.schemas import (
    TickData, OrderData, PositionData, AccountData,
    OrderSide, OrderType, OrderStatus
)


class OKXAdapter(BrokerAdapter):
    """OKX 交易所适配器"""

    BASE_URL = "https://www.okx.com"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        self.secret_key = config.get("secret_key", "")
        self.passphrase = config.get("passphrase", "")
        self.client = httpx.AsyncClient(base_url=self.BASE_URL, timeout=10.0)

        # 判断是否使用真实 API
        self.use_real_api = bool(
            self.api_key and
            self.secret_key and
            self.passphrase
        )

    def _sign(self, timestamp: str, method: str, path: str, body: str = "") -> str:
        """生成 OKX API 签名"""
        message = timestamp + method + path + body
        mac = hmac.new(
            self.secret_key.encode(),
            message.encode(),
            digestmod='sha256'
        )
        return base64.b64encode(mac.digest()).decode()

    def _get_headers(self, method: str, path: str, body: str = "") -> dict:
        """生成请求头"""
        timestamp = datetime.utcnow().isoformat()[:-3] + 'Z'
        return {
            'OK-ACCESS-KEY': self.api_key,
            'OK-ACCESS-SIGN': self._sign(timestamp, method, path, body),
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': self.passphrase,
            'Content-Type': 'application/json'
        }

    async def connect(self) -> bool:
        """建立连接"""
        try:
            response = await self.client.get("/api/v5/public/time")
            self.connected = response.status_code == 200
            return self.connected
        except Exception:
            self.connected = False
            return False

    async def disconnect(self) -> bool:
        """断开连接"""
        await self.client.aclose()
        self.connected = False
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
        response = await self.client.get(f"/api/v5/market/ticker?instId={symbol}")
        data = response.json()

        if data["code"] != "0" or not data["data"]:
            raise ValueError(f"Failed to get ticker: {data.get('msg')}")

        ticker = data["data"][0]
        return TickData(
            broker="okx",
            symbol=symbol,
            last_price=float(ticker["last"]),
            volume=int(float(ticker.get("vol24h", 0))),
            timestamp=datetime.now()
        )

    async def subscribe_market_data(self, symbols: List[str], callback: Callable):
        """订阅实时行情推送（WebSocket）"""
        if not self.use_real_api:
            return

        try:
            import websockets
            async with websockets.connect("wss://ws.okx.com:8443/ws/v5/public") as ws:
                # 订阅行情
                subscribe_msg = {
                    "op": "subscribe",
                    "args": [{"channel": "tickers", "instId": symbol} for symbol in symbols]
                }
                await ws.send(json.dumps(subscribe_msg))

                # 持续接收数据
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("event") == "subscribe":
                        continue
                    if "data" in data:
                        for ticker in data["data"]:
                            tick = TickData(
                                broker="okx",
                                symbol=ticker["instId"],
                                last_price=float(ticker["last"]),
                                volume=int(float(ticker.get("vol24h", 0))),
                                timestamp=datetime.now()
                            )
                            await callback(tick)
        except Exception:
            pass

    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """下单"""
        if self.use_real_api:
            return await self._place_order_real(symbol, side, order_type, quantity, price)
        return self._place_order_mock(symbol, side, order_type, quantity, price)

    async def _place_order_real(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """真实下单"""
        path = "/api/v5/trade/order"
        body_data = {
            "instId": symbol,
            "tdMode": "cash",
            "side": "buy" if side == OrderSide.BUY else "sell",
            "ordType": "limit" if order_type == OrderType.LIMIT else "market",
            "sz": str(quantity),
        }
        if price and order_type == OrderType.LIMIT:
            body_data["px"] = str(price)

        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)
        response = await self.client.post(path, content=body, headers=headers)
        data = response.json()

        if data["code"] != "0":
            error_msg = f"OKX API Error - Code: {data.get('code')}, Msg: {data.get('msg')}, Data: {data.get('data')}"
            print(f"[OKX] {error_msg}")
            raise ValueError(error_msg)

        return data["data"][0]["ordId"]

    def _place_order_mock(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """Mock 下单"""
        import uuid
        return f"okx_{uuid.uuid4().hex[:16]}"

    async def cancel_order(self, order_id: str) -> bool:
        """撤单"""
        if self.use_real_api:
            return await self._cancel_order_real(order_id)
        return self._cancel_order_mock(order_id)

    async def _cancel_order_real(self, order_id: str) -> bool:
        """真实撤单"""
        path = "/api/v5/trade/cancel-order"
        body_data = {"ordId": order_id}
        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)
        response = await self.client.post(path, content=body, headers=headers)
        data = response.json()
        return data["code"] == "0"

    def _cancel_order_mock(self, order_id: str) -> bool:
        """Mock 撤单"""
        return True

    async def get_order(self, order_id: str, symbol: str | None = None) -> OrderData:
        """查询订单"""
        if self.use_real_api:
            return await self._get_order_real(order_id, symbol)
        return self._get_order_mock(order_id)

    async def _get_order_real(self, order_id: str, symbol: str | None = None) -> OrderData:
        """真实查询订单"""
        path = f"/api/v5/trade/order?ordId={order_id}"
        if symbol:
            path += f"&instId={symbol}"
        headers = self._get_headers("GET", path)
        response = await self.client.get(path, headers=headers)
        data = response.json()

        if data["code"] != "0" or not data["data"]:
            raise ValueError(f"Failed to get order: {data.get('msg')}")

        order = data["data"][0]
        status_map = {
            "live": OrderStatus.PENDING,
            "partially_filled": OrderStatus.PARTIAL,
            "filled": OrderStatus.FILLED,
            "canceled": OrderStatus.CANCELLED,
        }
        return OrderData(
            order_id=order["ordId"],
            symbol=order["instId"],
            side=OrderSide.BUY if order["side"] == "buy" else OrderSide.SELL,
            type=OrderType.LIMIT if order["ordType"] == "limit" else OrderType.MARKET,
            quantity=float(order["sz"]),
            price=float(order.get("px", 0)),
            status=status_map.get(order["state"], OrderStatus.PENDING)
        )

    def _get_order_mock(self, order_id: str) -> OrderData:
        """Mock 查询订单"""
        return OrderData(
            order_id=order_id,
            symbol="BTC-USDT",
            side=OrderSide.BUY,
            type=OrderType.LIMIT,
            quantity=0.01,
            price=70000.0,
            status=OrderStatus.FILLED
        )

    async def get_account(self) -> AccountData:
        """获取账户信息"""
        if self.use_real_api:
            return await self._get_account_real()
        return self._get_account_mock()

    async def _get_account_real(self) -> AccountData:
        """真实获取账户信息"""
        path = "/api/v5/account/balance"
        headers = self._get_headers("GET", path)
        response = await self.client.get(path, headers=headers)
        data = response.json()

        if data["code"] != "0" or not data["data"]:
            raise ValueError(f"Failed to get account: {data.get('msg')}")

        account = data["data"][0]
        total_eq = float(account.get("totalEq", 0))
        return AccountData(
            broker="okx",
            balance=total_eq,
            available=total_eq,
            frozen=0.0
        )

    def _get_account_mock(self) -> AccountData:
        """Mock 获取账户信息"""
        return AccountData(
            broker="okx",
            balance=100000.0,
            available=95000.0,
            frozen=5000.0
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表"""
        if self.use_real_api:
            return await self._get_positions_real()
        return self._get_positions_mock()

    async def _get_positions_real(self) -> List[PositionData]:
        """真实获取持仓列表"""
        path = "/api/v5/account/positions"
        headers = self._get_headers("GET", path)
        response = await self.client.get(path, headers=headers)
        data = response.json()

        if data["code"] != "0":
            raise ValueError(f"Failed to get positions: {data.get('msg')}")

        positions = []
        for pos in data.get("data", []):
            if float(pos.get("pos", 0)) != 0:
                positions.append(PositionData(
                    symbol=pos["instId"],
                    quantity=float(pos["pos"]),
                    avg_price=float(pos.get("avgPx", 0)),
                    unrealized_pnl=float(pos.get("upl", 0))
                ))
        return positions

    def _get_positions_mock(self) -> List[PositionData]:
        """Mock 获取持仓列表"""
        return [
            PositionData(
                symbol="BTC-USDT",
                quantity=0.5,
                avg_price=68000.0,
                unrealized_pnl=1500.0
            )
        ]
