import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Unlock, AlertCircle } from 'lucide-react';

export default function RevealContactModal({ 
  open, 
  onClose, 
  contact, 
  onConfirm, 
  creditsRemaining = 0,
  creditsTotal = 0,
  revealing 
}) {
  const hasCredits = creditsRemaining > 0;

  if (!hasCredits) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              No Credits Remaining
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-600">
            You've used all your credits for this month. Upgrade your plan or wait until your next billing date for credits to refresh.
          </DialogDescription>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-orange-600" />
            Reveal Contact Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-600">
            You're about to reveal contact information for:
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-1">
            <p className="font-bold text-gray-900">{contact?.full_name}</p>
            <p className="text-sm text-gray-600">{contact?.title}</p>
            <p className="text-sm text-gray-500">at {contact?.company_name}</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-900">
              <span className="font-semibold">This will use 1 credit</span> from your account.
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Credits remaining: {creditsRemaining} of {creditsTotal}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={revealing}>
            Cancel
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={onConfirm}
            disabled={revealing}
          >
            {revealing ? 'Revealing...' : 'Reveal Contact Info'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}