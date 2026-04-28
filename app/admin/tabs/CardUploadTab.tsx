"use client"

import { UploadTab } from "@/app/admin/_components/UploadTab"

interface CardUploadTabProps {
  initialVideos: any[]
}

export function CardUploadTab({ initialVideos }: CardUploadTabProps) {
  // Wrapper da funcionalidade atual de upload
  return <UploadTab initialModels={initialVideos} suggestedTags={[]} />
}
