"use client";

import { Card, EmptyState, IconCard, PageHeader } from "@/lib/account-ui";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Payment Methods"
        subtitle="Payment details are managed securely by the payment provider."
      />
      <Card title="Saved payment methods">
        <EmptyState
          icon={<IconCard />}
          title="No saved payment methods"
          description="Payment methods are not stored in your account. Choose a payment method during checkout."
        />
      </Card>
    </>
  );
}