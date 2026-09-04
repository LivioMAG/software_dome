-- These lookup functions call validate_learner_session(), which updates the
-- session's last_accessed_at value. PostgreSQL must therefore treat them as
-- VOLATILE (the default), or loading the portal after a valid login fails.

alter function public.get_learner_business_office(text) volatile;
alter function public.get_learner_course_requirements(text) volatile;
