import React, { useMemo, useState } from 'react';
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

const QAPostDetail = ({ post, onBack }) => {
  const [commentText, setCommentText] = useState('');

  if (!post) return null;

  const authorName = post.user?.name ?? post.author ?? 'Unknown';
  const postedLabel = post.minutesAgo != null ? `posted ${post.minutesAgo} mins ago` : '';
  const bodyText = post.description ?? post.question ?? '';

  const comments = useMemo(() => {
    if (Array.isArray(post.commentList)) return post.commentList;

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
  }, [post.commentList]);

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
            <span className="qa-action" role="button" tabIndex={0} aria-label="Like">
              <FaThumbsUp />
            </span>
            <span className="qa-action" role="button" tabIndex={0} aria-label="Comment">
              <FaComment />
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
        />
        <button className="qa-icon-btn" type="button" aria-label="Attach link">
          <FaLink />
        </button>
        <button className="qa-icon-btn" type="button" aria-label="Attach image">
          <FaImage />
        </button>
        <button className="qa-send" type="button" aria-label="Send">
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default QAPostDetail;
