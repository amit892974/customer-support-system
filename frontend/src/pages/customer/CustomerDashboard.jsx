
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import "./CustomerDashboard.css";

function CustomerDashboard() {
    const { user, logout } = useAuth();

    const [orders, setOrders] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [refunds, setRefunds] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [creatingTicket, setCreatingTicket] = useState(false);

    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("general");
    const [orderId, setOrderId] = useState("");

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            setError("");

            const [
                ordersResponse,
                ticketsResponse,
                refundsResponse
            ] = await Promise.all([
                API.get("/orders"),
                API.get("/tickets"),
                API.get("/refunds")
            ]);

            setOrders(ordersResponse.data.orders || []);
            setTickets(ticketsResponse.data.tickets || []);
            setRefunds(refundsResponse.data.refunds || []);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load dashboard data. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const loadDashboard = async () => {
            try {
                const [
                    ordersResponse,
                    ticketsResponse,
                    refundsResponse
                ] = await Promise.all([
                    API.get("/orders"),
                    API.get("/tickets"),
                    API.get("/refunds")
                ]);

                if (active) {
                    setOrders(ordersResponse.data.orders || []);
                    setTickets(ticketsResponse.data.tickets || []);
                    setRefunds(refundsResponse.data.refunds || []);
                    setError("");
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load dashboard data. Please try again."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadDashboard();

        return () => {
            active = false;
        };
    }, []);

    // Create support ticket
    const handleCreateTicket = async (e) => {
        e.preventDefault();

        try {
            setCreatingTicket(true);
            setError("");

            await API.post("/tickets", {
                subject,
                description,
                category,
                orderId: orderId || undefined
            });

            setSubject("");
            setDescription("");
            setCategory("general");
            setOrderId("");

            await fetchDashboardData();

            alert("Support ticket created successfully!");

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to create ticket. Please try again."
            );
        } finally {
            setCreatingTicket(false);
        }
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return "Not available";
        return new Date(date).toLocaleDateString("en-IN");
    };

    // Format currency
    const formatAmount = (amount) => {
        return Number(amount || 0).toLocaleString("en-IN");
    };

    // Format status text
    const formatStatus = (status) => {
        if (!status) return "Unknown";

        return status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="customer-dashboard">

            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1>Customer Support Portal</h1>
                    <p>Welcome, {user?.name || "Customer"}!</p>
                </div>

                <button
                    className="logout-button"
                    onClick={logout}
                >
                    Logout
                </button>
            </header>

            {error && (
                <div className="dashboard-error">
                    {error}
                </div>
            )}

            {/* Dashboard Statistics */}
            <section className="dashboard-stats">
                <div className="stat-card">
                    <h3>Total Orders</h3>
                    <p>{orders.length}</p>
                </div>

                <div className="stat-card">
                    <h3>Support Tickets</h3>
                    <p>{tickets.length}</p>
                </div>

                <div className="stat-card">
                    <h3>Total Refunds</h3>
                    <p>{refunds.length}</p>
                </div>
            </section>

            {/* My Orders */}
            <section className="dashboard-section">
                <h2>My Orders</h2>

                {orders.length === 0 ? (
                    <p className="empty-message">
                        You don't have any orders yet.
                    </p>
                ) : (
                    <div className="dashboard-table-wrapper">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Product</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Delivery Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>{order.item_name}</td>
                                        <td>
                                            ₹{formatAmount(order.total_amount)}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${order.status}`}>
                                                {formatStatus(order.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {formatDate(order.delivery_date)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Create Support Ticket */}
            <section className="dashboard-section">
                <h2>Create a Support Ticket</h2>

                <form
                    className="ticket-form"
                    onSubmit={handleCreateTicket}
                >
                    <div className="form-group">
                        <label htmlFor="ticket-subject">
                            Subject
                        </label>

                        <input
                            id="ticket-subject"
                            type="text"
                            placeholder="Enter ticket subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="ticket-category">
                            Category
                        </label>

                        <select
                            id="ticket-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="general">General</option>
                            <option value="electronics">Electronics</option>
                            <option value="fashion">Fashion</option>
                            <option value="refund">Refund</option>
                            <option value="delivery">Delivery</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ticket-order">
                            Related Order (Optional)
                        </label>

                        <select
                            id="ticket-order"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                        >
                            <option value="">No order selected</option>

                            {orders.map((order) => (
                                <option
                                    key={order.id}
                                    value={order.id}
                                >
                                    Order #{order.id} - {order.item_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ticket-description">
                            Description
                        </label>

                        <textarea
                            id="ticket-description"
                            placeholder="Explain your issue..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={creatingTicket}
                    >
                        {creatingTicket ? "Creating..." : "Create Ticket"}
                    </button>
                </form>
            </section>

            {/* My Support Tickets */}
            <section className="dashboard-section">
                <h2>My Support Tickets</h2>

                {tickets.length === 0 ? (
                    <p className="empty-message">
                        You haven't created any tickets yet.
                    </p>
                ) : (
                    <div className="ticket-list">
                        {tickets.map((ticket) => (
                            <div
                                className="ticket-card"
                                key={ticket.id}
                            >
                                <div>
                                    <h3>{ticket.subject}</h3>

                                    <p>Ticket ID: #{ticket.id}</p>

                                    <p>
                                        Created: {formatDate(ticket.created_at)}
                                    </p>

                                    <a
                                        href={`/customer/tickets/${ticket.id}/chat`}
                                        className="open-chat-link"
                                    >
                                        Open AI Support Chat →
                                    </a>
                                </div>

                                <span className={`status-badge ${ticket.status}`}>
                                    {formatStatus(ticket.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* My Refunds */}
            <section className="dashboard-section">
                <h2>My Refunds</h2>

                {refunds.length === 0 ? (
                    <p className="empty-message">
                        You haven't requested any refunds yet.
                    </p>
                ) : (
                    <div className="dashboard-table-wrapper">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>Refund ID</th>
                                    <th>Order ID</th>
                                    <th>Product</th>
                                    <th>Amount</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Requested On</th>
                                </tr>
                            </thead>

                            <tbody>
                                {refunds.map((refund) => (
                                    <tr key={refund.refund_id || refund.id}>
                                        <td>
                                            #{refund.refund_id || refund.id}
                                        </td>
                                        <td>#{refund.order_id}</td>
                                        <td>
                                            {refund.item_name || "Not available"}
                                        </td>
                                        <td>
                                            ₹{formatAmount(refund.amount)}
                                        </td>
                                        <td>
                                            {refund.reason || "Not specified"}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${refund.status}`}>
                                                {formatStatus(refund.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {formatDate(refund.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

        </div>
    );
}

export default CustomerDashboard;
