import { useState, useRef, useEffect, useMemo } from 'react';
import './Chatbot.css';

// Master FAQ Database categorized
const FAQ_DATABASE = [
  {
    category: 'Farmer Registration',
    icon: '👤',
    questions: [
      {
        q: 'How can I register a farmer?',
        a: 'You can register a farmer from Quick Access → Register Farmer, or go to Farmer → Add Farmer from the sidebar.',
      },
      {
        q: 'Where can I find the Add Farmer option?',
        a: 'Go to the Farmer page from the sidebar and click Add Farmer.',
      },
      {
        q: 'Do I need to verify Aadhaar while registering a farmer?',
        a: 'No. Aadhaar verification is done later after the farmer has been registered.',
      },
      {
        q: 'Can I edit farmer details?',
        a: 'Yes. Go to the Farmer page, search for the farmer, and click the Edit option.',
      },
      {
        q: 'How can I find a farmer?',
        a: 'Go to the Farmer page and search for the required farmer.',
      },
      {
        q: 'How can I verify a farmer?',
        a: 'Find the farmer in the Farmer page and use the available verification option from the farmer details/edit section.',
      },
      {
        q: 'How can I verify Aadhaar and bank details?',
        a: 'Find the farmer from the Farmer page and use the available verification controls.',
      },
      {
        q: 'Can I delete a farmer?',
        a: 'Yes, if you have the required permission and the farmer is within your authorized location.',
      },
    ],
  },
  {
    category: 'Aadhaar & Verification',
    icon: '🔍',
    questions: [
      {
        q: 'Is Aadhaar verified during farmer registration?',
        a: 'No. Aadhaar verification is performed later.',
      },
      {
        q: 'How can I verify Aadhaar?',
        a: 'Go to Farmer, find the farmer, and open the available farmer verification/edit option.',
      },
      {
        q: 'How can I verify bank details?',
        a: 'Find the farmer in the Farmer page and use the available bank verification option.',
      },
      {
        q: 'Can I change the verification status?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'Why is Aadhaar verification done later?',
        a: 'Registration and verification are separate steps. The farmer can first be registered and the verification can be completed afterward.',
      },
    ],
  },
  {
    category: 'Farmer Land',
    icon: '🌱',
    questions: [
      {
        q: 'How can I add land for a farmer?',
        a: 'Go to Farmer, search for the farmer, and in the Actions section click the small plant 🌱 icon.',
      },
      {
        q: "Where can I find the farmer's land?",
        a: 'Search for the farmer in the Farmer page and click the plant 🌱 icon in Actions.',
      },
      {
        q: 'Can a farmer have multiple land records?',
        a: 'Yes. A farmer can have multiple land records.',
      },
      {
        q: 'What land details can I manage?',
        a: 'You can manage land area, ownership type, land type, and land verification information.',
      },
      {
        q: 'How can I verify farmer land?',
        a: "Open the farmer's land page using the plant 🌱 icon and use the land verification option.",
      },
      {
        q: 'Can I remove farmer land?',
        a: 'Yes, if you have the required permission.',
      },
    ],
  },
  {
    category: 'State Management',
    icon: '🏛️',
    questions: [
      {
        q: 'Where can I manage states?',
        a: 'Go to the State page from the sidebar.',
      },
      {
        q: 'How can I add a state?',
        a: 'Open the State page and use the Add State option.',
      },
      {
        q: 'Can I remove a state?',
        a: 'Yes, if you have the required permission. Use the remove/delete option on the State page.',
      },
      {
        q: 'Can I modify a state?',
        a: 'No. The system does not provide a state modification/edit option.',
      },
      {
        q: 'Can I see all states?',
        a: 'Yes. The State page displays the states available in the system.',
      },
      {
        q: 'How can I see the total number of states?',
        a: 'The State page provides the available state information, including the configured state count where applicable.',
      },
    ],
  },
  {
    category: 'District Management',
    icon: '🏙️',
    questions: [
      {
        q: 'Where can I manage districts?',
        a: 'Go to the District page from the sidebar.',
      },
      {
        q: 'How can I add a district?',
        a: 'Open the District page and use the Add District option.',
      },
      {
        q: 'Can I remove a district?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'Can I modify a district?',
        a: 'No. The system does not provide a district modification/edit option.',
      },
      {
        q: 'Can I see all districts?',
        a: 'Yes. The District page displays the available districts.',
      },
      {
        q: 'Can I see districts state-wise?',
        a: 'Yes. You can select/view a state and see the districts associated with that state.',
      },
      {
        q: 'How can I find districts of a particular state?',
        a: 'Go to the District page and use the state-wise district option/filter.',
      },
      {
        q: 'Can I see the total number of districts?',
        a: 'Yes, the District page can display the configured district count.',
      },
    ],
  },
  {
    category: 'Tehsil Management',
    icon: '🏘️',
    questions: [
      {
        q: 'Where can I manage tehsils?',
        a: 'Go to the Tehsil page from the sidebar.',
      },
      {
        q: 'How can I add a tehsil?',
        a: 'Open the Tehsil page and use the Add Tehsil option.',
      },
      {
        q: 'Can I remove a tehsil?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'Can I modify a tehsil?',
        a: 'No. The system does not provide a tehsil modification/edit option.',
      },
      {
        q: 'Can I see all tehsils?',
        a: 'Yes. The Tehsil page displays the available tehsils.',
      },
      {
        q: 'Can I see tehsils district-wise?',
        a: 'Yes. You can select a district and view the tehsils associated with that district.',
      },
      {
        q: 'How can I find tehsils of a particular district?',
        a: 'Go to the Tehsil page and use the district-wise tehsil option/filter.',
      },
      {
        q: 'Can I see the total number of tehsils?',
        a: 'Yes, the Tehsil page can display the configured tehsil count.',
      },
    ],
  },
  {
    category: 'Procurement Session',
    icon: '📅',
    questions: [
      {
        q: 'What is a procurement session?',
        a: 'A procurement session defines the period during which procurement of a particular crop is carried out.',
      },
      {
        q: 'Where can I find procurement sessions?',
        a: 'Click Procurement Session from the sidebar.',
      },
      {
        q: 'How can I add a procurement session?',
        a: 'Open the Procurement Session page and use the option to add a procurement session.',
      },
      {
        q: 'What information is required for a procurement session?',
        a: 'Session name, crop, start date, and end date.',
      },
      {
        q: 'Can I modify an active procurement session?',
        a: 'Its ending date can be modified according to the system rules. The start date cannot be changed after the session has started.',
      },
      {
        q: 'Can I modify an upcoming procurement session?',
        a: 'Yes. Its start and end dates can be modified according to the configured restrictions.',
      },
      {
        q: 'Can I modify an ended procurement session?',
        a: 'No. An ended procurement session cannot be modified.',
      },
      {
        q: 'How does the system identify an active session?',
        a: 'It determines the session state from its start date and end date.',
      },
    ],
  },
  {
    category: 'Procurement Quota',
    icon: '📦',
    questions: [
      {
        q: 'What is procurement quota?',
        a: "Procurement quota defines how much of a particular crop a farmer can sell based on the configured quota for their state and eligible land area.",
      },
      {
        q: 'How is procurement quota related to land?',
        a: "The quota is configured on a per-acre basis, so the farmer's eligible land area is used when determining the permitted quantity.",
      },
      {
        q: 'Is quota different for each crop?',
        a: 'Yes. Quota can be configured separately for different crops.',
      },
      {
        q: 'Is quota different for each state?',
        a: 'Yes. A quota can be configured for a specific state and crop.',
      },
      {
        q: 'What is MSP?',
        a: 'MSP means Minimum Support Price and represents the government-backed support price associated with crop procurement.',
      },
      {
        q: 'What is LSP?',
        a: 'LSP means Lowest Selling Price and represents the lowest configured floor rate for crop purchases.',
      },
      {
        q: 'What is MSP and LSP?',
        a: 'MSP (Minimum Support Price) is the guaranteed base price, while LSP (Lowest Selling Price) sets the minimum allowable rate in the procurement system.',
      },
      {
        q: 'Where can I manage procurement quota?',
        a: 'Go to Procurement Session from the sidebar. The Procurement Quota option is available at the top-left of that page.',
      },
      {
        q: 'How can I add procurement quota?',
        a: 'Open Procurement Session → Procurement Quota, then use the add quota option.',
      },
      {
        q: 'Can I edit procurement quota?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'Can I remove procurement quota?',
        a: 'Yes, if you have the required permission.',
      },
    ],
  },
  {
    category: 'Mandi',
    icon: '🏪',
    questions: [
      {
        q: 'What is a mandi?',
        a: 'A mandi is a designated location where farmers can bring eligible crops for selling/procurement.',
      },
      {
        q: 'Where can I manage mandis?',
        a: 'Go to the Mandi section in the sidebar navigation.',
      },
      {
        q: 'How can I add a mandi?',
        a: 'Open the Mandi page and use Add Mandi if you have the required permission.',
      },
      {
        q: 'Can I update mandi capacity?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'Can I remove a mandi?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'What is a mandi counter?',
        a: 'A mandi counter is an operational counter inside a mandi used for procurement activities.',
      },
      {
        q: 'How can I add a mandi counter?',
        a: 'Open the required mandi and use the option to add a counter.',
      },
      {
        q: 'Can I change the counter status?',
        a: 'Yes, if you have the required permission.',
      },
      {
        q: 'How can I see counters of a mandi?',
        a: 'Open the required mandi and view its configured counters.',
      },
    ],
  },
  {
    category: 'Crop Management',
    icon: '🌾',
    questions: [
      {
        q: 'Where can I see crops?',
        a: 'Go to the Crop section in the portal.',
      },
      {
        q: 'How can I add a crop?',
        a: 'Open the Crop page and use the Add Crop option if you have permission.',
      },
      {
        q: 'Can I modify a crop?',
        a: 'Crop management depends on the options and permissions provided on the Crop page.',
      },
      {
        q: 'Can I remove a crop?',
        a: 'Yes, if you have the required permission and the crop is not restricted by related records.',
      },
    ],
  },
  {
    category: 'Account & Permissions',
    icon: '🔐',
    questions: [
      {
        q: "Why can't I access a particular option?",
        a: 'Your account may not have the permission required for that operation.',
      },
      {
        q: 'Why can I view a record but cannot edit it?',
        a: 'View and edit operations use different administrative permissions.',
      },
      {
        q: "Why can't I delete a record?",
        a: 'You may not have the required delete permission, or the record may be outside your authorized location.',
      },
      {
        q: "Why can't I see data from another district?",
        a: 'Your account is restricted according to its authorized state, district, and tehsil scope.',
      },
      {
        q: "Why can't I see data from another tehsil?",
        a: "Your account's location scope restricts access strictly to the permitted tehsil.",
      },
      {
        q: 'Can I access all state data?',
        a: 'Access depends on your assigned location scope and administrative role.',
      },
    ],
  },
];

