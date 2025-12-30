import Conf from 'conf';

const config = new Conf({ projectName: 'tachles-cli' });

export function setAuthToken(token: string) {
  config.set('authToken', token);
}

export function getAuthToken(): string | undefined {
  return config.get('authToken') as string | undefined;
}

export function clearAuthToken() {
  config.delete('authToken');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
