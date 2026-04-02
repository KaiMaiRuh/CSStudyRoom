import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import {
  FaUserCircle,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaImage,
  FaPaperPlane,
  FaTrashAlt,
} from 'react-icons/fa';
import './QAPostDetail.css';
import ImagePreviewModal from '../../components/common/ImagePreviewModal.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import { imageFileToBase64DataUrl, isDataUrlImage } from '../../utils/imageHelpers.js';
import {
  addQaPostComment,
  deleteQaPostComment,
  subscribeQaPost,
  subscribeQaPostComments,
  subscribeQaPostLikeStatus,
  toggleQaPostLike,
} from '../../api/postService.js';
import { useUserProfiles } from '../../api/userService.js';
import { readActorFromDoc, readQaStats } from '../../api/dbModels.js';

const QAPostDetail = ({ post, onBack, onDelete }) => {
  const [commentText, setCommentText] = useState('');
  const [livePost, setLivePost] = useState(null);
  const [liveComments, setLiveComments] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeBusy, setIsLikeBusy] = useState(false);
  const [isSendBusy, setIsSendBusy] = useState(false);
  const [isImageBusy, setIsImageBusy] = useState(false);
  const [commentImageUrl, setCommentImageUrl] = useState(null);
  const [composerError, setComposerError] = useState('');
  const [previewSrc, setPreviewSrc] = useState(null);
  const { user, profile, isAdmin } = useAuth();

  const imageInputRef = useRef(null);
  const detailScrollRef = useRef(null);
  const shouldAutoScrollRef = useRef(false);
  const previousCommentCountRef = useRef(0);

  const postId = post?.id ?? null;

  const openUserProfile = (uid) => {
    if (!uid) return;
    try {
      window.location.hash = uid === user?.uid ? '/profile' : `/profile/${uid}`;
    } catch {
      // ignore
    }
  };

  // Prevent body scroll when QAPostDetail is active
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousScrollY = window.scrollY || window.pageYOffset || 0;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      window.scrollTo(0, 0);
    }

    const rafId = window.requestAnimationFrame(() => {
      const scroller = detailScrollRef.current;
      if (!scroller) return;
      try {
        scroller.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } catch {
        scroller.scrollTop = 0;
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      try {
        window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
      } catch {
        window.scrollTo(0, previousScrollY);
      }
    };
  }, []);

  useEffect(() => {
    const scroller = detailScrollRef.current;
    if (!scroller) return;
    try {
      scroller.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      scroller.scrollTop = 0;
    }
  }, [postId]);

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
    const stats = readQaStats({ ...post, ...livePost });
    return {
      ...post,
      ...livePost,
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
    };
  }, [post, livePost]);

  const mergedAuthor = useMemo(() => {
    return readActorFromDoc(mergedPost || {}, {
      uid: mergedPost?.user?.uid,
      displayName: mergedPost?.user?.displayName || mergedPost?.user?.name,
      username: mergedPost?.user?.username,
      avatarUrl: mergedPost?.user?.avatar,
    });
  }, [mergedPost]);

  const mergedStats = useMemo(() => readQaStats(mergedPost || {}), [mergedPost]);

  const authorUid = mergedAuthor.uid || null;
  const authorName = mergedAuthor.displayName || 'Unknown';
  const authorLabel = mergedAuthor.username ? `@${mergedAuthor.username}` : authorName;
  const authorAvatar = mergedAuthor.avatarUrl || '';
  const formatPostedTime = (minutesAgo) => {
    if (minutesAgo == null || Number.isNaN(minutesAgo)) return '';
    const mins = Number(minutesAgo);
    if (mins < 60) return `posted ${mins} mins ago`;
    if (mins < 1440) {
      const hours = Math.floor(mins / 60);
      return `posted ${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
    }
    const days = Math.floor(mins / 1440);
    return `posted ${days} ${days === 1 ? 'day' : 'days'} ago`;
  };
  const postedLabel = mergedPost?.minutesAgo != null ? formatPostedTime(mergedPost.minutesAgo) : '';
  const subjectText = mergedPost?.subject || '';
  const questionText = mergedPost?.question || '';
  const descriptionText = mergedPost?.description || '';

  const comments = useMemo(() => {
    if (Array.isArray(liveComments)) {
      return liveComments.map((c) => ({
        id: c.id,
        user: {
          uid: c.authorId || null,
          name: c.authorName || '',
          avatar: c.authorAvatar || '',
        },
        text: c.text || '',
        imageUrl: isDataUrlImage(c.imageUrl) ? c.imageUrl : null,
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

  const commentAuthorIds = useMemo(() => {
    const ids = comments
      .map((c) => c?.user?.uid)
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [comments]);

  const commentAuthorProfiles = useUserProfiles(commentAuthorIds);

  const canDeleteLiveComments = isFirebaseConfigured() && Boolean(postId) && Array.isArray(liveComments) && Boolean(user?.uid);

  useEffect(() => {
    const scrollContainer = detailScrollRef.current;
    if (!scrollContainer) {
      previousCommentCountRef.current = comments.length;
      return;
    }

    const previousCount = previousCommentCountRef.current;
    const nextCount = comments.length;
    const hasNewComments = nextCount > previousCount;
    const distanceFromBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    const isNearBottom = distanceFromBottom < 120;

    if (hasNewComments && (shouldAutoScrollRef.current || isNearBottom)) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth',
      });
    }

    if (shouldAutoScrollRef.current && !hasNewComments) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth',
      });
    }

    shouldAutoScrollRef.current = false;
    previousCommentCountRef.current = nextCount;
  }, [comments]);

  if (!post) return null;

  const handleToggleLike = async () => {
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) {
      alert('Please log in to like posts');
      return;
    }

    try {
      setIsLikeBusy(true);
      const { db } = getFirebaseServices();
      await toggleQaPostLike({
        db,
        postId,
        uid: user.uid,
        authorName: profile?.username ? `@${profile.username}` : (user.displayName || user.email || 'User'),
      });
    } catch (err) {
      console.error('Failed to toggle like', err);
      alert(err?.message || 'Failed to like post');
    } finally {
      setIsLikeBusy(false);
    }
  };

  const handleShare = () => {
    if (!postId) return;
    if (!user?.uid) {
      alert('Please log in to share posts');
      return;
    }
    try {
      window.location.hash = `/groupmessage/share/qa/${postId}`;
    } catch {
      // ignore
    }
  };

  const handleSendComment = async () => {
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) {
      alert('Please log in to comment');
      return;
    }

    const cleanedText = String(commentText || '').trim();
    const hasText = Boolean(cleanedText);
    const hasImage = Boolean(commentImageUrl);
    if (!hasText && !hasImage) {
      setComposerError('Comment cannot be empty');
      return;
    }

    try {
      setComposerError('');
      setIsSendBusy(true);
      shouldAutoScrollRef.current = true;
      const { db } = getFirebaseServices();

      await addQaPostComment({
        db,
        postId,
        uid: user.uid,
        text: cleanedText,
        imageUrl: commentImageUrl,
      });
      setCommentText('');
      setCommentImageUrl(null);
    } catch (err) {
      console.error('Failed to add comment', err);
      setComposerError(err?.message || 'Failed to add comment');
    } finally {
      setIsSendBusy(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!isFirebaseConfigured()) return;
    if (!postId) return;

    const commentId = comment?.id;
    if (!commentId) return;

    const isOwnComment = Boolean(user?.uid && comment?.user?.uid === user.uid);
    if (!isAdmin && !isOwnComment) return;

    const ok = window.confirm('Delete this comment?');
    if (!ok) return;

    try {
      const { db } = getFirebaseServices();
      await deleteQaPostComment({ db, postId, commentId });
    } catch (err) {
      console.error('Failed to delete comment', err);
      alert(err?.message || 'Failed to delete comment');
    }
  };

  const handlePickCommentImage = () => {
    if (isSendBusy || isImageBusy) return;
    setComposerError('');
    imageInputRef.current?.click();
  };

  const handleCommentImageChange = async (e) => {
    const file = e.target.files?.[0];
    // allow selecting the same file again
    e.target.value = '';
    if (!file) return;

    try {
      setComposerError('');
      setIsImageBusy(true);
      const dataUrl = await imageFileToBase64DataUrl(file);
      setCommentImageUrl(dataUrl);
    } catch (err) {
      console.error('Failed to process comment image', err);
      setComposerError(err?.message || 'Failed to process image');
    } finally {
      setIsImageBusy(false);
    }
  };

  return (
    <div className="qa-post-detail">
      {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
     
      {isAdmin && typeof onDelete === 'function' ? (
        <button className="qa-delete" type="button" onClick={() => onDelete()} aria-label="Delete post">
          <FaTrashAlt />
        </button>
      ) : null}

      <div className="qa-detail-scroll" ref={detailScrollRef}>
        <button className="qa-back" type="button" onClick={onBack} aria-label="Back">
        <MdArrowBack size={24} />
      </button>
        <div className="qa-detail-card">
          <div className="qa-detail-header">
            <button
              type="button"
              className="qa-avatar qa-avatar-button"
              aria-label="Open profile"
              onClick={() => {
                if (!authorUid) return;
                try {
                  window.location.hash = authorUid === user?.uid ? '/profile' : `/profile/${authorUid}`;
                } catch {
                  // ignore
                }
              }}
              disabled={!authorUid}
            >
              {authorAvatar ? <img className="qa-avatar-img" src={authorAvatar} alt="" /> : <FaUserCircle size={42} />}
            </button>
            <div className="qa-meta">
              <div className="qa-author">{authorLabel}</div>
              <div className="qa-posted">{postedLabel}</div>
            </div>
          </div>

          <div className="qa-detail-body">
            {subjectText ? <div className="qa-subject-tag">{subjectText}</div> : null}
            {questionText ? <div className="qa-question-text">{questionText}</div> : null}
            {descriptionText ? <div className="qa-body-text">{descriptionText}</div> : null}

            {Array.isArray(mergedPost?.images) && mergedPost.images.length > 0 ? (
              <div className="qa-post-images">
                {mergedPost.images.map((imageUrl, index) => (
                  <button
                    key={index}
                    className="qa-post-image-link"
                    type="button"
                    aria-label={`Open image ${index + 1}`}
                    onClick={() => setPreviewSrc(imageUrl)}
                  >
                    <img className="qa-post-image" src={imageUrl} alt="" />
                  </button>
                ))}
              </div>
            ) : mergedPost?.imageUrl ? (
              <button
                className="qa-post-image-link"
                type="button"
                aria-label="Open image"
                onClick={() => setPreviewSrc(mergedPost.imageUrl)}
              >
                <img className="qa-post-image" src={mergedPost.imageUrl} alt="" />
              </button>
            ) : null}
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
              <span className="qa-action-count">{mergedStats.likes}</span>
            </span>
            <span className="qa-action" role="button" tabIndex={0} aria-label="Comment">
              <FaComment />
              <span className="qa-action-count">{mergedStats.comments}</span>
            </span>
            <span
              className="qa-action"
              role="button"
              tabIndex={0}
              aria-label="Share"
              onClick={handleShare}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleShare();
              }}
            >
              <FaShare />
            </span>
          </div>
        </div>

        <div className="qa-comments-title">All comments</div>

        <div className="qa-comments">
          {comments.map((c) => {
            const profileFromCache = c.user?.uid ? commentAuthorProfiles[c.user.uid] : null;
            const resolvedCommentName = profileFromCache?.username
              ? `@${profileFromCache.username}`
              : (profileFromCache?.displayName || c.user?.name || 'Unknown');
            const resolvedCommentAvatar = profileFromCache?.avatarUrl || c.user?.avatar || '';
            const canDeleteThisComment = canDeleteLiveComments && Boolean(c.id) && (isAdmin || (user?.uid && c.user?.uid === user.uid));

            return (
              <div key={c.id} className="qa-comment">
                <button
                  type="button"
                  className="qa-comment-avatar qa-comment-avatar-btn"
                  aria-label="Open profile"
                  onClick={() => openUserProfile(c.user?.uid)}
                  disabled={!c.user?.uid}
                >
                  {resolvedCommentAvatar ? (
                    <img className="qa-comment-avatar-img" src={resolvedCommentAvatar} alt="" />
                  ) : (
                    <FaUserCircle size={34} />
                  )}
                </button>
                <div className="qa-comment-content">
                  <div className="qa-comment-head">
                    <button
                      type="button"
                      className="qa-comment-name qa-comment-name-btn"
                      onClick={() => openUserProfile(c.user?.uid)}
                      disabled={!c.user?.uid}
                    >
                      {resolvedCommentName}
                    </button>
                    {canDeleteThisComment ? (
                      <button
                        className="qa-comment-delete"
                        type="button"
                        onClick={() => handleDeleteComment(c)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  {c.text ? <div className="qa-comment-text">{c.text}</div> : null}

                  {c.imageUrl ? (
                    <button
                      className="qa-comment-image-link"
                      type="button"
                      aria-label="Open comment image"
                      onClick={() => setPreviewSrc(c.imageUrl)}
                    >
                      <img className="qa-comment-image" src={c.imageUrl} alt="" />
                    </button>
                  ) : null}

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
            );
          })}
        </div>

        {/* Spacer so fixed composer doesn't cover the last comments */}
        <div className="qa-comments-spacer" />
      </div>

      <div className="qa-composer" onClick={(e) => e.stopPropagation()}>
        <input
          className="qa-input"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Comment..."
          type="text"
          onFocus={() => {
            const scroller = detailScrollRef.current;
            if (!scroller) return;
            const savedTop = scroller.scrollTop;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                scroller.scrollTop = savedTop;
              });
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendComment();
          }}
        />

        {commentImageUrl ? (
          <div className="qa-composer-image-thumb-wrapper">
            <button
              className="qa-composer-image-thumb"
              type="button"
              aria-label="Open attached image"
              onClick={() => setPreviewSrc(commentImageUrl)}
            >
              <img className="qa-composer-image-thumb-img" src={commentImageUrl} alt="" />
            </button>
            <button
              className="qa-composer-image-remove"
              type="button"
              aria-label="Remove attached image"
              onClick={() => setCommentImageUrl(null)}
            >
              &times;
            </button>
          </div>
        ) : null}

        <button
          className="qa-icon-btn"
          type="button"
          aria-label="Attach image"
          onClick={handlePickCommentImage}
          disabled={isSendBusy || isImageBusy}
          style={isSendBusy || isImageBusy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        >
          <FaImage />
        </button>
        <input
          ref={imageInputRef}
          className="qa-composer-image-input"
          type="file"
          accept="image/*"
          onChange={handleCommentImageChange}
          tabIndex={-1}
          aria-hidden="true"
        />

        <button
          className="qa-send"
          type="button"
          aria-label="Send"
          onClick={handleSendComment}
          disabled={isSendBusy || isImageBusy}
          style={isSendBusy || isImageBusy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        >
          <FaPaperPlane />
        </button>
      </div>

      {composerError ? <div className="qa-composer-error">{composerError}</div> : null}
    </div>
  );
};

export default QAPostDetail;
