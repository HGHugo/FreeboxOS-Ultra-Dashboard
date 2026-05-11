import React, { useEffect, useState } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  User,
  Users,
  Clock,
  Trash2,
  CheckCheck,
  Plus,
  Search,
  ChevronLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { usePhoneStore } from '../stores';
import { useAuthStore } from '../stores/authStore';
import { PermissionBanner } from '../components/ui/PermissionBanner';
import type { CallEntry, Contact } from '../types/api';

// Format timestamp to relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
};

// Format duration in seconds
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}min ${sec}s`;
};

// Format phone number
const formatPhoneNumber = (number: string): string => {
  // Format French numbers
  if (number.length === 10 && number.startsWith('0')) {
    return number.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return number;
};

// Get call icon based on type
const getCallIcon = (type: CallEntry['type']) => {
  switch (type) {
    case 'incoming':
    case 'accepted':
      return PhoneIncoming;
    case 'outgoing':
      return PhoneOutgoing;
    case 'missed':
      return PhoneMissed;
    default:
      return Phone;
  }
};

// Get call type label
const getCallTypeLabel = (type: CallEntry['type']): string => {
  switch (type) {
    case 'incoming':
    case 'accepted':
      return 'Entrant';
    case 'outgoing':
      return 'Sortant';
    case 'missed':
      return 'Manqué';
    default:
      return type;
  }
};

// Call entry component
const CallEntryCard: React.FC<{
  call: CallEntry;
  onDelete: (id: number) => void;
}> = ({ call, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const Icon = getCallIcon(call.type);
  const isMissed = call.type === 'missed';

  const handleDelete = () => {
    if (showConfirm) {
      onDelete(call.id);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
      call.new ? 'bg-blue-900/20 border border-blue-700/50' : 'bg-[#1a1a1a] hover:bg-[#202020]'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          isMissed ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          <Icon size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {call.name || formatPhoneNumber(call.number)}
            </span>
            {call.new && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full">
                Nouveau
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{getCallTypeLabel(call.type)}</span>
            {call.duration > 0 && (
              <>
                <span>•</span>
                <span>{formatDuration(call.duration)}</span>
              </>
            )}
            <span>•</span>
            <span>{formatRelativeTime(call.datetime)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className={`p-2 rounded-lg transition-colors ${
          showConfirm
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'text-gray-500 hover:bg-gray-700 hover:text-white'
        }`}
        title={showConfirm ? 'Confirmer la suppression' : 'Supprimer'}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Contact card component
const ContactCard: React.FC<{
  contact: Contact;
  onDelete: (id: number) => void;
  onEdit: (contact: Contact) => void;
}> = ({ contact, onDelete, onEdit }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (showConfirm) {
      onDelete(contact.id);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div
      className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#202020] transition-colors cursor-pointer"
      onClick={() => onEdit(contact)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">{contact.display_name}</h3>
            {contact.company && (
              <p className="text-xs text-gray-500">{contact.company}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className={`p-2 rounded-lg transition-colors ${
            showConfirm
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-500 hover:bg-gray-700 hover:text-white'
          }`}
          title={showConfirm ? 'Confirmer la suppression' : 'Supprimer'}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {contact.numbers && contact.numbers.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {contact.numbers.map((num, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Phone size={12} className="text-gray-500" />
              <span className="text-gray-300">{formatPhoneNumber(num.number)}</span>
              {num.type && (
                <span className="text-xs text-gray-500">({num.type})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Contact form modal
const ContactFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Partial<Contact>) => Promise<void>;
  contact?: Contact;
}> = ({ isOpen, onClose, onSave, contact }) => {
  const [formData, setFormData] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    company: contact?.company || '',
    numbers: contact?.numbers || [{ number: '', type: 'mobile' }]
  });
  const [saving, setSaving] = useState(false);

  // Reset form when contact changes
  React.useEffect(() => {
    setFormData({
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      company: contact?.company || '',
      numbers: contact?.numbers?.length ? contact.numbers : [{ number: '', type: 'mobile' }]
    });
  }, [contact]);

  const handleAddNumber = () => {
    setFormData({
      ...formData,
      numbers: [...formData.numbers, { number: '', type: 'mobile' }]
    });
  };

  const handleRemoveNumber = (index: number) => {
    setFormData({
      ...formData,
      numbers: formData.numbers.filter((_, i) => i !== index)
    });
  };

  const handleNumberChange = (index: number, field: 'number' | 'type', value: string) => {
    const newNumbers = [...formData.numbers];
    newNumbers[index] = { ...newNumbers[index], [field]: value };
    setFormData({ ...formData, numbers: newNumbers });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        first_name: formData.first_name,
        last_name: formData.last_name,
        display_name: `${formData.first_name} ${formData.last_name}`.trim() || 'Sans nom',
        company: formData.company || undefined,
        numbers: formData.numbers.filter(n => n.number.trim())
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#151515] w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">
            {contact ? 'Modifier le contact' : 'Nouveau contact'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <ChevronLeft size={20} className="rotate-180" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Entreprise</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Optionnel"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">Numéros de téléphone</label>
              <button
                onClick={handleAddNumber}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {formData.numbers.map((num, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={num.number}
                    onChange={(e) => handleNumberChange(i, 'number', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="06 12 34 56 78"
                  />
                  <select
                    value={num.type}
                    onChange={(e) => handleNumberChange(i, 'type', e.target.value)}
                    className="px-2 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="home">Domicile</option>
                    <option value="work">Travail</option>
                    <option value="fax">Fax</option>
                  </select>
                  {formData.numbers.length > 1 && (
                    <button
                      onClick={() => handleRemoveNumber(i)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.first_name && !formData.last_name}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {contact ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PhonePageProps {
  onBack: () => void;
}

export const PhonePage: React.FC<PhonePageProps> = ({ onBack }) => {
  const {
    calls,
    contacts,
    isLoading,
    error,
    fetchCalls,
    fetchContacts,
    markCallsAsRead,
    deleteCall,
    deleteAllCalls,
    createContact,
    updateContact,
    deleteContact
  } = usePhoneStore();

  // Get permissions from auth store
  const { permissions, freeboxUrl } = useAuthStore();
  const hasCallsPermission = permissions.calls === true;
  const hasContactsPermission = permissions.contacts === true;

  const [activeTab, setActiveTab] = useState<'calls' | 'contacts'>('calls');
  const [searchQuery, setSearchQuery] = useState('');
  const [callFilter, setCallFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);

  // Fetch data on mount
  useEffect(() => {
    fetchCalls();
    fetchContacts();
  }, [fetchCalls, fetchContacts]);

  // Filter calls
  const filteredCalls = calls.filter(call => {
    // Filter by type
    if (callFilter === 'missed' && call.type !== 'missed') return false;
    if (callFilter === 'incoming' && call.type !== 'incoming' && call.type !== 'accepted') return false;
    if (callFilter === 'outgoing' && call.type !== 'outgoing') return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!call.number.includes(query) && !call.name?.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.display_name.toLowerCase().includes(query) ||
      contact.first_name?.toLowerCase().includes(query) ||
      contact.last_name?.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query) ||
      contact.numbers?.some(n => n.number.includes(query))
    );
  });

  // Count new calls
  const newCallsCount = calls.filter(c => c.new).length;
  const missedCallsCount = calls.filter(c => c.type === 'missed').length;

  const handleMarkAllRead = async () => {
    await markCallsAsRead();
  };

  const handleDeleteAllCalls = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique des appels ?')) {
      await deleteAllCalls();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Phone size={24} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Téléphone</h1>
                  <p className="text-sm text-gray-500">Contacts & Journal d'appels</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('calls')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'calls'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock size={16} />
                Journal ({calls.length})
                {newCallsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full">
                    {newCallsCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'contacts'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users size={16} />
                Contacts ({contacts.length})
              </span>
            </button>
          </div>

          {/* Actions */}
          {activeTab === 'calls' && calls.length > 0 && (
            <div className="flex items-center gap-2">
              {newCallsCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <CheckCheck size={14} />
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={handleDeleteAllCalls}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Effacer l'historique
              </button>
            </div>
          )}

          {activeTab === 'contacts' && (
            <button
              onClick={() => {
                setEditingContact(undefined);
                setShowContactForm(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Plus size={14} />
              Ajouter
            </button>
          )}
        </div>

        {/* Call filters */}
        {activeTab === 'calls' && (
          <div className="flex items-center gap-2 mb-4">
            {(['all', 'missed', 'incoming', 'outgoing'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setCallFilter(filter)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  callFilter === filter
                    ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                    : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                }`}
              >
                {filter === 'all' && 'Tous'}
                {filter === 'missed' && `Manqués (${missedCallsCount})`}
                {filter === 'incoming' && 'Entrants'}
                {filter === 'outgoing' && 'Sortants'}
              </button>
            ))}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Calls tab */}
        {!isLoading && activeTab === 'calls' && (
          <>
            {/* Permission warning */}
            {!hasCallsPermission && (
              <PermissionBanner permission="calls" freeboxUrl={freeboxUrl} />
            )}

            {filteredCalls.length > 0 ? (
              <div className="space-y-2">
                {filteredCalls.map((call) => (
                  <CallEntryCard
                    key={call.id}
                    call={call}
                    onDelete={deleteCall}
                  />
                ))}
              </div>
            ) : calls.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Phone size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun résultat</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Aucun appel ne correspond à votre recherche ou filtre.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Phone size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun appel</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Votre journal d'appels est vide. Les appels entrants et sortants apparaîtront ici.
                </p>
              </div>
            )}
          </>
        )}

        {/* Contacts tab */}
        {!isLoading && activeTab === 'contacts' && (
          <>
            {/* Permission warning */}
            {!hasContactsPermission && (
              <PermissionBanner permission="contacts" freeboxUrl={freeboxUrl} />
            )}

            {filteredContacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onDelete={deleteContact}
                    onEdit={(c) => {
                      setEditingContact(c);
                      setShowContactForm(true);
                    }}
                  />
                ))}
              </div>
            ) : contacts.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun résultat</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Aucun contact ne correspond à votre recherche.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Users size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun contact</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Vous n'avez pas encore de contacts. Ajoutez-en un pour commencer.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Contact form modal */}
      <ContactFormModal
        isOpen={showContactForm}
        onClose={() => {
          setShowContactForm(false);
          setEditingContact(undefined);
        }}
        onSave={async (contact) => {
          if (editingContact) {
            await updateContact(editingContact.id, contact);
          } else {
            await createContact(contact);
          }
          fetchContacts();
        }}
        contact={editingContact}
      />
    </div>
  );
};

export default PhonePage;