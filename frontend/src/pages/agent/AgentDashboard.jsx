
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import "./AgentDashboard.css";

function AgentDashboard() {
    const { user, logout } = useAuth();

    const [tickets, setTickets] = useState([]);
    const [escalations, setEscalations] = useState([]);
    const [refunds, setRefunds] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [notes, setNotes] = useState({});
    const [internalNotes, setInternalNotes] = useState({});
    const [ticketNotes, setTicketNotes] = useState({});

    const [statusFilter, setStatusFilter] = useState("all");

    // Load dashboard information
    const fetchDashboardData = useCallback(async () => {
        try {
            setError("");

            const [ticketResponse, escalationResponse, refundResponse] =
                await Promise.all([
                    API.get("/agent/tickets"),
                    API.get("/agent/escalations"),
                    API.get("/agent/refunds/pending")
                ]);

            setTickets(ticketResponse.data.tickets || []);
            setEscalations(escalationResponse.data.escalations || []);
            setRefunds(refundResponse.data.refunds || []);
        } catch (err) {
            console.error("Dashboard loading error:", err);
            setError(
                err.response?.data?.message ||
                "Unable to load dashboard information."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDashboardData();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchDashboardData]);

    // Show success message
    const showSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(""), 4000);
    };

    // Update ticket status
    const updateTicketStatus = async (ticketId, status) => {
        try {
            await API.patch(`/agent/tickets/${ticketId}/status`, {
                status
            });

            showSuccess(`Ticket #${ticketId} status updated successfully.`);
            fetchDashboardData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update ticket status."
            );
        }
    };

    // Add internal note
    const addInternalNote = async (ticketId) => {
        const content = notes[ticketId]?.trim();

        if (!content) {
            setError("Please enter an internal note.");
            return;
        }

        try {
            await API.post(`/agent/tickets/${ticketId}/notes`, {
                content
            });

            setNotes((previous) => ({
                ...previous,
                [ticketId]: ""
            }));

            showSuccess(`Internal note added to ticket #${ticketId}.`);
            fetchTicketNotes(ticketId);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to add internal note."
            );
        }
    };

    // Fetch internal notes
    const fetchTicketNotes = async (ticketId) => {
        try {
            const response = await API.get(
                `/agent/tickets/${ticketId}/notes`
            );

            setTicketNotes((previous) => ({
                ...previous,
                [ticketId]: response.data.notes || []
            }));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load internal notes."
            );
        }
    };

    // Review escalation
    const reviewEscalation = async (escalationId, decision) => {
        try {
            await API.patch(
                `/agent/escalations/${escalationId}/review`,
                {
                    decision,
                    internalNote: internalNotes[escalationId] || ""
                }
            );

            setInternalNotes((previous) => ({
                ...previous,
                [escalationId]: ""
            }));

            showSuccess(
                `Escalation #${escalationId} updated successfully.`
            );

            fetchDashboardData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to review escalation."
            );
        }
    };

    // Review refund
    const reviewRefund = async (refundId, decision) => {
        try {
            await API.patch(`/agent/refunds/${refundId}/review`, {
                decision
            });

            showSuccess(
                `Refund #${refundId} ${decision}d successfully.`
            );

            fetchDashboardData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to review refund."
            );
        }
    };

    // Filter tickets
    const filteredTickets = tickets.filter((ticket) => {
        if (statusFilter === "all") return true;
        return ticket.status === statusFilter;
    });

    if (loading) {
        return (
            <div className="agent-dashboard">
                <h2>Loading Agent Dashboard...</h2>
            </div>
        );
    }

    return (
        <div className="agent-dashboard">

            <header className="agent-header">
                <div>
                    <h1>Agent Dashboard</h1>
                    <p>Welcome, {user?.name || "Agent"}!</p>
                </div>

                <button onClick={logout} className="logout-button">
                    Logout
                </button>
            </header>

            {error && (
                <div className="agent-error">
                    {error}
                    <button onClick={() => setError("")}>×</button>
                </div>
            )}

            {success && (
                <div className="agent-success">
                    {success}
                </div>
            )}

            <button
                className="refresh-button"
                onClick={fetchDashboardData}
            >
                Refresh Dashboard
            </button>

            {/* Dashboard statistics */}
            <section className="agent-stats">
                <div className="stat-card">
                    <h3>Total Tickets</h3>
                    <p>{tickets.length}</p>
                </div>

                <div className="stat-card">
                    <h3>Pending Escalations</h3>
                    <p>
                        {escalations.filter(
                            (item) => item.decision === "pending"
                        ).length}
                    </p>
                </div>

                <div className="stat-card">
                    <h3>Pending Refunds</h3>
                    <p>{refunds.length}</p>
                </div>
            </section>

            {/* All support tickets */}
            <section className="agent-section">
                <h2>All Support Tickets</h2>

                <div className="filter-container">
                    <label htmlFor="ticket-filter">
                        Filter by status:
                    </label>

                    <select
                        id="ticket-filter"
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                    >
                        <option value="all">All Tickets</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>

                {filteredTickets.length === 0 ? (
                    <p>No support tickets found.</p>
                ) : (
                    filteredTickets.map((ticket) => (
                        <div className="agent-ticket-card" key={ticket.id}>
                            <h3>{ticket.subject}</h3>

                            <p>Ticket #{ticket.id}</p>
                            <p>Customer: {ticket.customer_name}</p>
                            <p>Category: {ticket.category}</p>
                            <p>Priority: {ticket.priority}</p>
                            <p>Status: {ticket.status}</p>

                            <div className="ticket-status-control">
                                <label>Update Status:</label>

                                <select
                                    value={ticket.status}
                                    onChange={(event) =>
                                        updateTicketStatus(
                                            ticket.id,
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">
                                        In Progress
                                    </option>
                                    <option value="escalated">
                                        Escalated
                                    </option>
                                    <option value="resolved">
                                        Resolved
                                    </option>
                                </select>
                            </div>

                            <div className="internal-note-section">
                                <h4>Internal Notes</h4>

                                <textarea
                                    placeholder="Write an internal note..."
                                    value={notes[ticket.id] || ""}
                                    onChange={(event) =>
                                        setNotes((previous) => ({
                                            ...previous,
                                            [ticket.id]: event.target.value
                                        }))
                                    }
                                />

                                <button
                                    onClick={() =>
                                        addInternalNote(ticket.id)
                                    }
                                >
                                    Add Note
                                </button>

                                <button
                                    onClick={() =>
                                        fetchTicketNotes(ticket.id)
                                    }
                                >
                                    View Notes
                                </button>

                                {ticketNotes[ticket.id]?.map((note) => (
                                    <div
                                        className="internal-note-item"
                                        key={note.id}
                                    >
                                        <p>{note.content}</p>
                                        <small>
                                            By: {note.agent_name || "Agent"}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </section>

            {/* Escalations */}
            <section className="agent-section">
                <h2>Escalated Cases</h2>

                {escalations.length === 0 ? (
                    <p>No escalations found.</p>
                ) : (
                    escalations.map((item) => (
                        <div
                            className="agent-escalation-card"
                            key={item.id}
                        >
                            <h3>Escalation #{item.id}</h3>

                            <p>Ticket #{item.ticket_id}</p>
                            <p>Customer: {item.customer_name}</p>
                            <p>Subject: {item.subject}</p>
                            <p>Priority: {item.priority}</p>
                            <p>Summary: {item.summary}</p>
                            <p>Decision: {item.decision}</p>

                            {item.decision === "pending" && (
                                <>
                                    <textarea
                                        placeholder="Add your review note..."
                                        value={
                                            internalNotes[item.id] || ""
                                        }
                                        onChange={(event) =>
                                            setInternalNotes((previous) => ({
                                                ...previous,
                                                [item.id]: event.target.value
                                            }))
                                        }
                                    />

                                    <div className="escalation-actions">
                                        <button
                                            onClick={() =>
                                                reviewEscalation(
                                                    item.id,
                                                    "approve"
                                                )
                                            }
                                        >
                                            Approve
                                        </button>

                                        <button
                                            onClick={() =>
                                                reviewEscalation(
                                                    item.id,
                                                    "reject"
                                                )
                                            }
                                        >
                                            Reject
                                        </button>

                                        <button
                                            onClick={() =>
                                                reviewEscalation(
                                                    item.id,
                                                    "more_info"
                                                )
                                            }
                                        >
                                            Request More Info
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </section>

            {/* Pending refunds */}
            <section className="agent-section">
                <h2>Pending Refund Requests</h2>

                {refunds.length === 0 ? (
                    <p>No pending refund requests.</p>
                ) : (
                    refunds.map((refund) => {
                        const refundId =
                            refund.refund_id ?? refund.id;

                        return (
                            <div
                                className="agent-refund-card"
                                key={refundId}
                            >
                                <h3>Refund #{refundId}</h3>

                                <p>Order ID: #{refund.order_id}</p>
                                <p>Customer: {refund.customer_name}</p>
                                <p>Email: {refund.customer_email}</p>
                                <p>Product: {refund.item_name}</p>
                                <p>Amount: ₹{refund.amount}</p>
                                <p>Reason: {refund.reason}</p>
                                <p>Status: {refund.status}</p>

                                <div className="refund-actions">
                                    <button
                                        className="refund-approve"
                                        onClick={() =>
                                            reviewRefund(
                                                refundId,
                                                "approve"
                                            )
                                        }
                                    >
                                        Approve Refund
                                    </button>

                                    <button
                                        className="refund-reject"
                                        onClick={() =>
                                            reviewRefund(
                                                refundId,
                                                "reject"
                                            )
                                        }
                                    >
                                        Reject Refund
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

        </div>
    );
}

export default AgentDashboard;
