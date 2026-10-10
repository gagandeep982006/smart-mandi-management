import React from "react";
import PaymentListPage from "../components/payments/PaymentListPage";

export default function PaidPaymentsPage() {
    return (
        <PaymentListPage
            status="PAID"
            title="Completed / Paid Payments"
            subtitle="Completed MSP procurement payment disbursements. These historical records are immutable and read-only."
        />
    );
}
