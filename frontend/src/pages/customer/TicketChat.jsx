
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api/axios";
import "./TicketChat.css";

function TicketChat() {
  const { ticketId } = useParams();

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // Load messages for the current ticket


  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      try {
        const response = await API.get(`/messages/${ticketId}`);

        if (active) {
          setMessages(response.data.messages || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load chat messages."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchMessages();

    return () => {
      active = false;
    };
  }, [ticketId]);

  // Scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send a message to the AI assistant
  const handleSend = async (e) => {
    e.preventDefault();

    const messageText = content.trim();

    if (!messageText || sending) return;

    setSending(true);
    setError("");
    setContent("");

    try {
      const response = await API.post(`/assistant/${ticketId}`, {
        content: messageText,
      });

      const { customerMessage, assistantMessage } = response.data;

      setMessages((previous) => [
        ...previous,
        customerMessage,
        assistantMessage,
      ]);
    } catch (err) {
      setContent(messageText);
      setError(
        err.response?.data?.message ||
          "Unable to send your message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div>
          <h1>AI Support Assistant</h1>
          <p>Ticket #{ticketId}</p>
        </div>

        <Link to="/customer/dashboard" className="back-button">
          Back to Dashboard
        </Link>
      </header>

      <main className="chat-container">
        <div className="chat-intro">
          <h2>How can we help you?</h2>
          <p>
            Ask about your order, delivery, return policy, or refund.
          </p>
        </div>

        <div className="chat-messages">
          {loading ? (
            <p className="chat-info">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <div className="chat-info">
              <p>No messages yet.</p>
              <p>Send a message to start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || `${message.sender_type}-${index}`}
                className={`message-row ${
                  message.sender_type === "customer"
                    ? "customer-row"
                    : "assistant-row"
                }`}
              >
                <div
                  className={`message-bubble ${
                    message.sender_type === "customer"
                      ? "customer-bubble"
                      : "assistant-bubble"
                  }`}
                >
                  <span className="message-sender">
                    {message.sender_type === "customer"
                      ? "You"
                      : message.sender_type === "agent"
                        ? "Support Agent"
                        : "AI Assistant"}
                  </span>

                  <p>{message.content}</p>

                  <span className="message-time">
                    {message.created_at
                      ? new Date(message.created_at).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : ""}
                  </span>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="message-row assistant-row">
              <div className="message-bubble assistant-bubble typing">
                Assistant is typing...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <div className="chat-error">{error}</div>}

        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type your message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={sending || loading}
          />

          <button
            type="submit"
            disabled={sending || loading || !content.trim()}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default TicketChat;
