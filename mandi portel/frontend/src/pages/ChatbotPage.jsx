import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
    Bot, 
    Send, 
    Sparkles, 
    HelpCircle, 
    RefreshCw, 
    Search, 
    Layers, 
    CheckCircle2, 
    FileText, 
    X, 
    ChevronRight,
    Calendar,
    PhoneCall,
    UserCheck,
    Play,
    Check,
    AlertCircle
} from "lucide-react";
import "./ChatbotPage.css";

// Mandi Operations Knowledge Base
const FAQ_DATABASE = [
    {
        category: "Queue & Tokens",
        icon: "📋",
        questions: [
            {
                q: "What is the token lifecycle in Mandi Portal?",
                a: "A token progresses through the following stages:\n1. WAITING: Farmer booked a slot and is waiting in the queue.\n2. CALLED: Counter operator clicks 'Call Next Farmer'.\n3. ARRIVED: Farmer reports to the counter physical desk.\n4. PROCESSING: Physical crop weighing and quality inspection begins.\n5. COMPLETED: Sale finalized, quality grade recorded, and official payment record generated."
            },
            {
                q: "How do I call the next waiting farmer?",
                a: "Navigate to your assigned Counter Desk from the Dashboard or Counters list, and click the 'Call Next Farmer' button in the counter header. The system automatically fetches the lowest queue position token for today's active service date."
            },
            {
                q: "What happens if a farmer does not arrive after being called?",
                a: "Click 'No Show' (Mark Not Arrived) next to the token in the queue table. The token status transitions to NOT_ARRIVED. This frees up the counter to call the next farmer in line."
            },
            {
                q: "Can counter operators reschedule a farmer from the Mandi Portal?",
                a: "No. Mandi Portal operators do not reschedule tokens directly. When a farmer is marked NOT_ARRIVED or misses their slot, rescheduling must be performed by the farmer themselves via the Farmer Portal."
            },
            {
                q: "Can I undo or revert a completed token?",
                a: "No. Once a token is marked COMPLETED, government procurement payment records and MongoDB audit logs are permanently locked to guarantee financial compliance."
            }
        ]
    },
    {
        category: "Future Dates",
        icon: "📅",
        questions: [
            {
                q: "Why are action buttons disabled for future dates?",
                a: "Per government regulations, counter operations (Call Next, Arrive, Start Process, Complete Sale, No Show) are strictly permitted ONLY for today's active service date. Farmers scheduled for tomorrow or future dates are displayed in 'View Only' mode to prevent premature check-ins."
            },
            {
                q: "How do I view future scheduled farmers?",
                a: "Open any Counter Desk and use the 7-day date selector bar below the counter header. Click any date within the permitted 7-day window to view upcoming bookings and planned capacity utilization."
            },
            {
                q: "Can I call a farmer scheduled for tomorrow if they arrive early today?",
                a: "No. Counter operators cannot call future-dated tokens. The farmer must have an active booking slot for today's date."
            }
        ]
    },
    {
        category: "Quality & MSP Rates",
        icon: "🌾",
        questions: [
            {
                q: "How is the payment rate calculated for a farmer?",
                a: "Payment rates are dynamically calculated using official government procurement quotas:\n\nFormula: Rate = LSP + Quality_Factor * (MSP - LSP)\n\n• Grade A (High Quality): Quality Factor = 1.0 (Farmer receives 100% MSP)\n• Grade B (Medium Quality): Quality Factor = 0.5 (Midpoint between MSP and LSP)\n• Grade C (Standard Quality): Quality Factor = 0.0 (Guaranteed Minimum LSP)"
            },
            {
                q: "What are MSP and LSP?",
                a: "• MSP: Minimum Support Price set by the central/state government.\n• LSP: Lowest Support Price below which no procurement transaction may legally occur.\nBoth values are configured by Government Administrators in the Government Portal."
            },
            {
                q: "Where does the payment record go after completing a sale?",
                a: "A formal payment record is created in MySQL with status 'PENDING' for disbursement. You can review all completed farmer transactions and payments on the 'Completed Farmers' page."
            }
        ]
    },
    {
        category: "Counter Capacity",
        icon: "⚖️",
        questions: [
            {
                q: "How is counter daily capacity measured?",
                a: "Each Mandi and Mandi Counter has an approved daily capacity specified in Metric Tons (MT) configured by the Government Portal. In contrast, the crop brought and sold by farmers is weighed and accounted in Quintals (Qtl), where 1 MT = 10 Quintals. Capacity is tracked for each service date and resets automatically every calendar day."
            },
            {
                q: "Why does my counter say INACTIVE?",
                a: "Counters are configured by Government administrators. If a counter is marked INACTIVE in the master database, operational actions (Call, Arrive, Process, Complete) are temporarily locked."
            },
            {
                q: "What does the capacity meter show on the counter desk?",
                a: "It displays the total crop quantity brought by farmers (in Quintals - Qtl) versus the counter's approved daily capacity (in Metric Tons - MT and equivalent Qtl), along with the percentage procured and remaining balance for the day."
            }
        ]
    },
    {
        category: "Mandi Settings",
        icon: "⚙️",
        questions: [
            {
                q: "How do I change Mandi operating hours or working days?",
                a: "Go to 'Mandi Settings' from the sidebar. You can configure daily opening and closing hours, as well as weekly working days (Monday - Sunday)."
            },
            {
                q: "Why do I need a password to update Mandi hours?",
                a: "Changing facility hours or working days directly impacts farmer booking schedules and SMS notifications across the state. A confirmation password is required for security."
            },
            {
                q: "Where are operational audit logs stored?",
                a: "All operational actions (calling, arrivals, completed payments, and token state transitions) are recorded in real time in MongoDB collections (MandiRecentLogs, TokenHistory, PaymentHistory)."
            }
        ]
    }
];

