// LeadNDAPage now redirects to LeadDetailsPage which handles magic login → CRM
import { useParams, Navigate } from 'react-router-dom';

export default function LeadNDAPage() {
  const { token } = useParams<{ token: string }>();
  // NDA is now handled inline in CRM LeadsTab, so redirect to the main lead entry point
  return <Navigate to={`/lead/${token}`} replace />;
}
