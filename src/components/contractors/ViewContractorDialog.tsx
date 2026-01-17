import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, CreditCard, Briefcase, Calendar } from 'lucide-react';

interface Contractor {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone: string | null;
  bank_wallet_details: string | null;
  contractor_type: string;
  status: string;
  created_at?: string;
}

interface ViewContractorDialogProps {
  contractor: Contractor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewContractorDialog({ contractor, open, onOpenChange }: ViewContractorDialogProps) {
  if (!contractor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="block">{contractor.full_name}</span>
              <span className="text-sm font-normal text-muted-foreground">{contractor.role}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Status and Type */}
          <div className="flex items-center gap-2">
            <Badge variant={contractor.status === 'Active' ? 'default' : 'secondary'}>
              {contractor.status}
            </Badge>
            <Badge variant="outline">{contractor.contractor_type}</Badge>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Contact Information
            </h4>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{contractor.email}</p>
                </div>
              </div>

              {contractor.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{contractor.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Professional Details
            </h4>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Role / Skill</p>
                  <p className="text-sm font-medium">{contractor.role}</p>
                </div>
              </div>

              {contractor.created_at && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Added On</p>
                    <p className="text-sm font-medium">
                      {new Date(contractor.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          {contractor.bank_wallet_details && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Payment Details
              </h4>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Bank / Wallet Details</p>
                  <p className="text-sm font-medium whitespace-pre-wrap">{contractor.bank_wallet_details}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
