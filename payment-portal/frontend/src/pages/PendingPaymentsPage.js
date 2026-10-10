import React from "react";
import PaymentListPage from "../components/payments/PaymentListPage";

export default function PendingPaymentsPage() {
    return (
        <PaymentListPage
            status="PENDING"
            title="Pending Payments"
            subtitle="Review verified farmer procurement intake records awaiting disbursal authorization or cancellation."
        />
    );
}
