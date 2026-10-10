import React from "react";
import PaymentListPage from "../components/payments/PaymentListPage";

export default function ProcessingPaymentsPage() {
    return (
        <PaymentListPage
            status="PROCESSING"
            title="Processing Payments"
            subtitle="Payments actively verified and undergoing bank transfer / clearing. Mark Paid upon successful disbursal or Failed if rejected."
        />
    );
}
