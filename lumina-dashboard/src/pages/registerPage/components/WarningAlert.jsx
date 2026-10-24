import ErrorBanner from '../../../components/ui/ErrorBanner';
export default function WarningAlert({message}){return <div className="my-3"><ErrorBanner error={message}/></div>;}