// Flat lookup index
const ALL_FAQS = FAQ_DATABASE.flatMap((cat) => cat.questions);

// 10 Curated Popular Questions on Right Panel
const POPULAR_QUESTIONS = [
  'How can I register a farmer?',
  'Where is the Add Farmer option?',
  'How can I add land for a farmer?',
  'Where can I manage states?',
  'How can I see districts of a state?',
  'How can I see tehsils of a district?',
  'What is a procurement session?',
  'How can I add a procurement quota?',
  'Where can I manage mandis?',
  'What is MSP and LSP?',
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! 👋\nI'm AgriAssist, your helper for the AgriGov Portal.\n\nHow can I help you today?\nYou can ask a question or choose a topic below.",
      timestamp: '10:24 AM',
      showOptions: true,
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [isFlowchartOpen, setIsFlowchartOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'faqs'

  const messagesEndRef = useRef(null);
  const isFirstRender = useRef(true);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; 
    }

    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const getTimeString = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Find Best Answer Function
  const findAnswer = (questionText) => {
    const cleanQ = questionText.trim().toLowerCase();

    // 1. Basic greetings & standard chatbot inquiries
    if (/^(hi|hello|hey|namaste)\b/i.test(cleanQ)) {
      return 'Hello! 👋 How can I help you with the Farmer Procurement Portal?';
    }
    if (/what can you do|who are you|help/i.test(cleanQ)) {
      return 'I can help you with 👨‍🌾 Farmers, 🔍 Verification, 🌱 Land, 📍 States, 🏙️ Districts, 🏘️ Tehsils, 📅 Procurement Sessions, 📦 Quotas, 🏪 Mandis, and 🌾 Crops.';
    }
    if (/thank/i.test(cleanQ)) {
      return "You're welcome! 😊 Let me know if you need anything else.";
    }
    if (/bye|goodbye/i.test(cleanQ)) {
      return 'Goodbye! 👋 Have a productive day managing the portal!';
    }
    if (/flowchart|diagram|site map|architecture/i.test(cleanQ)) {
      setIsFlowchartOpen(true);
      return 'Here is the overall site flowchart of the AgriGov Farmer & Mandi Procurement Portal. You can inspect all operational routes in the opened viewer.';
    }

    // 2. Exact match
    const exact = ALL_FAQS.find((item) => item.q.toLowerCase() === cleanQ);
    if (exact) return exact.a;

    // 3. Substring match
    const partial = ALL_FAQS.find(
      (item) => item.q.toLowerCase().includes(cleanQ) || cleanQ.includes(item.q.toLowerCase())
    );
    if (partial) return partial.a;

    // 4. Keyword token matching
    const tokens = cleanQ.split(/\s+/).filter((t) => t.length > 2);
    let bestMatch = null;
    let highestScore = 0;

    ALL_FAQS.forEach((item) => {
      let score = 0;
      const target = item.q.toLowerCase();
      tokens.forEach((token) => {
        if (target.includes(token)) score++;
      });
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    });

    if (highestScore >= 2 && bestMatch) {
      return bestMatch.a;
    }

    // Default Fallback
    return "I couldn't find an exact answer for that query. Please select one of the Quick Options above, choose from the Popular Questions on the right, or click 'Get Site Flowchart' to view the portal workflow.";
  };

  // Submit User Message
  const handleSendMessage = (textToSend) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: getTimeString(),
    };

    const answer = findAnswer(query);

    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: answer,
      timestamp: getTimeString(),
      showOptions: false,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputQuery('');
    setActiveCategory(null);
    setMobileTab('chat');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="agri-chat-page">
      {/* Lightbox Modal for Flowchart Image */}
      {isFlowchartOpen && (
        <div className="flowchart-modal-backdrop" onClick={() => setIsFlowchartOpen(false)}>
          <div className="flowchart-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flowchart-modal-header">
              <div className="flowchart-title">
                <span>🧭</span>
                <h3>AgriGov Portal Site Flowchart</h3>
              </div>
              <button
                type="button"
                className="close-flowchart-btn"
                onClick={() => setIsFlowchartOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flowchart-image-wrap">
              <img
                src="./flowchart.png"
                alt="AgriGov System Flowchart"
                onError={(e) => {
                  // Fallback if image is at relative path or flowchart.png
                  if (!e.target.src.includes('flowchart.png')) {
                    e.target.src = '/flowchart.png';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="chat-header-bar">
        <div className="chat-brand-wrapper">
          <div className="chat-logo-icon">💬</div>
          <div className="chat-brand-text">
            <div className="brand-title-row">
              <h1>AgriAssist</h1>
              <span className="bot-status-tag">Bot</span>
            </div>
            <p className="brand-subtitle">Your Smart Assistant for the AgriGov Portal</p>
          </div>
        </div>

        <div className="chat-top-banner">
          <span className="banner-sprout-icon">🌱</span>
          <span className="banner-text">
            Ask me anything about farmers, land, procurement, mandis and more!
          </span>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="chat-mobile-nav">
        <button
          type="button"
          className={`chat-mobile-tab-btn ${mobileTab === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          <span>💬 Conversation</span>
        </button>
        <button
          type="button"
          className={`chat-mobile-tab-btn ${mobileTab === 'faqs' ? 'active' : ''}`}
          onClick={() => setMobileTab('faqs')}
        >
          <span>💡 Popular FAQs</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className={`chat-layout-container mobile-tab-${mobileTab}`}>
        {/* Left Column: Interactive Chat Conversation Panel */}
        <div className="chat-conversation-panel">
          <div className="chat-messages-scroll-area">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="bot-avatar-badge">
                    <span className="bot-avatar-face">🤖</span>
                  </div>
                )}

                <div className={`message-bubble-wrapper ${msg.sender}`}>
                  <div className={`message-bubble ${msg.sender}`}>
                    <div className="message-text">{msg.text}</div>
                    <span className="message-time">{msg.timestamp}</span>
                  </div>

                  {/* Render Quick Topic Buttons for the initial greeting */}
                  {msg.showOptions && (
                    <div className="bot-options-container">
                      <div className="options-heading-row">
                        <span className="options-title">Quick Options</span>
                        <button
                          type="button"
                          className="btn-open-flowchart"
                          onClick={() => setIsFlowchartOpen(true)}
                        >
                          🧭 View Site Flowchart
                        </button>
                      </div>

                      <div className="quick-topics-grid">
                        {FAQ_DATABASE.map((cat) => (
                          <button
                            key={cat.category}
                            type="button"
                            className={`topic-card-btn ${activeCategory === cat.category ? 'active' : ''}`}
                            onClick={() =>
                              setActiveCategory(
                                activeCategory === cat.category ? null : cat.category
                              )
                            }
                          >
                            <span className="topic-icon">{cat.icon}</span>
                            <span className="topic-name">{cat.category}</span>
                            <span className="topic-arrow">›</span>
                          </button>
                        ))}
                      </div>

                      {/* Display Question Sub-List when a Category is chosen */}
                      {activeCategory && (
                        <div className="category-questions-pop">
                          <div className="pop-title">
                            Questions about{' '}
                            <strong>{activeCategory}</strong>:
                          </div>
                          <div className="pop-questions-list">
                            {FAQ_DATABASE.find(
                              (c) => c.category === activeCategory
                            )?.questions.map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="pop-q-btn"
                                onClick={() => handleSendMessage(item.q)}
                              >
                                {item.q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="user-avatar-badge">👤</div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form Bar */}
          <div className="chat-bottom-input-bar">
            <div className="input-field-container">
              {/* Attachment Clip opens Flowchart */}
              <button
                type="button"
                className="input-tool-btn"
                title="View Site Flowchart"
                onClick={() => setIsFlowchartOpen(true)}
              >
                📎
              </button>

              <input
                type="text"
                placeholder="Type your question here..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <button
                type="button"
                className="send-message-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim()}
              >
                ➤
              </button>
            </div>
            <p className="input-helper-tip">Tip: You can ask questions in simple language.</p>
          </div>
        </div>

        {/* Right Column: Popular Questions & Mission Card */}
        <div className="chat-sidebar-panel">
          {/* Popular Questions Card */}
          <div className="popular-questions-card">
            <div className="popular-card-header">
              <span className="header-bulb-icon">💡</span>
              <h2>Popular Questions</h2>
            </div>

            <div className="popular-questions-list">
              {POPULAR_QUESTIONS.map((question, i) => (
                <button
                  key={i}
                  type="button"
                  className="popular-q-item"
                  onClick={() => handleSendMessage(question)}
                >
                  <span className="q-text">{question}</span>
                  <span className="q-arrow">›</span>
                </button>
              ))}
            </div>
          </div>

          {/* Site Flowchart Trigger Banner */}
          <div className="flowchart-cta-card" onClick={() => setIsFlowchartOpen(true)}>
            <div className="cta-icon-box">🗺️</div>
            <div className="cta-details">
              <h4>Portal Navigation Flowchart</h4>
              <p>Click here to view the complete operational site workflow.</p>
            </div>
            <span className="cta-arrow">›</span>
          </div>

          {/* Mission Card */}
          <div className="mission-quote-card">
            <div className="mission-content">
              <div className="mission-leaf-bubble">🌱</div>
              <div className="mission-text-group">
                <h3>Together for a Better Tomorrow</h3>
                <p>Digitizing Agriculture for a Stronger Nation</p>
              </div>
            </div>
            <div className="mission-landscape-graphic" />
          </div>
        </div>
      </div>
    </div>
  );
}