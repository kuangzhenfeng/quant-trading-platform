from fastapi import APIRouter, HTTPException
from app.services.account import account_service
from app.models.schemas import BrokerConfig

router = APIRouter(prefix="/api/account", tags=["account"])


@router.post("/")
async def add_account(config: BrokerConfig):
    """添加账户"""
    await account_service.add_account(config)
    return {"success": True}


@router.delete("/{account_id}")
async def remove_account(account_id: str):
    """删除账户"""
    success = await account_service.remove_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="账户不存在")
    return {"success": True}


@router.get("/")
async def list_accounts():
    """列出所有账户"""
    accounts = await account_service.list_accounts()
    return {"accounts": accounts}


@router.put("/{account_id}/active")
async def set_active(account_id: str, active: bool):
    """设置账户激活状态"""
    success = await account_service.set_active(account_id, active)
    if not success:
        raise HTTPException(status_code=404, detail="账户不存在")
    return {"success": True}
