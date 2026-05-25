// AdminRequestModal.jsx
import React, { useState } from 'react';

const AdminRequestModal = ({ request, onClose, onApprove, onReject }) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const parseChanges = (proposedValues) => {
    try {
      return JSON.parse(proposedValues);
    } catch {
      return proposedValues;
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove(request.id, approvalNotes);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(request.id, approvalNotes);
    setIsProcessing(false);
  };

  const changes = parseChanges(request.proposed_values);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Admin Request Details</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Request Information */}
        <div className="modal-section">
          <h3>Request Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Request No:</label>
              <span>{request.request_no}</span>
            </div>
            <div className="info-item">
              <label>Request Type:</label>
              <span>{request.request_type}</span>
            </div>
            <div className="info-item">
              <label>Module:</label>
              <span>{request.target_module}</span>
            </div>
            <div className="info-item">
              <label>Reference No:</label>
              <span>{request.reference_no}</span>
            </div>
            <div className="info-item">
              <label>Requested By:</label>
              <span>{request.requested_by}</span>
            </div>
            <div className="info-item">
              <label>Request Date:</label>
              <span>{new Date(request.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Request Details */}
        {request.details && (
          <div className="modal-section">
            <h3>Details</h3>
            <div className="details-box">
              {request.details}
            </div>
          </div>
        )}

        {/* Changes Comparison */}
        <div className="modal-section">
          <h3>Proposed Changes</h3>
          <div className="changes-grid">
            {typeof changes === 'object' ? (
              Object.entries(changes).map(([key, value]) => (
                <div key={key} className="change-item">
                  <div className="change-label">{key}:</div>
                  <div className="change-value">{value}</div>
                </div>
              ))
            ) : (
              <div className="changes-box">{changes}</div>
            )}
          </div>
        </div>

        {/* Approval Section */}
        <div className="modal-section">
          <h3>Approval Notes</h3>
          <textarea
            className="approval-textarea"
            placeholder="Enter your approval or rejection notes here..."
            value={approvalNotes}
            onChange={e => setApprovalNotes(e.target.value)}
            rows="4"
          />
        </div>

        {/* Action Buttons */}
        <div className="modal-footer">
          <button
            className="btn-reject"
            onClick={handleReject}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
          <button
            className="btn-approve"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRequestModal;
