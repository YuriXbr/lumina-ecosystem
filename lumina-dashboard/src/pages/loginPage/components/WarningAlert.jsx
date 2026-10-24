import ErrorBanner from '../../../components/ui/ErrorBanner';
export default function WarningAlert({message='Email ou senha inválidos, tente novamente.',onClose}){
 return <div className="my-3"><ErrorBanner error={message} onDismiss={onClose}/></div>;
}
