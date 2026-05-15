from fastapi import APIRouter, Depends, HTTPException, status
from beanie.odm.fields import PydanticObjectId

from dependencies import get_current_user, get_project_or_404, get_task_or_404, require_project_member
from models import Comment, User
from schemas.comment import CommentCreate, CommentOut

router = APIRouter(tags=["comments"])


async def to_comment_out(comment: Comment) -> CommentOut:
    author = await User.get(comment.author_id)
    return CommentOut(
        id=comment.id,
        body=comment.body,
        task_id=comment.task_id,
        author_id=comment.author_id,
        author_username=author.username if author else None,
        created_at=comment.created_at,
    )


@router.get("/api/tasks/{task_id}/comments", response_model=list[CommentOut])
async def list_comments(task_id: str, current_user: User = Depends(get_current_user)) -> list[CommentOut]:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_project_member(project, current_user)
    comments = await Comment.find(Comment.task_id == task.id).sort("created_at").to_list()
    return [await to_comment_out(comment) for comment in comments]


@router.post("/api/tasks/{task_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    task_id: str,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
) -> CommentOut:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_project_member(project, current_user)
    comment = Comment(body=payload.body, task_id=task.id, author_id=current_user.id)
    await comment.insert()
    return await to_comment_out(comment)


@router.delete("/api/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)) -> None:
    comment = await Comment.get(PydanticObjectId(comment_id))
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only delete your own comments")
    await comment.delete()
