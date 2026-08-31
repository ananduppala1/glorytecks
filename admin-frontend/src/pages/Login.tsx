import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/Field';
import { safeRedirectPath } from '@/lib/safeUrl';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } });

  // Where the visitor was heading before ProtectedRoute intercepted them.
  // It originates in the URL, so it is validated as an in-app path before it
  // can become a navigation target — see safeRedirectPath.
  const from = safeRedirectPath(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname,
  );

  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, hsl(var(--background)) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M12 3l7 3.5v5C19 16 16 19.5 12 21c-4-1.5-7-5-7-9.5v-5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M8.5 12l2.4 2.4L15.5 9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-semibold">GloryTecks</span>
        </div>

        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            The control room for everything your website shows.
          </h1>
          <p className="text-sm leading-relaxed text-background/70">
            Manage courses, blog content, placements and leads from one place. Changes here flow
            straight to the live site.
          </p>
        </div>

        <div className="relative text-2xs uppercase tracking-wider text-background/50">
          Admin Console · Hyderabad
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <path d="M12 3l7 3.5v5C19 16 16 19.5 12 21c-4-1.5-7-5-7-9.5v-5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M8.5 12l2.4 2.4L15.5 9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-base font-semibold">GloryTecks</span>
            </div>
          </div>

          <div className="mb-6 space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your admin credentials to continue.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@glorytecks.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
