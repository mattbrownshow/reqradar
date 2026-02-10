import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Loader2, Search } from 'lucide-react';
import DecisionMakerCard from './DecisionMakerCard';
import RevealContactModal from './RevealContactModal';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DecisionMakersTab({ 
  company, 
  contacts = [], 
  onFindDecisionMakers,
  finding = false 
}) {
  const [revealingContactId, setRevealingContactId] = useState(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const queryClient = useQueryClient();

  const handleRevealClick = (contact) => {
    setSelectedContact(contact);
    setShowRevealModal(true);
  };

  const handleConfirmReveal = async () => {
    if (!selectedContact) return;
    
    setRevealingContactId(selectedContact.id);
    
    try {
      const response = await base44.functions.invoke('revealContactDetails', {
        contact_id: selectedContact.id,
        company_id: company.id
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success('✓ Contact information revealed');
      queryClient.invalidateQueries({ queryKey: ["contacts", company.id] });
      setShowRevealModal(false);
    } catch (error) {
      console.error('Reveal error:', error);
      toast.error(error.message || 'Failed to reveal contact details');
    } finally {
      setRevealingContactId(null);
    }
  };

  // Separate contacts: those with contact info vs those without
  const revealedContacts = contacts.filter(c => c.email || c.phone);
  const unrevealedContacts = contacts.filter(c => !c.email && !c.phone);

  if (contacts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No decision makers identified yet
        </h3>
        <p className="text-gray-600 mb-6">
          Discover key decision makers at {company.name} to accelerate your outreach.
        </p>
        <Button
          onClick={onFindDecisionMakers}
          disabled={finding}
          className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
        >
          {finding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding Decision Makers...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Find Decision Makers
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-3">
          Uses advanced APIs to identify key contacts • Up to 5 decision makers per company
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Decision Makers ({contacts.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {revealedContacts.length} contact{revealedContacts.length !== 1 ? 's' : ''} revealed • 
            {unrevealedContacts.length > 0 && ` ${unrevealedContacts.length} available to reveal`}
          </p>
        </div>
        
        {contacts.length < 5 && (
          <Button
            variant="outline"
            onClick={onFindDecisionMakers}
            disabled={finding}
            className="gap-2"
          >
            {finding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find More
              </>
            )}
          </Button>
        )}
      </div>

      {/* Decision Maker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {contacts.map(contact => (
          <DecisionMakerCard
            key={contact.id}
            contact={contact}
            onRevealContact={handleRevealClick}
            revealing={revealingContactId === contact.id}
          />
        ))}
      </div>

      {/* Reveal Contact Modal */}
      <RevealContactModal
        open={showRevealModal}
        onClose={() => {
          setShowRevealModal(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        onConfirm={handleConfirmReveal}
        creditsRemaining={25}
        creditsTotal={100}
        revealing={!!revealingContactId}
      />
    </div>
  );
}