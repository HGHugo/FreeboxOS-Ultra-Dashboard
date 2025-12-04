import React, { useState } from 'react';
import { Router, Wifi, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface LoginModalProps {
  isOpen: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen }) => {
  const {
    isRegistered,
    isRegistering,
    registrationStatus,
    error,
    freeboxUrl,
    register,
    login,
    setFreeboxUrl,
    clearError
  } = useAuthStore();

  const [urlInput, setUrlInput] = useState(freeboxUrl);
  const [useLocalIp, setUseLocalIp] = useState(false);
  const [localIp, setLocalIp] = useState('192.168.1.254');

  if (!isOpen) return null;

  const handleConnect = async () => {
    const url = useLocalIp ? `http://${localIp}` : urlInput;
    await setFreeboxUrl(url);

    if (isRegistered) {
      await login();
    } else {
      await register();
    }
  };

  const getStatusMessage = () => {
    switch (registrationStatus) {
      case 'pending':
        return 'Veuillez valider sur l\'écran de la Freebox...';
      case 'granted':
        return 'Autorisation accordée !';
      case 'denied':
        return 'Autorisation refusée';
      case 'timeout':
        return 'Délai dépassé';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (registrationStatus) {
      case 'pending':
        return <Loader2 className="animate-spin text-blue-400" size={24} />;
      case 'granted':
        return <Check className="text-green-400" size={24} />;
      case 'denied':
      case 'timeout':
        return <X className="text-red-400" size={24} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121212] w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-[#0a0a0a] text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-gray-700">
            <Router size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Connexion Freebox</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRegistered
              ? 'Application enregistrée. Cliquez pour vous connecter.'
              : 'Enregistrez l\'application sur votre Freebox'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
              <button onClick={clearError} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}

          {/* URL Selection */}
          <div className="space-y-3">
            <label className="text-sm text-gray-400">Adresse de la Freebox</label>

            {/* Tabs for URL type */}
            <div className="flex gap-2">
              <button
                onClick={() => setUseLocalIp(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                  !useLocalIp
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                }`}
              >
                <Wifi size={14} className="inline mr-2" />
                mafreebox.freebox.fr
              </button>
              <button
                onClick={() => setUseLocalIp(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                  useLocalIp
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                }`}
              >
                IP Locale
              </button>
            </div>

            {/* URL/IP Input */}
            {useLocalIp ? (
              <input
                type="text"
                value={localIp}
                onChange={(e) => setLocalIp(e.target.value)}
                placeholder="192.168.1.254"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            ) : (
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://mafreebox.freebox.fr"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* Registration status */}
          {isRegistering && (
            <div className="flex flex-col items-center gap-3 p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
              {getStatusIcon()}
              <p className="text-sm text-gray-300 text-center">{getStatusMessage()}</p>
              {registrationStatus === 'pending' && (
                <p className="text-xs text-gray-500 text-center">
                  Un message apparaît sur l'écran LCD de votre Freebox.
                  <br />
                  Utilisez les flèches pour sélectionner "Oui" et valider.
                </p>
              )}
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={isRegistering && registrationStatus === 'pending'}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isRegistering && registrationStatus === 'pending'
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRegistering && registrationStatus === 'pending' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                En attente de validation...
              </span>
            ) : isRegistered ? (
              'Se connecter'
            ) : (
              'Enregistrer l\'application'
            )}
          </button>

          {/* Help text */}
          <p className="text-xs text-gray-500 text-center">
            {isRegistered
              ? 'L\'application est déjà autorisée sur votre Freebox.'
              : 'Cette opération ne doit être effectuée qu\'une seule fois.'}
          </p>
        </div>
      </div>
    </div>
  );
};