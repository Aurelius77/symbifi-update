-- Milestone-based payments per project (supports amount and/or percentage)
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  amount NUMERIC(15, 2),
  percentage NUMERIC(5, 2),
  sequence INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Planned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones
  ADD CONSTRAINT milestone_amount_or_percentage
  CHECK (
    amount IS NOT NULL
    OR percentage IS NOT NULL
  );

CREATE INDEX idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX idx_project_milestones_user_id ON public.project_milestones(user_id);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestones"
  ON public.project_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own milestones"
  ON public.project_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones"
  ON public.project_milestones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestones"
  ON public.project_milestones FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all milestones"
  ON public.project_milestones FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link payments to milestones (optional)
ALTER TABLE public.payments
  ADD COLUMN milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL;

CREATE INDEX idx_payments_milestone_id ON public.payments(milestone_id);
