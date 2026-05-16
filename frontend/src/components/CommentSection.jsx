import { useState } from "react";
import { useAuth } from "../api/hooks/useAuth.js";
import { useComments, useDeleteComment, usePostComment } from "../api/hooks/useComments.js";
import { relativeTime } from "../utils/relativeTime.js";
import "./CommentSection.css";

export default function CommentSection({ taskId }) {
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(taskId);
  const postComment = usePostComment(taskId);
  const deleteComment = useDeleteComment(taskId);

  const submit = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    setNotice("");
    await postComment.mutateAsync(body);
    setBody("");
    setNotice("Comment posted successfully.");
  };

  return (
    <section className="comments">
      <h2>Comments</h2>
      {isLoading ? <p className="loading-state"><span className="spinner" />Loading comments...</p> : (
        <div className="comments__list">
          {comments.map((comment) => (
            <article className="comment" key={comment.id}>
              <div className="comment__avatar">{initials(comment.author_username)}</div>
              <div className="comment__body">
                <header>
                  <strong>{comment.author_username || "Unknown"}</strong>
                  <span>{relativeTime(comment.created_at)}</span>
                  {comment.author_id === user?.id && (
                    <button
                      type="button"
                      aria-label="Delete comment"
                      className="comment__trash"
                      onClick={() => deleteComment.mutate(comment.id)}
                    >
                      ×
                    </button>
                  )}
                </header>
                <p>{comment.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      <form className="comments__form" onSubmit={submit}>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows="4" placeholder="Write a comment..." />
        {notice && <p className="notice success">{notice}</p>}
        <button className="button button--loading" disabled={postComment.isPending}>
          {postComment.isPending && <span className="spinner" />}
          {postComment.isPending ? "Posting..." : "Post"}
        </button>
      </form>
    </section>
  );
}

function initials(name = "?") {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
