
const pool = require("../config/db");

const { get_order_details } = require("./orderTools");
const { search_return_policy } = require("./policyTools");
const { process_refund } = require("./refundTools");
const { escalate_to_human } = require("./escalationTools");

const generateAssistantResponse = async (
    ticketId,
    customerId,
    userMessage
) => {
    try {
        const message = userMessage.trim().toLowerCase();

        // 1. Verify ticket ownership
        const ticketResult = await pool.query(
            `SELECT id, order_id
             FROM tickets
             WHERE id = $1 AND customer_id = $2`,
            [ticketId, customerId]
        );

        if (ticketResult.rows.length === 0) {
            return {
                success: false,
                reply: "I couldn't find this support ticket."
            };
        }

        // 2. Retrieve recent conversation history
        const historyResult = await pool.query(
            `SELECT sender_type, content
             FROM messages
             WHERE ticket_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT 10`,
            [ticketId]
        );

        const history = historyResult.rows.reverse();

        // 3. Prompt injection protection
        const injectionPatterns = [
            /ignore (all )?(previous|prior|system) instructions/i,
            /reveal (your )?(system prompt|instructions)/i,
            /bypass (the )?(refund|security|authorization) rules/i,
            /override (the )?(system|policy|security)/i
        ];

        if (
            injectionPatterns.some(pattern =>
                pattern.test(userMessage)
            )
        ) {
            return {
                success: true,
                reply: "I can help with your order, return and refund questions, but I cannot bypass security checks or company policies."
            };
        }

        // 4. Check whether the assistant previously requested an order ID
        const lastAssistantIndex = history
            .map(item => item.sender_type)
            .lastIndexOf("assistant");

        const lastAssistantMessage =
            lastAssistantIndex >= 0
                ? history[lastAssistantIndex]
                : null;

        const assistantAskedForOrderId = lastAssistantMessage
            ? /(provide|share|enter|send).{0,50}order\s*(id|number)|order\s*(id|number).{0,50}(provide|share|enter|send)/i.test(
                lastAssistantMessage.content
            )
            : false;

        // 5. Recover the customer's previous request
        let requestMessage = userMessage;

        let previousCustomerMessage = null;

        if (assistantAskedForOrderId) {
            previousCustomerMessage = history
                .slice(0, lastAssistantIndex)
                .reverse()
                .find(item => item.sender_type === "customer");

            if (previousCustomerMessage) {
                requestMessage = previousCustomerMessage.content;
            }
        }

        const intentMessage = requestMessage.toLowerCase();

        // 6. Identify customer intent
        const isPolicy =
            /\b(policy|return window|eligible|return period)\b/i.test(
                intentMessage
            );

        const isRefund =
            /\b(refund|money back|damaged|defective)\b/i.test(
                intentMessage
            );

        const isEscalation =
            /\b(human|agent|representative|escalate|complaint)\b/i.test(
                message
            );

        const isOrderQuery =
            /\b(order|delivery|delivered|shipped|tracking|status)\b/i.test(
                intentMessage
            );

        // 7. Extract order ID from current message
        const orderIdMatch = userMessage.match(
            /\border\s*(?:id|number|#)?\s*[:#-]?\s*(\d+)\b/i
        );

        // Accept a standalone number only when waiting for an order ID
        const standaloneNumber = userMessage.trim().match(
            /^(?:order\s*)?#?\s*(\d+)$/
        );

        let orderId = null;

        if (orderIdMatch) {
            orderId = Number(orderIdMatch[1]);
        } else if (
            assistantAskedForOrderId &&
            standaloneNumber
        ) {
            orderId = Number(standaloneNumber[1]);
        }

        // 8. Ask for missing order ID
        if (
            (isRefund || isPolicy || isOrderQuery) &&
            !orderId
        ) {
            return {
                success: true,
                reply: "I'd be happy to help! Could you please provide your order ID so I can check the relevant details?"
            };
        }

        // 9. Retrieve order and verify ownership
        let order = null;

        if (
            orderId &&
            (isRefund || isPolicy || isOrderQuery)
        ) {
            const orderResult = await get_order_details(
                orderId,
                customerId
            );

            if (!orderResult.success) {
                return {
                    success: true,
                    reply: "I couldn't find that order under your account. Please check the order ID."
                };
            }

            order = orderResult.order;
        }

        // 10. Handle refund requests
        if (isRefund && order) {
            const policyResult = await search_return_policy(
                order.category
            );

            if (!policyResult.success) {
                return {
                    success: false,
                    reply: "I'm unable to retrieve the return policy right now. Please try again later."
                };
            }

            const refundResult = await process_refund(
                orderId,
                requestMessage,
                customerId,
                ticketId,
                `ticket-${ticketId}-order-${orderId}`
            );

            return {
                success: refundResult.success,
                reply: refundResult.message,
                data: {
                    order,
                    policy: policyResult.policy,
                    refund: refundResult.refund || null
                }
            };
        }

        // 11. Handle return policy questions
        if (isPolicy && order) {
            const policyResult = await search_return_policy(
                order.category
            );

            if (!policyResult.success) {
                return {
                    success: false,
                    reply: "I'm unable to retrieve the return policy right now. Please try again later."
                };
            }

            return {
                success: true,
                reply: `Here is the return policy for ${order.category} products:\n${policyResult.policy}`
            };
        }

        // 12. Handle order status questions
        if (isOrderQuery && order) {
            return {
                success: true,
                reply: `Your order #${order.id} is currently ${order.status}. Product: ${order.item_name}. Amount: INR ${order.total_amount}. Delivery date: ${order.delivery_date || "Not yet delivered"}.`
            };
        }

        // 13. Handle human escalation
        if (isEscalation) {
            const escalationResult = await escalate_to_human(
                ticketId,
                userMessage,
                "medium",
                customerId
            );

            return {
                success: escalationResult.success,
                reply: escalationResult.message
            };
        }

        // 14. Default response
        return {
            success: true,
            reply: "Hello! I'm your customer support assistant. I can help you with orders, delivery information, return policies and refund requests. What would you like help with?"
        };

    } catch (error) {
        console.error(
            "Assistant service error:",
            error.message
        );

        return {
            success: false,
            reply: "I'm experiencing a technical issue. Your request could not be completed. Please try again later."
        };
    }
};

module.exports = {
    generateAssistantResponse
};
