import asyncio
import json
import hmac
import base64
from typing import List, Dict, Any, Callable
import httpx
from datetime import datetime
from app.adapters.base import BrokerAdapter
from app.adapters.exceptions import BrokerAPIError
from app.models.schemas import (
    TickData, OrderData, PositionData, AccountData,
    OrderSide, OrderType, OrderStatus, KlineData
)


class OKXLiveAdapter(BrokerAdapter):
    """OKX 真实交易适配器"""

    BASE_URL = "https://www.okx.com"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        self.secret_key = config.get("secret_key", "")
        self.passphrase = config.get("passphrase", "")
        self.client = httpx.AsyncClient(base_url=self.BASE_URL, timeout=10.0)

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
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        try:
            response = await self.client.get("/api/v5/public/time")
            self.connected = response.status_code == 200
            if self.connected:
                log_service.log(LogLevel.INFO, "adapter:okx", "OKX 适配器连接成功")
            else:
                log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 适配器连接失败: HTTP {response.status_code}")
            return self.connected
        except Exception as e:
            self.connected = False
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 适配器连接异常: {e}")
            return False

    async def disconnect(self) -> bool:
        """断开连接"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        await self.client.aclose()
        self.connected = False
        log_service.log(LogLevel.INFO, "adapter:okx", "OKX 适配器已断开连接")
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
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        try:
            import websockets
            async with websockets.connect("wss://ws.okx.com:8443/ws/v5/public") as ws:
                subscribe_msg = {
                    "op": "subscribe",
                    "args": [{"channel": "tickers", "instId": symbol} for symbol in symbols]
                }
                await ws.send(json.dumps(subscribe_msg))
                log_service.log(LogLevel.INFO, "adapter:okx", f"OKX 行情订阅成功: {symbols}")

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
        except Exception as e:
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 行情订阅异常: {symbols}, 错误: {e}")

    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """下单

        注意：OKX市价单买入时，sz参数表示花费的金额（USDT）
              市价单卖出时，sz参数表示卖出的数量（BTC）
        """
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        path = "/api/v5/trade/order"
        side_str = "buy" if side == OrderSide.BUY else "sell"
        order_type_str = "limit" if order_type == OrderType.LIMIT else "market"

        body_data = {
            "instId": symbol,
            "tdMode": "cash",
            "side": side_str,
            "ordType": order_type_str,
            "sz": str(quantity),
        }

        # 市价买入：sz表示花费金额，需要转换
        if order_type == OrderType.MARKET and side == OrderSide.BUY:
            # 获取当前价格估算金额
            tick = await self.get_tick(symbol)
            amount = quantity * tick.last_price
            body_data["sz"] = str(amount)

        if price and order_type == OrderType.LIMIT:
            body_data["px"] = str(price)

        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)
        response = await self.client.post(path, content=body, headers=headers)
        data = response.json()

        if data["code"] != "0":
            error_msg = f"OKX API Error - Code: {data.get('code')}, Msg: {data.get('msg')}, Data: {data.get('data')}"
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 下单失败: {error_msg}")
            raise BrokerAPIError(error_msg)

        order_id = data["data"][0]["ordId"]
        log_service.log(LogLevel.INFO, "adapter:okx", f"OKX 下单成功: {symbol} {side_str} {quantity} @ {price or '市价'}, 订单ID: {order_id}")
        return order_id

    async def cancel_order(self, order_id: str) -> bool:
        """撤单"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        path = "/api/v5/trade/cancel-order"
        body_data = {"ordId": order_id}
        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)
        response = await self.client.post(path, content=body, headers=headers)
        data = response.json()
        success = data["code"] == "0"
        if success:
            log_service.log(LogLevel.INFO, "adapter:okx", f"OKX 撤单成功: {order_id}")
        else:
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 撤单失败: {order_id}, 错误: {data.get('msg')}")
        return success

    async def get_order(self, order_id: str, symbol: str | None = None) -> OrderData:
        """查询订单"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        path = f"/api/v5/trade/order?ordId={order_id}"
        if symbol:
            path += f"&instId={symbol}"
        headers = self._get_headers("GET", path)
        response = await self.client.get(path, headers=headers)
        data = response.json()

        if data["code"] != "0" or not data["data"]:
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 查询订单失败: {order_id}, 错误: {data.get('msg')}")
            raise ValueError(f"Failed to get order: {data.get('msg')}")

        order = data["data"][0]
        status_map = {
            "live": OrderStatus.PENDING,
            "partially_filled": OrderStatus.PARTIAL,
            "filled": OrderStatus.FILLED,
            "canceled": OrderStatus.CANCELLED,
        }

        # 处理价格字段：市价单px为空，使用avgPx（成交均价）
        px = order.get("px") or order.get("avgPx") or "0"
        price = float(px) if px else 0.0

        return OrderData(
            order_id=order["ordId"],
            symbol=order["instId"],
            side=OrderSide.BUY if order["side"] == "buy" else OrderSide.SELL,
            type=OrderType.LIMIT if order["ordType"] == "limit" else OrderType.MARKET,
            quantity=float(order["sz"]),
            price=price,
            status=status_map.get(order["state"], OrderStatus.PENDING)
        )

    async def get_account(self) -> AccountData:
        """获取账户信息"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        path = "/api/v5/account/balance"
        headers = self._get_headers("GET", path)
        response = await self.client.get(path, headers=headers)
        data = response.json()

        if data["code"] != "0" or not data["data"]:
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 获取账户信息失败: {data.get('msg')}")
            raise ValueError(f"Failed to get account: {data.get('msg')}")

        account = data["data"][0]
        total_eq = float(account.get("totalEq", 0))
        log_service.log(LogLevel.INFO, "adapter:okx", f"OKX 获取账户信息成功: 总资产 ${total_eq:.2f}")
        return AccountData(
            broker="okx",
            balance=total_eq,
            available=total_eq,
            frozen=0.0
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表（现货交易返回各币种余额）"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        path = "/api/v5/account/balance"
        headers = self._get_headers("GET", path)
        response = await self.client.get(path, headers=headers)
        data = response.json()

        if data["code"] != "0":
            log_service.log(LogLevel.ERROR, "adapter:okx", f"OKX 获取持仓列表失败: {data.get('msg')}")
            raise ValueError(f"Failed to get positions: {data.get('msg')}")

        # 从数据库加载持仓成本
        from app.core.database import AsyncSessionLocal
        from app.repositories.position_repo import PositionRepository
        async with AsyncSessionLocal() as session:
            repo = PositionRepository(session)
            db_positions = await repo.get_all(broker="okx")

        # 构建成本价映射
        cost_map = {p.symbol: p.avg_price for p in db_positions}

        positions = []
        for account in data.get("data", []):
            for detail in account.get("details", []):
                balance = float(detail.get("cashBal", 0))
                if balance > 0 and detail["ccy"] != "USDT":
                    try:
                        symbol = f"{detail['ccy']}-USDT"
                        tick = await self.get_tick(symbol)

                        # 使用数据库中的成本价，如果没有则使用当前价
                        avg_price = cost_map.get(symbol, tick.last_price)
                        unrealized_pnl = (tick.last_price - avg_price) * balance

                        positions.append(PositionData(
                            symbol=symbol,
                            quantity=balance,
                            avg_price=avg_price,
                            unrealized_pnl=unrealized_pnl
                        ))
                    except Exception as e:
                        log_service.log(LogLevel.WARNING, "adapter:okx", f"获取 {symbol} 行情失败: {e}")
        log_service.log(LogLevel.INFO, "adapter:okx", f"OKX 获取持仓列表成功: {len(positions)} 个持仓")
        return positions

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 100
    ) -> List[KlineData]:
        """获取历史K线数据

        注意：OKX API返回最新的数据，暂不支持精确的时间范围查询
        """
        path = f"/api/v5/market/candles?instId={symbol}&bar={interval}&limit={min(limit, 100)}"
        response = await self.client.get(path)
        data = response.json()

        if data["code"] != "0":
            raise BrokerAPIError(f"获取K线失败: {data.get('msg')}")

        klines = []
        for candle in data["data"]:
            klines.append(KlineData(
                broker="okx",
                symbol=symbol,
                timestamp=datetime.fromtimestamp(int(candle[0]) / 1000),
                open=float(candle[1]),
                high=float(candle[2]),
                low=float(candle[3]),
                close=float(candle[4]),
                volume=float(candle[5])
            ))

        return sorted(klines, key=lambda x: x.timestamp)