export default function ChatbotPage() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "bot",
            text: "Hello! 👋 I am your Mandi Operational AI Assistant.\n\nI can assist you with counter queues, token lifecycles, MSP payment calculation, quality grading, and counter capacity management.\n\nHow can I help you today? You can choose a topic chip or ask any operational question.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            suggestions: [
                "What is the token lifecycle?",
                "Why are future dates view-only?",
                "How is payment rate calculated?",
                "How do I call the next farmer?"
            ]
        }
    ]);

    const [inputQuery, setInputQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [searchFilter, setSearchFilter] = useState("");
    const [isFlowchartOpen, setIsFlowchartOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState("chat"); // "chat" | "faqs"

    const messagesEndRef = useRef(null);

    // Auto scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const categories = useMemo(() => {
        return ["ALL", ...FAQ_DATABASE.map(c => c.category)];
    }, []);

    // Flatten all FAQs for search
    const allFaqs = useMemo(() => {
        const list = [];
        FAQ_DATABASE.forEach(cat => {
            cat.questions.forEach(q => {
                list.push({ ...q, category: cat.category, icon: cat.icon });
            });
        });
        return list;
    }, []);

    // Filtered FAQs for sidebar
    const filteredSidebarFaqs = useMemo(() => {
        return allFaqs.filter(item => {
            const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
            const matchesSearch = !searchFilter.trim() || 
                item.q.toLowerCase().includes(searchFilter.toLowerCase()) || 
                item.a.toLowerCase().includes(searchFilter.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [allFaqs, selectedCategory, searchFilter]);

    // Intelligent answer engine
    const findAnswer = (questionText) => {
        const q = questionText.trim().toLowerCase();

        // 1. Basic greetings & standard inquiries
        if (/^(hi|hello|hey|namaste|greetings)\b/i.test(q)) {
            return "Hello! 👋 How can I assist you with your Mandi Counter operations today?";
        }
        if (/who are you|what can you do|help/i.test(q)) {
            return "I am the Mandi Operations Helpdesk Assistant. I can help you with:\n• Calling and managing farmer queues\n• Quality grading (Grade A, B, C) and MSP rates\n• 7-day schedule window & view-only rules for future dates\n• Counter capacity and facility operational hours.";
        }
        if (/thank/i.test(q)) {
            return "You're very welcome! 😊 Let me know if you need assistance with any other counter tasks.";
        }
        if (/bye|goodbye/i.test(q)) {
            return "Goodbye! Have a productive and efficient procurement session today! 🌾";
        }
        if (/flowchart|workflow|lifecycle|diagram|steps/i.test(q)) {
            setIsFlowchartOpen(true);
            return "I have opened the Mandi Operational Flowchart modal for you. It outlines the complete token lifecycle from slot booking to payment.";
        }

        // 2. Exact match
        const exact = allFaqs.find(item => item.q.toLowerCase() === q);
        if (exact) return exact.a;

        // 3. Substring match
        const partial = allFaqs.find(item => item.q.toLowerCase().includes(q) || q.includes(item.q.toLowerCase()));
        if (partial) return partial.a;

        // 4. Keyword token scoring
        const tokens = q.split(/\s+/).filter(t => t.length > 2);
        let bestMatch = null;
        let highestScore = 0;

        allFaqs.forEach(item => {
            let score = 0;
            const target = (item.q + " " + item.a).toLowerCase();
            tokens.forEach(tok => {
                if (target.includes(tok)) score++;
            });
            if (score > highestScore) {
                highestScore = score;
                bestMatch = item;
            }
        });

        if (highestScore >= 2 && bestMatch) {
            return bestMatch.a;
        }

        // Fallback
        return "I couldn't find a direct answer for your query. Try clicking on one of the Popular Questions in the sidebar, or review the Mandi Operational Flowchart by clicking 'View Workflow Flowchart' at the top.";
    };

    const handleSendMessage = (textToSend) => {
        const text = (textToSend || inputQuery).trim();
        if (!text) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const userMsg = {
            id: Date.now(),
            sender: "user",
            text: text,
            timestamp: timeStr
        };

        const answer = findAnswer(text);

        const botMsg = {
            id: Date.now() + 1,
            sender: "bot",
            text: answer,
            timestamp: timeStr,
            suggestions: [
                "What is the token lifecycle?",
                "How is payment rate calculated?",
                "Why are future dates view-only?"
            ]
        };

        setMessages(prev => [...prev, userMsg, botMsg]);
        setInputQuery("");
        setMobileTab("chat");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: Date.now(),
                sender: "bot",
                text: "Chat cleared. How can I help you with Mandi operations?",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                suggestions: [
                    "What is the token lifecycle?",
                    "Why are future dates view-only?",
                    "How is payment rate calculated?"
                ]
            }
        ]);
    };

    return (
        <div className="chatbot-page-container">
            {/* Header */}
            <div className="chatbot-header">
                <div className="chatbot-header-left">
                    <div className="chatbot-avatar-badge">
                        <Bot size={28} />
                    </div>
                    <div className="chatbot-title-box">
                        <h1>
                            <span>Mandi Operational AI Assistant</span>
                            <span className="chatbot-status-pill">
                                <span className="chatbot-status-dot" /> Online
                            </span>
                        </h1>
                        <p className="chatbot-header-desc">
                            Real-time intelligence on counter queues, quality grading, government MSP quotas, and daily procurement limits.
                        </p>
                    </div>
                </div>

                <div className="chatbot-header-actions">
                    <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={() => setIsFlowchartOpen(true)}
                        title="View Mandi Operational Workflow"
                    >
                        <Layers size={14} />
                        <span className="btn-label-desktop">Workflow Flowchart</span>
                        <span className="btn-label-mobile">Flowchart</span>
                    </button>

                    <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={clearChat}
                        title="Reset conversation"
                    >
                        <RefreshCw size={14} />
                        <span className="btn-label-desktop">Reset Chat</span>
                        <span className="btn-label-mobile">Reset</span>
                    </button>
                </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="chatbot-mobile-nav">
                <button
                    type="button"
                    className={`chatbot-mobile-tab ${mobileTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setMobileTab('chat')}
                >
                    <Bot size={15} />
                    <span>Live Chat</span>
                </button>
                <button
                    type="button"
                    className={`chatbot-mobile-tab ${mobileTab === 'faqs' ? 'active' : ''}`}
                    onClick={() => setMobileTab('faqs')}
                >
                    <HelpCircle size={15} />
                    <span>FAQs & Rules ({filteredSidebarFaqs.length})</span>
                </button>
            </div>

            {/* Two-Column Grid */}
            <div className={`chatbot-grid mobile-tab-${mobileTab}`}>
                {/* Left/Center: Interactive Chat Panel */}
                <div className="chatbot-main-panel">
                    {/* Category Filter Chips */}
                    <div className="chatbot-chips-bar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                className={`chatbot-chip ${selectedCategory === cat ? "active" : ""}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Quick Category Questions Pills (when a specific category is selected) */}
                    {selectedCategory !== "ALL" && (
                        <div className="chatbot-category-questions-bar">
                            <div className="cat-q-header">
                                <span>Suggested questions for <strong>{selectedCategory}</strong>:</span>
                                <button 
                                    type="button" 
                                    className="cat-q-clear-btn" 
                                    onClick={() => setSelectedCategory("ALL")}
                                >
                                    ✕ Clear
                                </button>
                            </div>
                            <div className="cat-q-pills">
                                {FAQ_DATABASE.find(c => c.category === selectedCategory)?.questions.map((qItem, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="cat-q-pill"
                                        onClick={() => handleSendMessage(qItem.q)}
                                    >
                                        <Sparkles size={12} />
                                        <span>{qItem.q}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages Feed */}
                    <div className="chatbot-messages-feed">
                        {messages.map(msg => (
                            <div key={msg.id} className={`chat-bubble-row ${msg.sender}`}>
                                <div className={`chat-avatar ${msg.sender}`}>
                                    {msg.sender === "bot" ? <Bot size={18} /> : "OP"}
                                </div>
                                <div className="chat-bubble-content">
                                    <div className="chat-bubble">
                                        {msg.text}
                                    </div>
                                    <span className="chat-time">{msg.timestamp}</span>

                                    {/* Bot Follow-up Suggestions */}
                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="chat-suggestions-box">
                                            {msg.suggestions.map((sug, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className="suggestion-pill"
                                                    onClick={() => handleSendMessage(sug)}
                                                >
                                                    <Sparkles size={12} style={{ display: "inline", marginRight: "4px" }} />
                                                    {sug}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <div className="chatbot-input-bar">
                        <input
                            type="text"
                            className="chatbot-input-field"
                            placeholder="Ask about tokens, MSP, counter capacity..."
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            type="button"
                            className="btn btn-primary chatbot-send-btn"
                            onClick={() => handleSendMessage()}
                            disabled={!inputQuery.trim()}
                        >
                            <Send size={15} />
                            <span>Send</span>
                        </button>
                    </div>
                </div>

                {/* Right: Knowledge Sidebar */}
                <div className="chatbot-sidebar">
                    {/* Topic Search Card */}
                    <div className="chatbot-side-card">
                        <div className="side-card-title">
                            <HelpCircle size={16} color="var(--primary)" />
                            <span>Operational FAQs</span>
                        </div>

                        <div className="faq-search-box">
                            <Search size={14} className="faq-search-icon" />
                            <input
                                type="text"
                                placeholder="Search questions..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                            />
                        </div>

                        {/* Category filter pills inside FAQ card */}
                        <div className="faq-chips-filter">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`chatbot-chip ${selectedCategory === cat ? "active" : ""}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="popular-questions-list">
                            {filteredSidebarFaqs.length > 0 ? (
                                filteredSidebarFaqs.map((faq, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="popular-question-item"
                                        onClick={() => {
                                            handleSendMessage(faq.q);
                                            setMobileTab("chat");
                                        }}
                                        title="Click to ask"
                                    >
                                        <ChevronRight size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                                        <span>{faq.q}</span>
                                    </button>
                                ))
                            ) : (
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "12px", textAlign: "center" }}>
                                    No FAQs found matching your search.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Operational Summary Card */}
                    <div className="chatbot-side-card">
                        <div className="side-card-title">
                            <Layers size={16} color="var(--secondary)" />
                            <span>Quick Rules Reference</span>
                        </div>

                        <div className="workflow-step-mini">
                            <span className="workflow-num">1</span>
                            <div>
                                <strong>Future Dates View-Only:</strong> Operational actions (Call, Arrive, Complete) are disabled for future dates.
                            </div>
                        </div>

                        <div className="workflow-step-mini">
                            <span className="workflow-num">2</span>
                            <div>
                                <strong>Rate Formula:</strong> LSP + Quality_Factor * (MSP - LSP). Grade A gives 100% MSP.
                            </div>
                        </div>

                        <div className="workflow-step-mini">
                            <span className="workflow-num">3</span>
                            <div>
                                <strong>No-Show Token:</strong> Unreached farmers are marked NOT_ARRIVED. Rescheduling is done via Farmer Portal.
                            </div>
                        </div>

                        <div className="workflow-step-mini">
                            <span className="workflow-num">4</span>
                            <div>
                                <strong>Audit Trail:</strong> State changes are permanently preserved in MongoDB TokenHistory.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflow Flowchart Modal */}
            {isFlowchartOpen && (
                <div className="chatbot-modal-overlay" onClick={() => setIsFlowchartOpen(false)}>
                    <div className="chatbot-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="chatbot-modal-header">
                            <h3>
                                <Layers size={22} color="var(--primary)" />
                                Mandi Portal Operational Workflow Flowchart
                            </h3>
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setIsFlowchartOpen(false)}
                                style={{ padding: "4px 8px" }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div>
                            <div className="flowchart-step-card">
                                <div className="flowchart-step-title">
                                    <span className="badge badge-primary">Step 1</span>
                                    Slot Booking & Token Generation (Farmer Portal)
                                </div>
                                <div className="flowchart-step-desc">
                                    Farmer books an available slot within counter daily capacity. Token is issued with status <code>WAITING</code> and assigned an sequential queue position.
                                </div>
                            </div>

                            <div className="flowchart-step-card">
                                <div className="flowchart-step-title">
                                    <span className="badge badge-warning">Step 2</span>
                                    Call Next Farmer (Counter Operator)
                                </div>
                                <div className="flowchart-step-desc">
                                    Operator clicks <strong>'Call Next Farmer'</strong> on today's active counter queue. The token status transitions to <code>CALLED</code>. Future dates are strictly view-only.
                                </div>
                            </div>

                            <div className="flowchart-step-card">
                                <div className="flowchart-step-title">
                                    <span className="badge badge-secondary">Step 3</span>
                                    Physical Arrival or No-Show
                                </div>
                                <div className="flowchart-step-desc">
                                    If the farmer arrives at the desk, operator clicks <strong>'Arrive'</strong> (status becomes <code>ARRIVED</code>). If farmer fails to report, operator clicks <strong>'No Show'</strong> (status becomes <code>NOT_ARRIVED</code>).
                                </div>
                            </div>

                            <div className="flowchart-step-card">
                                <div className="flowchart-step-title">
                                    <span className="badge badge-primary">Step 4</span>
                                    Crop Inspection & Weighing (Start Processing)
                                </div>
                                <div className="flowchart-step-desc">
                                    Operator clicks <strong>'Start Process'</strong> (status becomes <code>PROCESSING</code>). Physical inspection verifies crop quality and weighed quintals.
                                </div>
                            </div>

                            <div className="flowchart-step-card">
                                <div className="flowchart-step-title">
                                    <span className="badge badge-success">Step 5</span>
                                    Complete Sale & Payment Voucher Generation
                                </div>
                                <div className="flowchart-step-desc">
                                    Operator selects Quality Grade (A: Full MSP, B: 50% MSP-LSP, C: Base LSP). Clicking <strong>'Complete & Generate Payment'</strong> marks token <code>COMPLETED</code>, creates a payment record in MySQL, and archives audit records in MongoDB.
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: "right", marginTop: "16px" }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setIsFlowchartOpen(false)}
                            >
                                Close Flowchart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
