import { redirect } from 'solid-start';
import { commitSession, getSession } from './session';

export async function requireUser(request: Request) {
  const session = await getSession(request);
  const user = session.get('user');
  if (!user) throw redirect('/');
  return { user, session };
}

export async function createUserSession(email: string) {
  const session = await getSession(new Request('http://local'));
  session.set('user', { email });
  return commitSession(session);
}
