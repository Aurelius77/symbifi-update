-- Add admin policies for payments and project_teams tables
-- Admins can view all data for auditing purposes

-- Drop existing policies and recreate with proper PERMISSIVE setting
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own project teams" ON public.project_teams;

-- Recreate user policies as PERMISSIVE
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own project teams" 
ON public.project_teams 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all project teams" 
ON public.project_teams 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for contractors and projects
DROP POLICY IF EXISTS "Users can view their own contractors" ON public.contractors;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Users can view their own contractors" 
ON public.contractors 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contractors" 
ON public.contractors 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));