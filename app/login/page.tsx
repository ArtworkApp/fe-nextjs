import { AuthForm } from '../../components/auth/AuthForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={next} />;
}
