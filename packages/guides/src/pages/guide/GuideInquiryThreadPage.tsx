import { useParams } from 'react-router-dom'
import InquiryThread from '../../components/crm/InquiryThread'

export function GuideInquiryThreadPage() {
  const id = Number(useParams().id)
  if (!id) return <div className="card text-sm text-red-600">Невірний ідентифікатор заявки.</div>
  return <InquiryThread inquiryId={id} viewer="guide" />
}
