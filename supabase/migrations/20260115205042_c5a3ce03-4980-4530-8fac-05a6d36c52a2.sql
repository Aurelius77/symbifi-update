-- Create activity_logs table for tracking system activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'payment_created', 'payment_updated', 'team_added', 'team_updated', 'project_created', 'contractor_added'
  description TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'payment', 'project_team', 'project', 'contractor'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create activity logs
CREATE POLICY "Users can create activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to log payment activities
CREATE OR REPLACE FUNCTION public.log_payment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action_type, description, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'payment_created', 'Payment recorded', 'payment', NEW.id, 
      jsonb_build_object('amount', NEW.amount_paid, 'method', NEW.payment_method));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, action_type, description, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'payment_updated', 'Payment updated', 'payment', NEW.id,
      jsonb_build_object('amount', NEW.amount_paid));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to log project team activities
CREATE OR REPLACE FUNCTION public.log_project_team_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action_type, description, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'team_added', 'Contractor assigned to project', 'project_team', NEW.id,
      jsonb_build_object('status', NEW.payment_status));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, action_type, description, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'team_updated', 'Assignment updated', 'project_team', NEW.id,
      jsonb_build_object('status', NEW.payment_status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER on_payment_change
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_activity();

CREATE TRIGGER on_project_team_change
  AFTER INSERT OR UPDATE ON public.project_teams
  FOR EACH ROW EXECUTE FUNCTION public.log_project_team_activity();