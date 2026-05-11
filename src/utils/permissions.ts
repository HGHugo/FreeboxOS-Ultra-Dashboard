// Centralized permission messages and labels
// Maps Freebox API permission keys to user-friendly labels from Freebox UI

export const PERMISSION_LABELS: Record<string, string> = {
  calls: 'Accès au journal d\'appels',
  camera: 'Accès aux caméras',
  contacts: 'Accès à la base de contacts de la Freebox',
  downloader: 'Accès au gestionnaire de téléchargements',
  explorer: 'Accès aux fichiers de la Freebox',
  home: 'Gestion de l\'alarme et maison connectée',
  parental: 'Accès au contrôle parental',
  player: 'Contrôle du Freebox Player',
  profile: 'Gestion des profils utilisateur',
  pvr: 'Programmation des enregistrements',
  settings: 'Modification des réglages de la Freebox',
  tv: 'Accès au guide TV',
  vm: 'Contrôle de la VM',
  wdo: 'Provisionnement des équipements'
};

// Build the Freebox settings URL for managing app permissions
export const getFreeboxSettingsUrl = (freeboxUrl: string): string => {
  // Extract hostname from URL (e.g., "https://mafreebox.freebox.fr" -> "mafreebox.freebox.fr")
  try {
    const url = new URL(freeboxUrl);
    return `${url.protocol}//${url.host}/#Fbx.os.app.settings.Accounts`;
  } catch {
    // Fallback to default
    return 'http://mafreebox.freebox.fr/#Fbx.os.app.settings.Accounts';
  }
};

export const getPermissionErrorMessage = (permission: string, freeboxUrl?: string): string => {
  const label = PERMISSION_LABELS[permission] || permission;
  const settingsUrl = freeboxUrl ? getFreeboxSettingsUrl(freeboxUrl) : null;

  const baseMessage = `Le droit d'accès "${label}" est requis.`;
  const instructions = 'Ajoutez-le dans "Paramètres de la Freebox > Gestion des accès > Applications > Freebox Dashboard"';

  if (settingsUrl) {
    return `${baseMessage} ${instructions}`;
  }

  return `${baseMessage} ${instructions}`;
};

export const getPermissionShortError = (permission: string): string => {
  const label = PERMISSION_LABELS[permission] || permission;
  return `Permission "${label}" requise`;
};