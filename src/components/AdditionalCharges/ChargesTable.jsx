// ChargesTable.jsx
import React from 'react';

const ChargesTable = ({ charges, onEdit, onDelete }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'status-approved';
      case 'Pending Approval':
        return 'status-pending';
      case 'Rejected':
        return 'status-rejected';
      case 'Draft':
        return 'status-draft';
      default:
        return 'status-default';
    }
  };

  return (
    <div className="charges-table-wrapper">
      <table className="charges-table">
        <thead>
          <tr>
            <th>Ref No</th>
            <th>Shipment No</th>
            <th>Charge Type</th>
            <th>Supplier</th>
            <th>Amount</th>
            <th>Tax</th>
            <th>Total</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {charges.map(charge => (
            <tr key={charge.id}>
              <td>{charge.ref_no}</td>
              <td>{charge.shipment_no}</td>
              <td>{charge.charge_type}</td>
              <td>{charge.supplier}</td>
              <td>{charge.currency} {charge.amount.toFixed(3)}</td>
              <td>{charge.tax_percent}%</td>
              <td className="total-amount">
                {charge.currency} {charge.total_amount.toFixed(3)}
              </td>
              <td>
                <span className={`status-badge ${getStatusBadgeClass(charge.status)}`}>
                  {charge.status}
                </span>
              </td>
              <td className="action-cell">
                <button
                  className="btn-edit"
                  onClick={() => onEdit(charge)}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="btn-delete"
                  onClick={() => onDelete(charge.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {charges.length === 0 && (
        <div className="no-data-message">
          No charges found. Click "Add Charge" to create a new one.
        </div>
      )}
    </div>
  );
};

export default ChargesTable;
