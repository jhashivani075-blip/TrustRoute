"use client";

import {
  CheckCircle,
  XCircle,
  MessageSquareText,
} from "lucide-react";

import "./ReviewActionsBar.css";

export default function ReviewActionsBar({
  onApprove,
  onReject,
  onRequestInfo,
}) {
  return (
    <div className="review-actions">
      <button
        type="button"
        className="review-action-btn approve-btn"
        onClick={onApprove}
      >
        <CheckCircle size={17} />
        Approve
      </button>

      <button
        type="button"
        className="review-action-btn request-info-btn"
        onClick={onRequestInfo}
      >
        <MessageSquareText size={17} />
        Request Information
      </button>

      <button
        type="button"
        className="review-action-btn reject-btn"
        onClick={onReject}
      >
        <XCircle size={17} />
        Reject
      </button>
    </div>
  );
}