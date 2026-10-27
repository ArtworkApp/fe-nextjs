import { AuthForm } from '../../components/auth/AuthForm';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={next} />;
}
