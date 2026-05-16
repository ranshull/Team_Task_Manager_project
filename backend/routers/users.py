from beanie.odm.fields import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import require_admin
from models import User
from schemas.user import UserOut, UserRoleUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(_: User = Depends(require_admin)) -> list[User]:
    return await User.find_all().sort("username").to_list()


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: User = Depends(require_admin),
) -> User:
    user = await User.get(PydanticObjectId(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.role == "admin" and user.role != "admin":
        existing_admins = await User.find(User.role == "admin").to_list()
        for admin in existing_admins:
            if admin.id != user.id:
                admin.role = "member"
                await admin.save()
    elif user.id == current_user.id and payload.role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promote another user to transfer admin access")
    user.role = payload.role
    await user.save()
    return user
