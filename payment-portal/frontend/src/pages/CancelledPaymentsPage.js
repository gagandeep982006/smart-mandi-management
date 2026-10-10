import React from "react";
import PaymentListPage from "../components/payments/PaymentListPage";

export default function CancelledPaymentsPage() {
    return (
        <PaymentListPage
            status="CANCELLED"
            title="Cancelled Payments"
            subtitle="Payments cancelled during verification or dispute. Authorized operators may restore eligible payments to Pending or Processing with a reason."
        />
    );
}
