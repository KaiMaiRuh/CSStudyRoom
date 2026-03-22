import React, { useEffect, useMemo, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import {
  FaUserCircle,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaLink,
  FaImage,
  FaPaperPlane,
} from 'react-icons/fa';
import './QAPostDetail.css';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import {
  addQaPostComment,
  subscribeQaPost,
  subscribeQaPostComments,
  subscribeQaPostLikeStatus,
  toggleQaPostLike,
} from './qaPostApi';

const QAPostDetail = ({ post, onBack }) => {
  const [commentText, setCommentText] = useState('');
  const [livePost, setLivePost] = useState(null);
  const [liveComments, setLiveComments] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeBusy, setIsLikeBusy] = useState(false);
  const [isSendBusy, setIsSendBusy] = useState(false);
  const { user } = useAuth();

  const postId = post?.id ?? null;

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (!postId) return;

    const { db } = getFirebaseServices();
    const unsubs = [];

    unsubs.push(
      subscribeQaPost(
        db,
        postId,
        (data) => setLivePost(data),
        (err) => console.error('Failed to subscribe qaPost', err)
      )
    );

    unsubs.push(
      subscribeQaPostComments(
        db,
        postId,
        (next) => setLiveComments(next),
        (err) => console.error('Failed to subscribe qaPost comments', err)
      )
    );

    if (user?.uid) {
      unsubs.push(
        subscribeQaPostLikeStatus(
          db,
          postId,
          user.uid,
          (liked) => setIsLiked(liked),
          (err) => console.error('Failed to subscribe qaPost like status', err)
        )
      );
    } else {
      setIsLiked(false);
    }

    return () => {
      unsubs.forEach((u) => {
        if (typeof u === 'function') u();
      });
    };
  }, [postId, user?.uid]);

  const mergedPost = useMemo(() => {
    if (!post) return null;
    if (!livePost) return post;
    return {
      ...post,
      ...livePost,
      likes: livePost.likeCount ?? livePost.likes ?? post.likes,
      comments: livePost.commentCount ?? livePost.comments ?? post.comments,
      shares: livePost.shareCount ?? livePost.shares ?? post.shares,
    };
  }, [post, livePost]);

  const authorName = mergedPost?.user?.name ?? mergedPost?.authorName ?? mergedPost?.author ?? 'Unknown';
  const postedLabel = mergedPost?.minutesAgo != null ? `posted ${mergedPost.minutesAgo} mins ago` : '';
  const bodyText = mergedPost?.description ?? mergedPost?.question ?? '';

  const comments = useMemo(() => {
    if (Array.isArray(liveComments)) {
      return liveComments.map((c) => ({
        id: c.id,
        user: { name: c.authorName || 'Unknown' },
        text: c.text || '',
        parentId: c.parentId ?? null,
        createdAt: c.createdAt ?? null,
      }));
    }

    if (Array.isArray(mergedPost?.commentList)) return mergedPost.commentList;

    return [
      {
        id: 'c1',
        user: { name: 'ก้อนเก๋ ก๊อดอย' },
        text: 'อันนั้นก็ทำไม่เป็นครับ สู้ๆนะครับ',
      },
      {
        id: 'c2',
        user: { name: 'นินจาเต่า' },
        text: 'ลองไปดูในเว็บ ieiei.com นะคะ เหมือนจะมีอยู่',
        replies: [
          {
            id: 'c2r1',
            user: { name: 'นินจาเต่า' },
            text: 'ขอบคุณครับพี่',
          },
        ],
      },
      {
        id: 'c3',
        user: { name: 'ผมชอบยาสครับ' },
        text: 'อ๋อเข้า ข้อเดียวกับผมเลยครับ',
      },
    ];
  }, [liveComments, mergedPost?.commentList]);

  if (!post) return null;

  const handleToggleLike = async () => {
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      setIsLikeBusy(true);
      const { db } = getFirebaseServices();
      await toggleQaPostLike({
        db,
        postId,
        uid: user.uid,
        authorName: user.displayName || user.email || 'User',
      });
    } catch (err) {
      console.error('Failed to toggle like', err);
      alert(err?.message || 'Failed to like post');
    } finally {
      setIsLikeBusy(false);
    }
  };

  const handleSendComment = async () => {
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) {
      alert('Please sign in to comment');
      return;
    }

    try {
      setIsSendBusy(true);
      const { db } = getFirebaseServices();
      await addQaPostComment({
        db,
        postId,
        uid: user.uid,
        authorName: user.displayName || user.email || 'User',
        text: commentText,
      });
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment', err);
      alert(err?.message || 'Failed to add comment');
    } finally {
      setIsSendBusy(false);
    }
  };

  return (
    <div className="qa-post-detail">
      <button className="qa-back" type="button" onClick={onBack} aria-label="Back">
        <MdArrowBack size={24} />
      </button>

      <div className="qa-detail-scroll">
        <div className="qa-detail-card">
          <div className="qa-detail-header">
            <div className="qa-avatar" aria-hidden="true">
              <FaUserCircle size={42} />
            </div>
            <div className="qa-meta">
              <div className="qa-author">{authorName}</div>
              <div className="qa-posted">{postedLabel}</div>
            </div>
          </div>

          <div className="qa-detail-body">
            <div className="qa-body-text">{bodyText}</div>

            <div className="qa-media-row" aria-hidden="true">
              <div className="qa-media" />
              <div className="qa-media" />
            </div>
          </div>

          <div className="qa-actions" onClick={(e) => e.stopPropagation()}>
            <span
              className={`qa-action ${isLiked ? 'qa-action-liked' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Like"
              aria-pressed={isLiked}
              onClick={handleToggleLike}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleToggleLike();
              }}
              style={isLikeBusy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <FaThumbsUp />
              <span className="qa-action-count">{mergedPost?.likes ?? 0}</span>
            </span>
            <span className="qa-action" role="button" tabIndex={0} aria-label="Comment">
              <FaComment />
              <span className="qa-action-count">{mergedPost?.comments ?? 0}</span>
            </span>
            <span className="qa-action" role="button" tabIndex={0} aria-label="Share">
              <FaShare />
            </span>
          </div>
        </div>

        <div className="qa-comments-title">All comments</div>

        <div className="qa-comments">
          {comments.map((c) => (
            <div key={c.id} className="qa-comment">
              <div className="qa-comment-avatar" aria-hidden="true">
                <FaUserCircle size={34} />
              </div>
              <div className="qa-comment-content">
                <div className="qa-comment-name">{c.user?.name}</div>
                <div className="qa-comment-text">{c.text}</div>

                {Array.isArray(c.replies) && c.replies.length > 0 && (
                  <div className="qa-replies">
                    {c.replies.map((r) => (
                      <div key={r.id} className="qa-comment qa-reply">
                        <div className="qa-comment-avatar" aria-hidden="true">
                          <FaUserCircle size={28} />
                        </div>
                        <div className="qa-comment-content">
                          <div className="qa-comment-name">{r.user?.name}</div>
                          <div className="qa-comment-text">{r.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="qa-composer" onClick={(e) => e.stopPropagation()}>
        <input
          className="qa-input"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Comment..."
          type="text"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendComment();
          }}
        />
        <button className="qa-icon-btn" type="button" aria-label="Attach link">
          <FaLink />
        </button>
        <button className="qa-icon-btn" type="button" aria-label="Attach image">
          <FaImage />
        </button>
        <button
          className="qa-send"
          type="button"
          aria-label="Send"
          onClick={handleSendComment}
          disabled={isSendBusy}
          style={isSendBusy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default QAPostDetail;
