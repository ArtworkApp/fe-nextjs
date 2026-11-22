import { AuthForm } from '../../components/auth/AuthForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; reset?: string | string[] }> }) {
  const { next, reset } = await searchParams;
  return <AuthForm mode="login" next={next} isPasswordResetComplete={reset === 'success'} />;
}
