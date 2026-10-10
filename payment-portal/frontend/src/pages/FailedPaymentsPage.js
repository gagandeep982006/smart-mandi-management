import React from "react";
import PaymentListPage from "../components/payments/PaymentListPage";

export default function FailedPaymentsPage() {
    return (
        <PaymentListPage
            status="FAILED"
            title="Failed Payments"
            subtitle="Payments returned or rejected by PFMS/banking rails. Review failure notes and retry eligible payments with updated details."
        />
    );
}
