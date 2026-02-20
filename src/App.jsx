
import React, { useState, useEffect, createContext, useContext } from 'react';

// --- RBAC and Permissions Configuration ---
const ROLES = {
    FI_PRODUCT_MANAGER: 'F&I Product Manager',
    CUSTOMER_SERVICE_REP: 'Customer Service Representative',
    DEALERSHIP_PORTAL_USER: 'Dealership Portal User',
    VEHICLE_OWNER: 'Vehicle Owner',
    SYSTEM_ARCHITECT: 'System Architect',
};

const permissions = {
    [ROLES.FI_PRODUCT_MANAGER]: {
        canView: ['Dashboard', 'ContractList', 'ContractDetail', 'ContractForm', 'ClaimList', 'ClaimDetail', 'ClaimForm', 'RenewalList', 'RenewalDetail', 'CancellationList', 'CancellationDetail', 'AuditLogs', 'Reports'],
        canCreate: ['Contract', 'Plan'],
        canEdit: ['Contract', 'Claim', 'Renewal', 'Cancellation'],
        canApprove: ['Contract', 'Claim', 'Renewal', 'Cancellation'],
        canDelete: ['Plan'], // Limited delete, e.g., plan definitions
        dataScope: 'ALL', // Can see all data
        kpis: ['TotalContracts', 'PendingApprovals', 'SLACompliance', 'RenewalRate', 'ClaimPayouts'],
    },
    [ROLES.CUSTOMER_SERVICE_REP]: {
        canView: ['Dashboard', 'ContractList', 'ContractDetail', 'ClaimList', 'ClaimDetail', 'RenewalList', 'RenewalDetail', 'CancellationList', 'CancellationDetail', 'AuditLogs'],
        canCreate: ['Claim', 'CancellationRequest'],
        canEdit: ['ClaimStatus', 'CancellationStatus'],
        canApprove: [],
        canDelete: [],
        dataScope: 'ALL', // Can see all customers/contracts for support
        kpis: ['OpenClaims', 'PendingCustomerActions', 'CustomerSatisfaction'],
    },
    [ROLES.DEALERSHIP_PORTAL_USER]: {
        canView: ['Dashboard', 'ContractList', 'ContractDetail', 'ClaimList', 'ClaimDetail', 'RenewalList', 'RenewalDetail'],
        canCreate: ['Contract', 'Claim'],
        canEdit: ['ContractDraft', 'ClaimDraft'],
        canApprove: [],
        canDelete: [],
        dataScope: 'DEALERSHIP', // Can only see contracts/claims associated with their dealership
        kpis: ['ContractsSold', 'PendingClaims', 'RenewalOpportunities'],
    },
    [ROLES.VEHICLE_OWNER]: {
        canView: ['Dashboard', 'ContractDetail', 'ClaimDetail', 'RenewalDetail'],
        canCreate: ['Claim', 'RenewalRequest', 'CancellationRequest'],
        canEdit: [],
        canApprove: [],
        canDelete: [],
        dataScope: 'OWN', // Can only see their own contracts/claims
        kpis: ['MyContracts', 'MyClaimsStatus'],
    },
    [ROLES.SYSTEM_ARCHITECT]: {
        canView: ['Dashboard', 'AuditLogs', 'SystemSettings'],
        canCreate: ['SystemConfig'],
        canEdit: ['SystemConfig'],
        canApprove: [],
        canDelete: ['SystemConfig'],
        dataScope: 'ALL', // Can see all system-level data
        kpis: ['SystemHealth', 'APIIntegrations', 'SLACompliance'],
    },
};

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('currentUser?.role');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const login = (role) => {
        const newUser = { role };
        setUser(newUser);
        localStorage.setItem('currentUser?.role', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser?.role');
    };

    const canAccess = (feature, action = 'canView', record = null) => {
        if (!user) return false;
        const userPermissions = permissions[user.role];
        if (!userPermissions) return false;

        // Check feature/screen view access
        if (action === 'canView' && !userPermissions.canView.includes(feature)) {
            return false;
        }

        // Check specific action access
        if (action !== 'canView' && (!userPermissions[action] || !userPermissions[action].includes(feature))) {
            return false;
        }

        // Check data scope
        if (record) {
            switch (userPermissions.dataScope) {
                case 'OWN':
                    // Example: record.ownerId === user.id (assuming user object has an id)
                    // For this prototype, we'll simulate based on hardcoded dummy data and assuming 'Vehicle Owner' role matches specific records.
                    if (user.role === ROLES.VEHICLE_OWNER) {
                        return record.owner === `Vehicle Owner ${user.id || '1'}`; // Simulate owner ID
                    }
                    break;
                case 'DEALERSHIP':
                    // Example: record.dealershipId === user.dealershipId
                    // For this prototype, we'll simulate based on hardcoded dummy data and assuming 'Dealership Portal User' role matches specific records.
                    if (user.role === ROLES.DEALERSHIP_PORTAL_USER) {
                        return record.dealership === `Dealership A`; // Simulate dealership ID
                    }
                    break;
                case 'ALL':
                default:
                    return true;
            }
        }

        return true;
    };

    // For the prototype, assign a dummy ID for Vehicle Owner to simulate 'OWN' scope
    useEffect(() => {
        if (user && user.role === ROLES.VEHICLE_OWNER && !user.id) {
            setUser(prevUser => ({ ...prevUser, id: '1' })); // Assign a dummy ID for testing
        }
    }, [user]);


    return (
        <AuthContext.Provider value={{ user, login, logout, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => useContext(AuthContext);

// --- Dummy Data ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const getRandomStatus = (type) => {
    const statuses = {
        contract: ['NEW', 'DRAFT', 'IN_PROGRESS', 'APPROVED', 'PENDING', 'REJECTED', 'CLOSED', 'SLA_BREACH'],
        claim: ['NEW', 'DRAFT', 'PENDING', 'ACTION_REQUIRED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CLOSED', 'SLA_BREACH', 'ESCALATION'],
        renewal: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'ACTION_REQUIRED'],
        cancellation: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'IN_PROGRESS'],
    };
    const list = statuses[type] || [];
    return list[Math.floor(Math.random() * list.length)];
};

const generateWorkflowHistory = (status) => {
    const history = [{ stage: 'Initiated', date: '2023-01-01', actor: 'System' }];
    if (status !== 'NEW' && status !== 'DRAFT') {
        history.push({ stage: 'Submitted', date: '2023-01-02', actor: 'User' });
    }
    if (status === 'IN_PROGRESS' || status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' || status === 'CLOSED' || status === 'SLA_BREACH' || status === 'ESCALATION') {
        history.push({ stage: 'Underwriting Review', date: '2023-01-05', actor: 'F&I Manager' });
        if (status === 'IN_PROGRESS' || status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' || status === 'CLOSED' || status === 'SLA_BREACH' || status === 'ESCALATION') {
             history.push({ stage: 'Adjudication', date: '2023-01-10', actor: 'Claims Adjuster' });
        }
    }
    if (status === 'APPROVED' || status === 'CLOSED') {
        history.push({ stage: 'Approved', date: '2023-01-15', actor: 'System' });
    }
    if (status === 'REJECTED' || status === 'SLA_BREACH') {
        history.push({ stage: 'Resolution', date: '2023-01-16', actor: 'F&I Manager' });
    }
    return history;
};

const contractsData = Array.from({ length: 15 }).map((_, i) => {
    const status = getRandomStatus('contract');
    const contractId = `VSC-${1000 + i}`;
    const owner = i % 3 === 0 ? `Vehicle Owner 1` : `Vehicle Owner ${2 + (i % 2)}`;
    const dealership = i % 2 === 0 ? `Dealership A` : `Dealership B`;
    return {
        id: contractId,
        type: 'Vehicle Service Contract',
        contractId: contractId,
        vehicleVIN: `VIN${Math.floor(100000 + Math.random() * 900000)}`,
        planName: `Plan ${String.fromCharCode(65 + i % 3)}`,
        startDate: `2023-01-${10 + i}`,
        endDate: `2028-01-${10 + i}`,
        status: status,
        price: (2500 + i * 50).toFixed(2),
        customerName: `Customer ${i + 1}`,
        dealership: dealership,
        owner: owner,
        details: `This is a comprehensive VSC for a ${new Date().getFullYear() - (i % 10 + 1)} model vehicle. Coverage includes engine, transmission, and electrical systems.`,
        workflowHistory: generateWorkflowHistory(status),
        auditLog: [
            { timestamp: '2023-01-01 10:00', user: 'Admin', action: 'Created Contract Draft' },
            { timestamp: '2023-01-02 11:30', user: 'Dealership A User', action: `Submitted Contract ${contractId}` },
            ...(status !== 'NEW' && status !== 'DRAFT' ? [{ timestamp: '2023-01-05 14:00', user: 'F&I Manager', action: `Contract ${status}` }] : [])
        ]
    };
});

const claimsData = Array.from({ length: 15 }).map((_, i) => {
    const status = getRandomStatus('claim');
    const claimId = `CLM-${5000 + i}`;
    const contract = contractsData[i % contractsData.length];
    return {
        id: claimId,
        type: 'Claim',
        claimId: claimId,
        contractId: contract.contractId,
        vehicleVIN: contract.vehicleVIN,
        customerName: contract.customerName,
        dealership: contract.dealership,
        owner: contract.owner,
        dateFiled: `2023-02-${10 + i}`,
        serviceProvider: `Service Center ${String.fromCharCode(65 + i % 2)}`,
        estimatedCost: (500 + i * 20).toFixed(2),
        status: status,
        description: `Repair for ${i % 2 === 0 ? 'engine malfunction' : 'transmission issue'}. Diagnostic code P0${100 + i}.`,
        aiFraudScore: (Math.random() * 100).toFixed(2),
        documents: ['invoice.pdf', 'diagnostic_report.pdf'],
        workflowHistory: generateWorkflowHistory(status),
        auditLog: [
            { timestamp: '2023-02-10 09:00', user: 'Vehicle Owner 1', action: 'Filed Claim CLM-5000' },
            { timestamp: '2023-02-11 10:15', user: 'Customer Service Rep', action: `Reviewed Claim ${claimId}` },
            ...(status === 'PENDING' ? [{ timestamp: '2023-02-12 11:00', user: 'AI System', action: `Fraud Detection Score: ${status}` }] : [])
        ]
    };
});

const renewalsData = Array.from({ length: 10 }).map((_, i) => {
    const status = getRandomStatus('renewal');
    const renewalId = `REN-${8000 + i}`;
    const contract = contractsData[i % contractsData.length];
    return {
        id: renewalId,
        type: 'Renewal',
        renewalId: renewalId,
        contractId: contract.contractId,
        customerName: contract.customerName,
        dealership: contract.dealership,
        owner: contract.owner,
        originalEndDate: contract.endDate,
        newEndDate: `2030-01-${10 + i}`,
        status: status,
        renewalPrice: (contract.price * 1.05).toFixed(2),
        renewalOffer: `Renewal offer for an additional 2 years of coverage for $${(contract.price * 1.05).toFixed(2)}.`,
        workflowHistory: generateWorkflowHistory(status),
        auditLog: [
            { timestamp: '2023-11-01 10:00', user: 'System', action: 'Generated Renewal Offer' },
            { timestamp: '2023-11-05 11:30', user: 'Vehicle Owner 1', action: `Requested Renewal ${renewalId}` },
            ...(status === 'APPROVED' ? [{ timestamp: '2023-11-10 14:00', user: 'F&I Manager', action: `Renewal ${status}` }] : [])
        ]
    };
});

const cancellationsData = Array.from({ length: 10 }).map((_, i) => {
    const status = getRandomStatus('cancellation');
    const cancellationId = `CAN-${9000 + i}`;
    const contract = contractsData[i % contractsData.length];
    return {
        id: cancellationId,
        type: 'Cancellation',
        cancellationId: cancellationId,
        contractId: contract.contractId,
        customerName: contract.customerName,
        dealership: contract.dealership,
        owner: contract.owner,
        requestDate: `2023-03-${10 + i}`,
        reason: i % 2 === 0 ? 'Sold Vehicle' : 'Customer Request',
        status: status,
        refundAmount: (contract.price * (1 - (i / 10))).toFixed(2),
        workflowHistory: generateWorkflowHistory(status),
        auditLog: [
            { timestamp: '2023-03-10 10:00', user: 'Customer Service Rep', action: `Initiated Cancellation ${cancellationId}` },
            { timestamp: '2023-03-11 11:30', user: 'F&I Manager', action: `Reviewed Cancellation ${cancellationId}` },
            ...(status === 'APPROVED' ? [{ timestamp: '2023-03-15 14:00', user: 'System', action: `Processed Refund for ${cancellationId}` }] : [])
        ]
    };
});

const auditLogsData = [
    ...contractsData.flatMap(c => c.auditLog.map(log => ({ ...log, recordId: c.id, recordType: 'Contract' }))),
    ...claimsData.flatMap(c => c.auditLog.map(log => ({ ...log, recordId: c.id, recordType: 'Claim' }))),
    ...renewalsData.flatMap(r => r.auditLog.map(log => ({ ...log, recordId: r.id, recordType: 'Renewal' }))),
    ...cancellationsData.flatMap(c => c.auditLog.map(log => ({ ...log, recordId: c.id, recordType: 'Cancellation' }))),
];

// --- Status to Color Mapping ---
const getStatusClass = (status) => {
    switch (status) {
        case 'APPROVED':
        case 'COMPLETED':
        case 'CLOSED': return 'status-APPROVED';
        case 'IN_PROGRESS':
        case 'ASSIGNED': return 'status-IN_PROGRESS';
        case 'PENDING':
        case 'ACTION_REQUIRED': return 'status-PENDING';
        case 'REJECTED':
        case 'SLA_BREACH':
        case 'BLOCKED': return 'status-REJECTED';
        case 'EXCEPTION':
        case 'ESCALATION': return 'status-EXCEPTION';
        case 'DRAFT':
        case 'ARCHIVED': return 'status-DRAFT';
        case 'NEW': return 'status-NEW';
        default: return '';
    }
};

// --- Reusable Components ---
const CardContainer = ({ children, title, subtitle, status, onClick }) => (
    <div className={`card-container card-status-${status} ${getStatusClass(status)}`} onClick={onClick}>
        <div className={`card-header status-${status} ${getStatusClass(status)}`}>
            <span>{title}</span>
            <span className="card-status-badge">{status.replace(/_/g, ' ')}</span>
        </div>
        <div className="card-body">
            {subtitle && <div className="card-detail-item"><span className="card-detail-label">Ref:</span> <span className="card-detail-value">{subtitle}</span></div>}
            {children}
        </div>
    </div>
);

const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast ${type}`}>
            <span className="toast-icon">
                {type === 'success' && '✔️'}
                {type === 'error' && '❌'}
                {type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{message}</span>
        </div>
    );
};

// --- Full-Screen Page Components (Detailed Views & Forms) ---

const BackButton = ({ onClick }) => (
    <button onClick={onClick} className="button-ghost" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <span>&larr;</span> Back
    </button>
);

const WorkflowProgress = ({ history, currentStatus }) => {
    const stages = [
        { name: 'Initiated', key: 'Initiated' },
        { name: 'Submitted', key: 'Submitted' },
        { name: 'Underwriting Review', key: 'Underwriting Review' },
        { name: 'Adjudication', key: 'Adjudication' },
        { name: 'Approved / Rejected', key: 'Approved' }, // Simplified for visualization
    ];

    return (
        <div className="workflow-tracker">
            <h3 className="detail-section-title">Workflow Progress</h3>
            <div className="workflow-stage-list">
                {stages.map((stage, index) => {
                    const stageRecord = history.find(h => h.stage === stage.key);
                    const isCompleted = !!stageRecord && history.indexOf(stageRecord) <= history.findIndex(h => h.stage === currentStatus);
                    const isActive = history.findIndex(h => h.stage === currentStatus) === history.findIndex(h => h.stage === stage.key) && !isCompleted;

                    let stageClass = '';
                    if (isCompleted) stageClass = 'completed';
                    if (isActive) stageClass = 'active';
                    if (currentStatus === 'SLA_BREACH' && stage.key === 'Adjudication') stageClass += ' sla-breach'; // Example SLA breach visual

                    return (
                        <div key={stage.key} className={`workflow-stage ${stageClass}`}>
                            <div className="workflow-stage-dot">
                                {stageClass === 'completed' && '✔️'}
                                {stageClass === 'active' && '●'}
                                {stageClass.includes('sla-breach') && '❗'}
                            </div>
                            <div className="workflow-stage-label">{stage.name}</div>
                            {stageRecord && <div className="workflow-stage-date">{stageRecord.date}</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AuditLogViewer = ({ logs, canAccessLogs }) => {
    if (!canAccessLogs) {
        return <p>You do not have permission to view audit logs.</p>;
    }
    return (
        <div className="detail-sidebar-info">
            <h3 className="detail-section-title">Audit Log (Immutable)</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="audit-log-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, index) => (
                            <tr key={index}>
                                <td>{log.timestamp}</td>
                                <td>{log.user}</td>
                                <td>{log.action}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const DetailPage = ({ record, entityType, onBack, onEdit, canEdit, canApprove, showToast, canAccessLogs }) => {
    if (!record) return null;

    const renderActionButtons = () => {
        if (!record || record.status === 'CLOSED' || record.status === 'APPROVED' || record.status === 'REJECTED') {
            return null; // No actions for completed/finalized records
        }

        const buttons = [];
        if (canEdit(entityType, record)) {
            buttons.push(<button key="edit" onClick={() => onEdit(record)} className="button-secondary">Edit</button>);
        }
        if (canApprove(entityType, record) && record.status === 'PENDING' || record.status === 'ACTION_REQUIRED') {
            buttons.push(<button key="approve" onClick={() => showToast('Approved!', 'success')} className="button-primary">Approve</button>);
            buttons.push(<button key="reject" onClick={() => showToast('Rejected!', 'error')} className="button-danger">Reject</button>);
        }
        return buttons.length > 0 ? <div className="detail-page-actions">{buttons}</div> : null;
    };

    return (
        <div className="full-screen-page">
            <div className="detail-page-header">
                <BackButton onClick={onBack} />
                <h1 style={{flexGrow: 1, textAlign: 'center'}}>
                    {record.type} Details <span className={`status-indicator ${getStatusClass(record.status)}`}>{record.status.replace(/_/g, ' ')}</span>
                </h1>
                {renderActionButtons()}
            </div>

            <div className="detail-sections-grid">
                <div className="detail-main-info">
                    <h3 className="detail-section-title">Overview</h3>
                    <div className="detail-item">
                        <span className="detail-item-label">ID:</span>
                        <span className="detail-item-value">{record.contractId || record.claimId || record.renewalId || record.cancellationId}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-item-label">Customer Name:</span>
                        <span className="detail-item-value">{record.customerName}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-item-label">Dealership:</span>
                        <span className="detail-item-value">{record.dealership}</span>
                    </div>
                    {record.vehicleVIN && (
                        <div className="detail-item">
                            <span className="detail-item-label">Vehicle VIN:</span>
                            <span className="detail-item-value">{record.vehicleVIN}</span>
                        </div>
                    )}
                    {record.planName && (
                        <div className="detail-item">
                            <span className="detail-item-label">Plan Name:</span>
                            <span className="detail-item-value">{record.planName}</span>
                        </div>
                    )}
                    {record.startDate && (
                        <div className="detail-item">
                            <span className="detail-item-label">Start Date:</span>
                            <span className="detail-item-value">{record.startDate}</span>
                        </div>
                    )}
                    {record.endDate && (
                        <div className="detail-item">
                            <span className="detail-item-label">End Date:</span>
                            <span className="detail-item-value">{record.endDate}</span>
                        </div>
                    )}
                    {record.price && (
                        <div className="detail-item">
                            <span className="detail-item-label">Price:</span>
                            <span className="detail-item-value">${record.price}</span>
                        </div>
                    )}
                     {record.dateFiled && (
                        <div className="detail-item">
                            <span className="detail-item-label">Date Filed:</span>
                            <span className="detail-item-value">{record.dateFiled}</span>
                        </div>
                    )}
                    {record.estimatedCost && (
                        <div className="detail-item">
                            <span className="detail-item-label">Estimated Cost:</span>
                            <span className="detail-item-value">${record.estimatedCost}</span>
                        </div>
                    )}
                    {record.serviceProvider && (
                        <div className="detail-item">
                            <span className="detail-item-label">Service Provider:</span>
                            <span className="detail-item-value">{record.serviceProvider}</span>
                        </div>
                    )}
                    {record.aiFraudScore && (
                        <div className="detail-item">
                            <span className="detail-item-label">AI Fraud Score:</span>
                            <span className="detail-item-value">{record.aiFraudScore}%</span>
                        </div>
                    )}
                    {record.renewalPrice && (
                        <div className="detail-item">
                            <span className="detail-item-label">Renewal Price:</span>
                            <span className="detail-item-value">${record.renewalPrice}</span>
                        </div>
                    )}
                    {record.reason && (
                        <div className="detail-item">
                            <span className="detail-item-label">Reason:</span>
                            <span className="detail-item-value">{record.reason}</span>
                        </div>
                    )}
                    {record.refundAmount && (
                        <div className="detail-item">
                            <span className="detail-item-label">Refund Amount:</span>
                            <span className="detail-item-value">${record.refundAmount}</span>
                        </div>
                    )}
                    <h3 className="detail-section-title" style={{ marginTop: 'var(--spacing-lg)' }}>Description</h3>
                    <p>{record.details || record.description || record.renewalOffer || 'No description available.'}</p>

                    {record.documents && record.documents.length > 0 && (
                        <>
                            <h3 className="detail-section-title" style={{ marginTop: 'var(--spacing-lg)' }}>Documents</h3>
                            <ul>
                                {record.documents.map((doc, index) => (
                                    <li key={index}><a href="#" onClick={() => showToast(`Opening ${doc}`, 'info')}>{doc}</a></li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                <div className="detail-sidebar-info">
                    {record.workflowHistory && <WorkflowProgress history={record.workflowHistory} currentStatus={record.status} />}
                    {record.auditLog && <AuditLogViewer logs={record.auditLog} canAccessLogs={canAccessLogs} />}
                </div>
            </div>
        </div>
    );
};

const EntityForm = ({ entityType, record = null, onSave, onCancel, showToast }) => {
    const isNew = !record || Object.keys(record).length === 0;
    const [formData, setFormData] = useState(record || {});
    const [errors, setErrors] = useState({});

    const fieldsConfig = {
        Contract: [
            { name: 'contractId', label: 'Contract ID', type: 'text', required: true, autoPopulated: true },
            { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
            { name: 'dealership', label: 'Dealership', type: 'text', required: true },
            { name: 'vehicleVIN', label: 'Vehicle VIN', type: 'text', required: true },
            { name: 'planName', label: 'Plan Name', type: 'select', options: ['Basic', 'Premium', 'Elite'], required: true },
            { name: 'startDate', label: 'Start Date', type: 'date', required: true },
            { name: 'endDate', label: 'End Date', type: 'date', required: true },
            { name: 'price', label: 'Price ($)', type: 'number', required: true },
            { name: 'details', label: 'Details', type: 'textarea', required: false },
        ],
        Claim: [
            { name: 'claimId', label: 'Claim ID', type: 'text', required: true, autoPopulated: true },
            { name: 'contractId', label: 'Contract ID', type: 'text', required: true },
            { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
            { name: 'dealership', label: 'Dealership', type: 'text', required: true },
            { name: 'vehicleVIN', label: 'Vehicle VIN', type: 'text', required: true },
            { name: 'dateFiled', label: 'Date Filed', type: 'date', required: true, autoPopulated: true },
            { name: 'serviceProvider', label: 'Service Provider', type: 'text', required: true },
            { name: 'estimatedCost', label: 'Estimated Cost ($)', type: 'number', required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: true },
            { name: 'documents', label: 'Supporting Documents', type: 'file', multiple: true },
        ],
        Renewal: [
            { name: 'renewalId', label: 'Renewal ID', type: 'text', required: true, autoPopulated: true },
            { name: 'contractId', label: 'Contract ID', type: 'text', required: true },
            { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
            { name: 'originalEndDate', label: 'Original End Date', type: 'date', required: true, autoPopulated: true },
            { name: 'newEndDate', label: 'New End Date', type: 'date', required: true },
            { name: 'renewalPrice', label: 'Renewal Price ($)', type: 'number', required: true },
            { name: 'renewalOffer', label: 'Renewal Offer Details', type: 'textarea', required: false },
        ],
        Cancellation: [
            { name: 'cancellationId', label: 'Cancellation ID', type: 'text', required: true, autoPopulated: true },
            { name: 'contractId', label: 'Contract ID', type: 'text', required: true },
            { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
            { name: 'requestDate', label: 'Request Date', type: 'date', required: true, autoPopulated: true },
            { name: 'reason', label: 'Reason for Cancellation', type: 'textarea', required: true },
            { name: 'refundAmount', label: 'Refund Amount ($)', type: 'number', required: true },
        ],
    };

    const currentFields = fieldsConfig[entityType] || [];

    useEffect(() => {
        if (isNew) {
            // Auto-populate for new records
            const newDefaults = {};
            currentFields.forEach(field => {
                if (field.autoPopulated) {
                    if (field.name.includes('Id')) newDefaults[field.name] = `${field.name.substring(0,3).toUpperCase()}-${generateId().toUpperCase()}`;
                    if (field.name.includes('Date')) newDefaults[field.name] = new Date().toISOString().split('T')[0];
                }
            });
            setFormData(prev => ({ ...prev, ...newDefaults }));
        }
    }, [isNew, entityType]);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files })); // Store file objects
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        // Clear error on change
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        currentFields.forEach(field => {
            if (field.required && (!formData[field.name] || (typeof formData[field.name] === 'string' && formData[field.name].trim() === ''))) {
                newErrors[field.name] = `${field.label} is mandatory.`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast('Please correct the form errors.', 'error');
            return;
        }

        onSave({ ...formData, status: formData.status || (isNew ? 'DRAFT' : record.status) }); // Set initial status for new, keep existing for edit
        showToast(`${entityType} ${isNew ? 'Created' : 'Updated'} successfully!`, 'success');
    };

    return (
        <div className="full-screen-page">
            <div className="form-container">
                <div className="form-header">
                    <BackButton onClick={onCancel} />
                    <h2>{isNew ? `Create New ${entityType}` : `Edit ${entityType} ${record?.contractId || record?.claimId || record?.renewalId || record?.cancellationId}`}</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    {currentFields.map(field => (
                        <div key={field.name} className="form-group">
                            <label htmlFor={field.name} className={field.required ? 'required' : ''}>
                                {field.label}
                                {field.autoPopulated && <span style={{fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)', color: '#999'}}>(Auto-populated)</span>}
                            </label>
                            {field.type === 'select' ? (
                                <select
                                    id={field.name}
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleChange}
                                    disabled={field.autoPopulated && !isNew}
                                >
                                    <option value="">Select...</option>
                                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    id={field.name}
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleChange}
                                    rows="4"
                                    disabled={field.autoPopulated && !isNew}
                                ></textarea>
                            ) : field.type === 'file' ? (
                                <input
                                    type="file"
                                    id={field.name}
                                    name={field.name}
                                    onChange={handleChange}
                                    multiple={field.multiple}
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    id={field.name}
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleChange}
                                    readOnly={field.autoPopulated && !isNew}
                                    disabled={field.autoPopulated && !isNew}
                                />
                            )}
                            {errors[field.name] && <div className="error-message">{errors[field.name]}</div>}
                        </div>
                    ))}
                    <div className="form-actions">
                        <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
                        <button type="submit" className="button-primary">Save {entityType}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- List View Components (Render cards) ---
const CardList = ({ title, items, entityType, onCardClick, canCreate, onAddClick, canAccess }) => {
    const { user } = useAuth();
    const filteredItems = items.filter(item => canAccess(entityType, 'canView', item));
    return (
        <div className="dashboard-section">
            <div className="dashboard-section-header">
                <h2>{title}</h2>
                {canCreate(entityType) && (
                    <button onClick={onAddClick} className="button-primary">
                        + New {entityType}
                    </button>
                )}
            </div>
            {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: '#666' }}>
                    <p style={{marginBottom: 'var(--spacing-md)'}}>No {title.toLowerCase()} found for your role.</p>
                    {canCreate(entityType) && (
                         <button onClick={onAddClick} className="button-secondary">
                         Start New {entityType}
                        </button>
                    )}
                </div>
            ) : (
                <div className="card-list">
                    {filteredItems.map(item => (
                        <CardContainer
                            key={item.id}
                            title={item.contractId || item.claimId || item.renewalId || item.cancellationId}
                            subtitle={item.customerName}
                            status={item.status}
                            onClick={() => onCardClick(item)}
                        >
                            <div className="card-detail-item">
                                <span className="card-detail-label">Vehicle:</span>
                                <span className="card-detail-value">{item.vehicleVIN || 'N/A'}</span>
                            </div>
                            <div className="card-detail-item">
                                <span className="card-detail-label">Status:</span>
                                <span className="card-detail-value">{item.status.replace(/_/g, ' ')}</span>
                            </div>
                            {item.price && (
                                <div className="card-detail-item">
                                    <span className="card-detail-label">Value:</span>
                                    <span className="card-detail-value">${item.price}</span>
                                </div>
                            )}
                            {item.estimatedCost && (
                                <div className="card-detail-item">
                                    <span className="card-detail-label">Est. Cost:</span>
                                    <span className="card-detail-value">${item.estimatedCost}</span>
                                </div>
                            )}
                        </CardContainer>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Dashboard Components ---
const Dashboard = ({ onNavigate, showToast }) => {
    const { user, canAccess } = useAuth();

    const getKpisForRole = () => {
        const kpiData = {
            TotalContracts: { value: contractsData.length, label: 'Total Contracts', trend: '↑15%' },
            PendingApprovals: { value: contractsData.filter(c => c.status === 'PENDING').length + claimsData.filter(c => c.status === 'PENDING').length, label: 'Pending Approvals', trend: '↑5%' },
            SLACompliance: { value: '98%', label: 'SLA Compliance', trend: '↑0.5%' },
            RenewalRate: { value: '75%', label: 'Renewal Rate', trend: '↑2%' },
            ClaimPayouts: { value: '$' + claimsData.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + parseFloat(c.estimatedCost), 0).toFixed(0), label: 'Total Claim Payouts', trend: '↑10%' },
            OpenClaims: { value: claimsData.filter(c => c.status !== 'CLOSED' && c.status !== 'REJECTED').length, label: 'Open Claims', trend: '↓3%' },
            PendingCustomerActions: { value: claimsData.filter(c => c.status === 'ACTION_REQUIRED').length, label: 'Pending Customer Actions', trend: '↑2%' },
            CustomerSatisfaction: { value: '4.7/5', label: 'Customer Satisfaction', trend: '↔' },
            ContractsSold: { value: contractsData.filter(c => c.dealership === `Dealership A`).length, label: 'Contracts Sold (Your Dealership)', trend: '↑7%' },
            PendingClaims: { value: claimsData.filter(c => c.dealership === `Dealership A` && c.status === 'PENDING').length, label: 'Pending Claims (Your Dealership)', trend: '↑1%' },
            RenewalOpportunities: { value: renewalsData.filter(r => r.dealership === `Dealership A` && r.status === 'PENDING').length, label: 'Renewal Opportunities', trend: '↑2%' },
            MyContracts: { value: contractsData.filter(c => c.owner === `Vehicle Owner 1`).length, label: 'My Active Contracts', trend: '↔' },
            MyClaimsStatus: { value: claimsData.filter(c => c.owner === `Vehicle Owner 1` && c.status !== 'CLOSED').length, label: 'My Open Claims', trend: '↑1' },
            SystemHealth: { value: 'Online', label: 'System Health', trend: '✔️' },
            APIIntegrations: { value: '9/10 Active', label: 'API Integrations', trend: '↔' },
        };

        const roleKpis = permissions[user.role]?.kpis || [];
        return roleKpis.map(kpiName => kpiData[kpiName]).filter(Boolean);
    };

    const roleSpecificKpis = getKpisForRole();

    return (
        <div className="content-wrapper">
            <h1 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-primary)' }}>{user.role} Dashboard</h1>

            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <h2 style={{ color: 'var(--color-secondary)' }}>Key Performance Indicators</h2>
                    <div className="dashboard-grid" style={{ marginTop: 'var(--spacing-md)' }}>
                        {roleSpecificKpis.map((kpi, index) => (
                            <div key={index} className="kpi-card">
                                <div className="kpi-card-label">{kpi.label}</div>
                                <div className="kpi-card-value">{kpi.value}</div>
                                <div className="kpi-card-sparkline">{kpi.trend}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {canAccess('Dashboard', 'canView', null, { chartType: 'Bar' }) && (
                    <div className="dashboard-section">
                        <h2 style={{ color: 'var(--color-secondary)' }}>Contracts by Status (Chart)</h2>
                        <div style={{ height: '200px', backgroundColor: 'var(--color-background-light)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', marginTop: 'var(--spacing-md)' }}>
                            <p>Bar Chart: Contracts by Status (Dummy Visualization)</p>
                            <button onClick={() => showToast('Chart data exported to PDF!', 'info')} className="button-ghost ml-md">Export PDF</button>
                        </div>
                    </div>
                )}
                {canAccess('Dashboard', 'canView', null, { chartType: 'Line' }) && (
                    <div className="dashboard-section">
                        <h2 style={{ color: 'var(--color-secondary)' }}>Monthly Claim Trends (Chart)</h2>
                        <div style={{ height: '200px', backgroundColor: 'var(--color-background-light)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', marginTop: 'var(--spacing-md)' }}>
                            <p>Line Chart: Monthly Claim Submissions (Dummy Visualization)</p>
                            <button onClick={() => showToast('Chart data exported to Excel!', 'info')} className="button-ghost ml-md">Export Excel</button>
                        </div>
                    </div>
                )}
            </div>

            {canAccess('ContractList') && (
                <CardList
                    title="Recent Contracts"
                    entityType="Contract"
                    items={contractsData.filter(item => canAccess('Contract', 'canView', item)).slice(0, 5)} // Limit to 5 for dashboard
                    onCardClick={(record) => onNavigate('ContractDetail', record)}
                    canCreate={() => canAccess('Contract', 'canCreate')}
                    onAddClick={() => onNavigate('ContractForm')}
                    canAccess={(entity, action, item) => canAccess(entity, action, item)}
                />
            )}
            {canAccess('ClaimList') && (
                <CardList
                    title="Recent Claims"
                    entityType="Claim"
                    items={claimsData.filter(item => canAccess('Claim', 'canView', item)).slice(0, 5)}
                    onCardClick={(record) => onNavigate('ClaimDetail', record)}
                    canCreate={() => canAccess('Claim', 'canCreate')}
                    onAddClick={() => onNavigate('ClaimForm')}
                    canAccess={(entity, action, item) => canAccess(entity, action, item)}
                />
            )}
            {canAccess('RenewalList') && (
                 <CardList
                    title="Recent Renewals"
                    entityType="Renewal"
                    items={renewalsData.filter(item => canAccess('Renewal', 'canView', item)).slice(0, 5)}
                    onCardClick={(record) => onNavigate('RenewalDetail', record)}
                    canCreate={() => canAccess('Renewal', 'canCreate')}
                    onAddClick={() => onNavigate('RenewalForm')}
                    canAccess={(entity, action, item) => canAccess(entity, action, item)}
                />
            )}
        </div>
    );
};

// --- Main App Component ---
function App() {
    const { user, login, logout, canAccess } = useAuth();
    const [activeScreen, setActiveScreen] = useState('Dashboard'); // Controls full-screen rendering
    const [selectedRecord, setSelectedRecord] = useState(null); // The record being viewed/edited
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [toastQueue, setToastQueue] = useState([]);

    const showToast = (message, type) => {
        setToastQueue(prev => [...prev, { id: generateId(), message, type }]);
    };

    const removeToast = (id) => {
        setToastQueue(prev => prev.filter(toast => toast.id !== id));
    };

    const navigate = (screenName, record = null) => {
        if (!canAccess(screenName, 'canView', record)) {
            showToast(`You don't have permission to view ${screenName.replace('List', '')} details.`, 'error');
            return;
        }
        setActiveScreen(screenName);
        setSelectedRecord(record);
        setShowSearch(false);
    };

    const goBack = () => {
        // Simple back logic: if on a detail/form page, go to its list, else to dashboard
        if (activeScreen.includes('Detail') || activeScreen.includes('Form')) {
            const listScreen = activeScreen.replace('Detail', 'List').replace('Form', 'List');
            if (listScreen === 'ContractList' && canAccess('ContractList')) { setActiveScreen('ContractList'); }
            else if (listScreen === 'ClaimList' && canAccess('ClaimList')) { setActiveScreen('ClaimList'); }
            else if (listScreen === 'RenewalList' && canAccess('RenewalList')) { setActiveScreen('RenewalList'); }
            else if (listScreen === 'CancellationList' && canAccess('CancellationList')) { setActiveScreen('CancellationList'); }
            else { setActiveScreen('Dashboard'); }
        } else {
            setActiveScreen('Dashboard');
        }
        setSelectedRecord(null);
    };

    const handleSave = (updatedRecord) => {
        // In a real app, this would involve API calls. For prototype, update dummy data.
        let dataSet;
        switch (activeScreen) {
            case 'ContractForm': dataSet = contractsData; break;
            case 'ClaimForm': dataSet = claimsData; break;
            case 'RenewalForm': dataSet = renewalsData; break;
            case 'CancellationForm': dataSet = cancellationsData; break;
            default: dataSet = [];
        }

        const existingIndex = dataSet.findIndex(item => item.id === updatedRecord.id);
        if (existingIndex !== -1) {
            Object.assign(dataSet[existingIndex], updatedRecord); // Update existing record
        } else {
            dataSet.push({ ...updatedRecord, id: generateId(), type: activeScreen.replace('Form', '') }); // Add new record
        }

        setSelectedRecord(null);
        goBack(); // Return to the list view or dashboard
    };

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.length > 2) {
            const allRecords = [...contractsData, ...claimsData, ...renewalsData, ...cancellationsData];
            const filtered = allRecords.filter(record => {
                const searchableFields = [
                    record.contractId, record.claimId, record.renewalId, record.cancellationId,
                    record.customerName, record.vehicleVIN, record.status, record.dealership
                ].filter(Boolean).join(' ').toLowerCase();
                return searchableFields.includes(term.toLowerCase()) && canAccess(record.type, 'canView', record);
            });
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    };

    const renderScreen = () => {
        const commonProps = { onBack: goBack, showToast };
        const canEditFn = (entityType, record) => canAccess(entityType, 'canEdit', record);
        const canApproveFn = (entityType, record) => canAccess(entityType, 'canApprove', record);
        const canAccessLogsFn = () => canAccess('AuditLogs');

        switch (activeScreen) {
            case 'Dashboard':
                return <Dashboard onNavigate={navigate} showToast={showToast} />;
            case 'ContractList':
                return <CardList title="Vehicle Service Contracts" entityType="Contract" items={contractsData} onCardClick={(r) => navigate('ContractDetail', r)} canCreate={() => canAccess('Contract', 'canCreate')} onAddClick={() => navigate('ContractForm')} canAccess={canAccess}/>;
            case 'ClaimList':
                return <CardList title="Service Claims" entityType="Claim" items={claimsData} onCardClick={(r) => navigate('ClaimDetail', r)} canCreate={() => canAccess('Claim', 'canCreate')} onAddClick={() => navigate('ClaimForm')} canAccess={canAccess}/>;
            case 'RenewalList':
                return <CardList title="Contract Renewals" entityType="Renewal" items={renewalsData} onCardClick={(r) => navigate('RenewalDetail', r)} canCreate={() => canAccess('Renewal', 'canCreate')} onAddClick={() => navigate('RenewalForm')} canAccess={canAccess}/>;
            case 'CancellationList':
                return <CardList title="Contract Cancellations" entityType="Cancellation" items={cancellationsData} onCardClick={(r) => navigate('CancellationDetail', r)} canCreate={() => canAccess('Cancellation', 'canCreate')} onAddClick={() => navigate('CancellationForm')} canAccess={canAccess}/>;
            case 'ContractDetail':
            case 'ClaimDetail':
            case 'RenewalDetail':
            case 'CancellationDetail':
                return <DetailPage
                    record={selectedRecord}
                    entityType={selectedRecord?.type}
                    onEdit={() => navigate(selectedRecord.type + 'Form', selectedRecord)}
                    canEdit={canEditFn}
                    canApprove={canApproveFn}
                    canAccessLogs={canAccessLogsFn()}
                    {...commonProps} />;
            case 'ContractForm':
            case 'ClaimForm':
            case 'RenewalForm':
            case 'CancellationForm':
                return <EntityForm entityType={activeScreen.replace('Form', '')} record={selectedRecord} onSave={handleSave} onCancel={goBack} {...commonProps} />;
            case 'AuditLogs':
                return (
                    <div className="full-screen-page">
                        <div className="detail-page-header">
                            <BackButton onClick={goBack} />
                            <h1 style={{flexGrow: 1, textAlign: 'center'}}>Application Audit Logs</h1>
                        </div>
                        <div className="detail-main-info" style={{maxWidth: 'unset', width: '100%'}}>
                            <AuditLogViewer logs={auditLogsData} canAccessLogs={canAccessLogsFn()} />
                        </div>
                    </div>
                );
            case 'LoginScreen':
            default:
                return (
                    <div className="full-screen-page" style={{ justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, var(--color-background-dark) 0%, var(--color-primary) 100%)', color: 'var(--color-text-light)' }}>
                        <div className="form-container" style={{maxWidth: '400px', textAlign: 'center'}}>
                            <h2 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-primary)' }}>Welcome to VSC Portal</h2>
                            <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-dark)' }}>Please select your role to login:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {Object.values(ROLES).map(role => (
                                    <button
                                        key={role}
                                        onClick={() => login(role)}
                                        className="button-primary"
                                        style={{ backgroundColor: 'var(--color-secondary)' }}
                                    >
                                        Login as {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    if (!user) {
        return renderScreen(); // Show LoginScreen if no user
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="app-header-title">VSC <span style={{color: 'var(--color-text-light)'}}>Portal</span></div>
                <div className="user-controls">
                    <button className="button-ghost" onClick={() => setShowSearch(true)} style={{ color: 'var(--color-text-light)' }}>
                        🔎 Global Search
                    </button>
                    <span className="user-info">Hello, {user.role}!</span>
                    <button onClick={logout} className="logout-button">Logout</button>
                </div>
            </header>

            <div className="main-content-area">
                <aside className="sidebar">
                    <nav>
                        <ul>
                            {canAccess('Dashboard') && <li><a href="#" className={activeScreen === 'Dashboard' ? 'active' : ''} onClick={() => navigate('Dashboard')}><span className="nav-icon">📊</span> Dashboard</a></li>}
                            {canAccess('ContractList') && <li><a href="#" className={activeScreen === 'ContractList' ? 'active' : ''} onClick={() => navigate('ContractList')}><span className="nav-icon">📄</span> Contracts</a></li>}
                            {canAccess('ClaimList') && <li><a href="#" className={activeScreen === 'ClaimList' ? 'active' : ''} onClick={() => navigate('ClaimList')}><span className="nav-icon">⚙️</span> Claims</a></li>}
                            {canAccess('RenewalList') && <li><a href="#" className={activeScreen === 'RenewalList' ? 'active' : ''} onClick={() => navigate('RenewalList')}><span className="nav-icon">🔄</span> Renewals</a></li>}
                            {canAccess('CancellationList') && <li><a href="#" className={activeScreen === 'CancellationList' ? 'active' : ''} onClick={() => navigate('CancellationList')}><span className="nav-icon">🚫</span> Cancellations</a></li>}
                            {canAccess('AuditLogs') && <li><a href="#" className={activeScreen === 'AuditLogs' ? 'active' : ''} onClick={() => navigate('AuditLogs')}><span className="nav-icon">🔍</span> Audit Logs</a></li>}
                            {canAccess('Reports') && <li><a href="#" className={activeScreen === 'Reports' ? 'active' : ''} onClick={() => showToast('Reports page coming soon!', 'info')}><span className="nav-icon">📈</span> Reports</a></li>}
                            {canAccess('SystemSettings') && <li><a href="#" className={activeScreen === 'SystemSettings' ? 'active' : ''} onClick={() => showToast('System Settings page coming soon!', 'info')}><span className="nav-icon">🛠️</span> System Settings</a></li>}
                        </ul>
                    </nav>
                </aside>

                <main className="content-wrapper">
                    {renderScreen()}
                </main>
            </div>

            {showSearch && (
                <div className="search-overlay" onClick={() => setShowSearch(false)}>
                    <div className="search-box" onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: 'var(--font-size-xl)' }}>🔎</span>
                        <input
                            type="text"
                            placeholder="Search contracts, claims, customers..."
                            className="search-input"
                            value={searchTerm}
                            onChange={handleSearch}
                            autoFocus
                        />
                        <button onClick={() => setShowSearch(false)} className="button-ghost">X</button>
                    </div>
                    {searchTerm.length > 2 && searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map(result => (
                                <div key={result.id} className="search-result-item" onClick={() => navigate(result.type + 'Detail', result)}>
                                    <h3>{result.contractId || result.claimId || result.renewalId || result.cancellationId} ({result.type})</h3>
                                    <p>{result.customerName} - {result.status.replace(/_/g, ' ')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                     {searchTerm.length > 2 && searchResults.length === 0 && (
                        <div className="search-results" style={{padding: 'var(--spacing-md)'}}>
                            <p style={{textAlign: 'center', color: '#666'}}>No results found for "{searchTerm}".</p>
                        </div>
                    )}
                </div>
            )}

            <div className="toast-container">
                {toastQueue.map(toast => (
                    <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </div>
    );
}

// Wrap App with AuthProvider
export default function WrappedApp() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}
