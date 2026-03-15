"""交易适配器异常定义"""


class BrokerAPIError(Exception):
    """券商API业务错误（如订单金额不足、余额不足等）"""
    pass


class BrokerConnectionError(Exception):
    """券商连接错误"""
    pass
