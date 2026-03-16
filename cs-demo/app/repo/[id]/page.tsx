import { redirect } from "next/navigation";

export default async function RepoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/repo/${id}/pulls`);
}
