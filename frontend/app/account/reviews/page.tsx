"use client";

import { Card, EmptyState, IconStar, PageHeader } from "@/lib/account-ui";

export default function ReviewsPage() {
  return (
    <>
      <PageHeader eyebrow="Feedback" title="My Reviews" subtitle="Reviews you have submitted for your purchases." />
      <Card title="Your reviews">
        <EmptyState
          icon={<IconStar />}
          title="No reviews available"
          description="Your submitted reviews will appear here when review history is available for your account."
        />
      </Card>
    </>
  );
}
