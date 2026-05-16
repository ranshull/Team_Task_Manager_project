from beanie.operators import Or
from beanie.odm.fields import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt

from config import get_settings
from dependencies import get_current_user
from models import User
from routers.settings import get_signup_setting
from schemas.user import RefreshRequest, Token, UserCreate, UserOut, UserProfileUpdate
from security import create_access_token, create_refresh_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate) -> User:
    existing = await User.find_one(Or(User.email == payload.email, User.username == payload.username))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or username already exists")
    has_users = await User.find_all().limit(1).to_list()
    signup_setting = await get_signup_setting()
    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role="admin" if not has_users else payload.role if signup_setting.allow_signup_role_selection else "member",
    )
    await user.insert()
    return user


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends()) -> Token:
    user = await User.find_one(Or(User.email == form.username, User.username == form.username))
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    subject = str(user.id)
    return Token(access_token=create_access_token(subject), refresh_token=create_refresh_token(subject))


@router.post("/refresh")
async def refresh(payload: RefreshRequest) -> dict[str, str]:
    settings = get_settings()
    try:
        data = jwt.decode(payload.refresh_token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if data.get("type") != "refresh" or data.get("sub") is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        user = await User.get(PydanticObjectId(data["sub"]))
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return {"access_token": create_access_token(str(user.id)), "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(payload: UserProfileUpdate, current_user: User = Depends(get_current_user)) -> User:
    existing = await User.find_one(User.username == payload.username)
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    current_user.username = payload.username
    current_user.phone = payload.phone
    await current_user.save()
    return current_user
