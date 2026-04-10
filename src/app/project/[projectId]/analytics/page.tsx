import { ProjectAnalyticsPage } from "@/components/project-analytics-page";

export default async function AnalyticsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectAnalyticsPage projectId={projectId} />;
}
