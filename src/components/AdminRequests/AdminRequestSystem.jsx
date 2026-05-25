// AdminRequestSystem.jsx
import React, { useState, useEffect } from 'react';
import AdminRequestModal from './AdminRequestModal';
import './AdminRequestSystem.css';

const AdminRequestSystem = () => {
  const [requests, setRequests] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audioContext, setAudioContext] = useState(null);

  useEffect(() => {
    fetchRequests();
    setupAudioContext();
    const interval = setInterval(fetchRequests, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const setupAudioContext = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);
  };

  const playNotificationBeep = () => {
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.value = 800;
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);

    // Play a second beep
    const osc2 = audioContext.createOscillator();
    osc2.connect(gain);
    osc2.frequency.value = 1000;
    osc2.type = 'sine';
    osc2.start(now + 0.15);
    osc2.stop(now + 0.25);
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin-requests?status=Pending');
      const data = await response.json();
      setRequests(data);

      // Check for new requests (those without read flag)
      const newRequests = data.filter(r => !r.read);
      if (newRequests.length > unreadCount) {
        playNotificationBeep();
      }
      setUnreadCount(newRequests.length);
    } catch (error) {
      console.error('Error fetching admin requests:', error);
    }
  };

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);

    // Mark as read
    if (!request.read) {
      markAsRead(request.id);
    }
  };

  const markAsRead = async (requestId) => {
    try {
      await fetch(`/api/admin-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking request as read:', error);
    }
  };

  const handleApprove = async (requestId, approvalNotes) => {
    try {
      await fetch(`/api/admin-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          approval_notes: approvalNotes,
          approved_by: 'current_user', // Replace with actual user
        }),
      });
      setIsModalOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId, rejectionReason) => {
    try {
      await fetch(`/api/admin-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          approval_notes: rejectionReason,
          approved_by: 'current_user', // Replace with actual user
        }),
      });
      setIsModalOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  return (
    <div className="admin-request-system">
      {/* Notification Bell */}
      <div className="notification-bell" onClick={() => setShowPanel(!showPanel)}>
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {/* Requests Panel */}
      {showPanel && (
        <div className="requests-panel">
          <div className="panel-header">
            <h3>Exception Alerts</h3>
            <button
              className="close-btn"
              onClick={() => setShowPanel(false)}
            >
              ✕
            </button>
          </div>

          <div className="requests-list">
            {requests.length === 0 ? (
              <div className="no-requests">
                <p>No pending requests</p>
              </div>
            ) : (
              requests.map(request => (
                <div
                  key={request.id}
                  className={`request-item ${!request.read ? 'unread' : ''}`}
                  onClick={() => handleRequestClick(request)}
                >
                  <div className="request-header">
                    <span className="request-type">{request.request_type}</span>
                    <span className="request-date">
                      {new Date(request.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="request-content">
                    <p className="request-no">{request.request_no}</p>
                    <p className="request-module">{request.target_module}</p>
                  </div>
                  {!request.read && <div className="unread-indicator"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {isModalOpen && selectedRequest && (
        <AdminRequestModal
          request={selectedRequest}
          onClose={() => setIsModalOpen(false)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default AdminRequestSystem;
