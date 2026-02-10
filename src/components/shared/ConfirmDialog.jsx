import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ConfirmDialog({ 
  open, 
  onClose, 
  onConfirm,
  title = "Confirm Action",
  description,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default" // default, danger, warning
}) {
  const variantStyles = {
    default: "bg-orange-600 hover:bg-orange-700",
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-yellow-600 hover:bg-yellow-700"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant !== 'default' && <AlertCircle className="w-5 h-5 text-orange-600" />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-gray-600 whitespace-pre-line">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            className={`${variantStyles[variant]} text-white`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}