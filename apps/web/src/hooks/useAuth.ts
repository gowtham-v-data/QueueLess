import { useAuthContext } from '../context/AuthProvider';

export default function useAuth() {
  return useAuthContext();
}
