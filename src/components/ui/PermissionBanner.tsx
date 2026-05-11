import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getPermissionErrorMessage, getFreeboxSettingsUrl } from '../../utils/permissions';

interface PermissionBannerProps {
  permission: string;
  freeboxUrl: string;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({ permission, freeboxUrl }) => {
  const settingsUrl = getFreeboxSettingsUrl(freeboxUrl);

  return (
    <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-amber-400 text-sm">{getPermissionErrorMessage(permission)}</p>
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-amber-300 hover:text-amber-200 text-sm underline"
          >
            Ouvrir les paramètres Freebox
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};