import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { signIn, signUp, signOut } from '../services/firebase/auth';
import { getCoupleByEmail, createCouple } from '../services/firebase/firestore';

export const useAuth = () => {
  const authContext = useAuthContext();

  const login = async (email: string, password: string): Promise<void> => {
    const user = await signIn(email, password);
    if (user?.email) {
      // Check if couple exists, if not create one
      let couple = await getCoupleByEmail(user.email);
      if (!couple) {
        await createCouple({
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
        }, user.uid); // Pass user.uid as document ID
      }
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    const user = await signUp(email, password, name);
    if (user?.email) {
      // Create couple record using user.uid as document ID
      await createCouple({
        email: user.email,
        name: name || user.email.split('@')[0],
      }, user.uid); // Pass user.uid as document ID
    }
  };

  const logout = async (): Promise<void> => {
    await signOut();
  };

  return {
    ...authContext,
    login,
    register,
    logout,
  };
};

