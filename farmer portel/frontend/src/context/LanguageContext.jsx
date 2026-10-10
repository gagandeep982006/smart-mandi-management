import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Top Bar & Navigation
    govDepartment: "Govt. of Haryana • Department of Food & Civil Supplies",
    liveOperations: "Live Mandi Operations",
    dashboard: "Dashboard",
    bookSlot: "Book Slot",
    myBookings: "My Bookings",
    myToken: "My Token",
    salesHistory: "Sales History",
    payments: "Payment Vouchers",
    profile: "Profile & Land",
    logout: "Log Out",
    verifiedFarmer: "VERIFIED FARMER",
    mainNav: "MAIN NAVIGATION",

    // Tab Titles
    tabDashboard: "Farmer Dashboard",
    tabBookSlot: "Book Procurement Slot",
    tabBookings: "My Mandi Bookings",
    tabToken: "Mandi Gate Pass & Queue Token",
    tabPayments: "Payment Vouchers & DBT Status",
    tabHistory: "Procurement & Sales History",
    tabProfile: "Farmer Profile & Land Records",

    // Dashboard
    welcome: "Welcome",
    registeredDashboard: "Registered Farmer Dashboard",
    tehsil: "Tehsil",
    district: "District",
    state: "State",
    verifiedLand: "Verified Land",
    eligibleAcres: "Total Eligible Acres",
    allocatedQuota: "Allocated Quota",
    quotaRate: "Quota Rate",
    cropSold: "Crop Sold",
    soldToDate: "Total Procured to Date",
    remainingQuota: "Remaining Quota",
    availableToSell: "Available to Book & Sell",
    activeAppointment: "Active Mandi Appointment",
    noActiveAppointment: "No Upcoming Active Appointments",
    recentBookings: "Recent Procurement Bookings",
    noBookings: "No bookings found.",
    viewGatePass: "View Gate Pass",
    reschedule: "Reschedule Slot",
    cancelBooking: "Cancel Booking",
    multipleSalesInfoTitle: "Multiple Procurement Sales Permitted per Session",
    multipleSalesInfoDesc: "You are eligible to book and sell your crops multiple times during an active procurement session. Each booking uses a portion of your eligible quota.",
    globalQuotaTitle: "Universal Procurement Quota Pool (Shared Across All Crops)",
    globalQuotaNote: "Your allocated quota is a single combined pool for this session. Selling any crop (e.g. Rice) automatically deducts from your remaining quota available for all other crops.",
    soldThisCrop: "Procured for this Crop",
    sharedRemaining: "Shared Remaining Quota",
    cropBreakdown: "Crop-Wise Procurement Breakdown",

    // Early Call Banner
    earlyCallAlertTitle: "🚨 Early Arrival Request from Mandi Counter!",
    earlyCallAlertDesc: "Mandi Counter has asked if you can arrive early for your procurement. If you are nearby and ready, accept this request to allow the operator to call your token immediately.",
    acceptEarlyArrival: "✓ Accept Early Arrival",
    declineEarlyArrival: "✕ Decline (Keep Slot)",
    earlyCallAcceptedSuccess: "Early arrival accepted! Operator has been notified.",
    earlyCallDeclinedSuccess: "Early arrival declined. Your original slot remains unchanged.",
    earlyRequestedAt: "Requested At",

    // Token View
    gatePassTitle: "Mandi Gate Pass & Queue Token",
    gatePassSubtitle: "Present this token or reference number at the Mandi entry gate for priority vehicle clearance.",
    refreshQueue: "Refresh Queue",
    printPass: "Print Pass",
    farmersAhead: "Farmers Ahead in Queue",
    vehiclesAheadDesc: "Vehicles in line ahead of your token",
    currentlyCalled: "Currently Called at Counter",
    noFarmerCalled: "No Farmer Called Yet",
    procurementStage: "Procurement Stage",
    approxWaitTime: "Approximate Wait Time",
    yourTurn: "0 Mins (Your Turn)",
    minsWait: "Mins",
    proceedToCounter: "Proceed to Counter",
    processingNow: "Processing Now",
    completed: "Completed",
    queueTokenNo: "Queue Token Number",
    bookingRef: "Booking Reference",
    designatedCounter: "Designated Counter",
    farmerName: "Farmer Name",
    serviceDate: "Service Date",
    scheduledSlot: "Scheduled Slot",
    crop: "Crop",
    approvedQty: "Approved Quantity",
    avgServiceTime: "Avg Service Time",
    liveProgression: "Live Queue Progression Status",
    currentStage: "CURRENT STAGE",
    noTokenFound: "No Active Queue Token Found",
    noTokenDesc: "You do not currently have an active appointment token for today or upcoming dates.",
    bookSlotBtn: "Book a Procurement Slot",

    // Buttons & General
    loading: "Loading...",
    status: "Status",
    actions: "Actions",
    quintals: "Quintals",
    switchLanguage: "हिंदी में देखें",
    currentLang: "English",
    cannotCancelCalledOrArrived: "Cannot cancel or reschedule once called or arrived at the mandi.",
    lockWithin1Day: "Cancellation and rescheduling are only permitted at least 2 days prior to appointment (locked 1 day before or on slot day).",
    missedSlotNotice: "Slot missed (Not Arrived). You may now reschedule to a new available date or cancel.",
    rescheduleSlot: "Reschedule Slot",
    keepBooking: "Keep Booking",
    confirmCancel: "Confirm Cancellation"
  },
  hi: {
    // Top Bar & Navigation
    govDepartment: "हरियाणा सरकार • खाद्य, नागरिक आपूर्ति एवं उपभोक्ता मामले विभाग",
    liveOperations: "सक्रिय मंडी संचालन",
    dashboard: "डैशबोर्ड",
    bookSlot: "स्लॉट बुक करें",
    myBookings: "मेरी बुकिंग",
    myToken: "मेरा टोकन",
    salesHistory: "बिक्री इतिहास",
    payments: "भुगतान रसीदें",
    profile: "प्रोफ़ाइल एवं भूमि",
    logout: "लॉगआउट करें",
    verifiedFarmer: "सत्यापित किसान",
    mainNav: "मुख्य मेनू",

    // Tab Titles
    tabDashboard: "किसान डैशबोर्ड",
    tabBookSlot: "उपार्जन स्लॉट बुकिंग",
    tabBookings: "मेरी मंडी बुकिंग्स",
    tabToken: "मंडी गेट पास एवं कतार टोकन",
    tabPayments: "भुगतान वाउचर एवं डीबीटी स्थिति",
    tabHistory: "उपार्जन एवं बिक्री इतिहास",
    tabProfile: "किसान प्रोफ़ाइल एवं भूमि रिकॉर्ड",

    // Dashboard
    welcome: "स्वागत है",
    registeredDashboard: "पंजीकृत किसान डैशबोर्ड",
    tehsil: "तहसील",
    district: "जिला",
    state: "राज्य",
    verifiedLand: "सत्यापित भूमि",
    eligibleAcres: "कुल पात्र एकड़",
    allocatedQuota: "कुल आवंटित कोटा",
    quotaRate: "कोटा दर प्रति एकड़",
    cropSold: "बेची गई फसल",
    soldToDate: "अब तक कुल उपार्जित",
    remainingQuota: "शेष बेचने योग्य कोटा",
    availableToSell: "उपलब्ध स्लॉट कोटा",
    activeAppointment: "सक्रिय मंडी अपॉइंटमेंट",
    noActiveAppointment: "कोई आगामी सक्रिय अपॉइंटमेंट नहीं है",
    recentBookings: "हाल की उपार्जन बुकिंग्स",
    noBookings: "कोई बुकिंग नहीं मिली।",
    viewGatePass: "गेट पास देखें",
    reschedule: "समय बदलें (रीशेड्यूल)",
    cancelBooking: "बुकिंग रद्द करें",
    multipleSalesInfoTitle: "एक सत्र में कई बार फसल बिक्री की अनुमति",
    multipleSalesInfoDesc: "आप सक्रिय उपार्जन सत्र के दौरान कई बार अपनी फसल बेचने के लिए स्लॉट बुक कर सकते हैं। प्रत्येक बुकिंग आपके पात्र कोटे में से घटाई जाती है।",
    globalQuotaTitle: "सार्वभौमिक उपार्जन कोटा पूल (सभी फसलों के लिए साझा)",
    globalQuotaNote: "आपका आवंटित कोटा इस सत्र की सभी फसलों के लिए साझा है। किसी भी फसल (जैसे धान) की बिक्री अन्य सभी फसलों के लिए उपलब्ध शेष कोटे से तुरंत घटाई जाती है।",
    soldThisCrop: "इस फसल की अब तक बिक्री",
    sharedRemaining: "शेष साझा कोटा (किसी भी फसल हेतु)",
    cropBreakdown: "फसलवार उपार्जन विवरण",

    // Early Call Banner
    earlyCallAlertTitle: "🚨 मंडी काउंटर से समय से पहले आने का अनुरोध!",
    earlyCallAlertDesc: "मंडी काउंटर ने पूछा है कि क्या आप उपार्जन के लिए निर्धारित समय से पहले आ सकते हैं। यदि आप मंडी के पास हैं और तैयार हैं, तो स्वीकार करें ताकि ऑपरेटर तुरंत आपका टोकन बुला सके।",
    acceptEarlyArrival: "✓ समय से पहले आना स्वीकार करें",
    declineEarlyArrival: "✕ अस्वीकार करें (निर्धारित समय पर ही आएंगे)",
    earlyCallAcceptedSuccess: "पहले आना स्वीकार कर लिया गया! मंडी ऑपरेटर को सूचित कर दिया गया है।",
    earlyCallDeclinedSuccess: "पहले आने का अनुरोध अस्वीकार किया गया। आपका निर्धारित समय यथावत रहेगा।",
    earlyRequestedAt: "अनुरोध समय",

    // Token View
    gatePassTitle: "मंडी गेट पास एवं कतार टोकन",
    gatePassSubtitle: "मंडी प्रवेश द्वार पर प्राथमिकता वाहन निकासी के लिए यह टोकन नंबर या संदर्भ संख्या दिखाएं।",
    refreshQueue: "कतार रिफ्रेश करें",
    printPass: "गेट पास प्रिंट करें",
    farmersAhead: "कतार में आपसे आगे किसान",
    vehiclesAheadDesc: "आपके टोकन से पहले कतार में वाहन",
    currentlyCalled: "काउंटर पर वर्तमान में बुलाया गया किसान",
    noFarmerCalled: "अभी कोई किसान नहीं बुलाया गया",
    procurementStage: "उपार्जन प्रक्रिया चरण",
    approxWaitTime: "अनुमानित प्रतीक्षा समय",
    yourTurn: "0 मिनट (आपकी बारी है)",
    minsWait: "मिनट",
    proceedToCounter: "काउंटर पर जाएं",
    processingNow: "तौल व गुणवत्ता जांच जारी है",
    completed: "उपार्जन पूर्ण",
    queueTokenNo: "कतार टोकन नंबर",
    bookingRef: "बुकिंग संदर्भ संख्या",
    designatedCounter: "निर्धारित काउंटर",
    farmerName: "किसान का नाम",
    serviceDate: "सेवा तिथि",
    scheduledSlot: "निर्धारित समय स्लॉट",
    crop: "फसल",
    approvedQty: "स्वीकृत मात्रा",
    avgServiceTime: "औसत सेवा समय",
    liveProgression: "लाइव कतार प्रगति स्थिति",
    currentStage: "वर्तमान चरण",
    noTokenFound: "कोई सक्रिय कतार टोकन नहीं मिला",
    noTokenDesc: "वर्तमान में आज या आगामी तिथियों के लिए आपका कोई सक्रिय टोकन उपलब्ध नहीं है।",
    bookSlotBtn: "नया उपार्जन स्लॉट बुक करें",

    // Buttons & General
    loading: "लोड हो रहा है...",
    status: "स्थिति",
    actions: "कार्रवाई",
    quintals: "क्विंटल",
    switchLanguage: "View in English",
    currentLang: "हिंदी",
    cannotCancelCalledOrArrived: "मंडी काउंटर पर बुलाए जाने या पहुंचने के बाद अपॉइंटमेंट रद्द या पुनर्निर्धारित नहीं किया जा सकता।",
    lockWithin1Day: "अपॉइंटमेंट तिथि से 1 दिन पहले या उसी दिन रद्द/पुनर्निर्धारण अनुमत नहीं है (कम से कम 2 दिन पहले आवश्यक)।",
    missedSlotNotice: "आप नियत स्लॉट पर उपस्थित नहीं हुए (Not Arrived)। आप नई तिथि चुन सकते हैं या बुकिंग रद्द कर सकते हैं।",
    rescheduleSlot: "समय बदलें (रीशेड्यूल)",
    keepBooking: "बुकिंग बनाए रखें",
    confirmCancel: "रद्दीकरण की पुष्टि करें"
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('farmer_portal_lang') || 'en';
  });

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    localStorage.setItem('farmer_portal_lang', nextLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
