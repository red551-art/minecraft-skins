import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Search, Upload, Download, LogIn, LogOut, User, Loader2, ChevronLeft, Heart, Globe, Eye, EyeOff, Camera, FileText, Crop, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SkinViewer from './components/SkinViewer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { translations, Language } from './translations';
import Cropper from 'react-easy-crop';
import getCroppedImg from './utils/cropImage';
import confetti from 'canvas-confetti';
import { auth, db, googleProvider } from './firebase';

const PixelHeart = ({ size = 24, filled = false, className = "" }: { size?: number, filled?: boolean, className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 11 9" 
      className={className}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {filled ? (
        <>
          <path fill="#000000" fillRule="evenodd" clipRule="evenodd" d="M0 0H11V9H0V0ZM1 1V8H10V1H6V4H5V1H1Z" />
          <path fill="#FF0000" d="M1 1H5V4H6V1H10V8H1V1Z" />
          <path fill="#FFFFFF" fillOpacity="0.8" d="M1 1H3V2H2V3H1V1Z" />
        </>
      ) : (
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M0 0H11V9H0V0ZM1 1V8H10V1H6V4H5V1H1Z" />
      )}
    </svg>
  );
};
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where, serverTimestamp, increment, limit, onSnapshot } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  constructor(props: any) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch (e) {
        // Not a JSON string
      }
      return (
        <div className="min-h-screen bg-[#1A1A1A] text-white flex items-center justify-center p-4">
          <div className="bg-[#2A2A2A] p-8 rounded-xl border border-red-500/30 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Oops! Something went wrong.</h2>
            <p className="text-gray-300 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Skin {
  id: string;
  name: string;
  description: string;
  imageData: string;
  downloads: number;
  authorName: string;
  authorId: string;
  createdAt: any;
  similar?: Skin[];
  authorAvatar?: string;
}

interface UserData {
  id: string;
  name: string;
  picture?: string;
  bio?: string;
  createdAt?: any;
  favorites?: string[];
}

interface Notification {
  id: string;
  userId: string;
  message: string;
  createdAt: any;
}

const CLICK_SOUND = 'https://www.soundjay.com/buttons/sounds/button-3.mp3';

const Logo = () => (
  <div className="flex items-center gap-1 md:gap-2">
    <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center shrink-0">
      {/* Exquisite Legendary Spear - Professional Pixel Art */}
      <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-2xl" style={{ imageRendering: 'pixelated' }}>
        {/* Magic Aura */}
        <circle cx="9" cy="7" r="5" fill="#5d3fd3" opacity="0.1" filter="blur(3px)" />
        
        {/* Flowing Enchanted Ribbons */}
        <path d="M3 13 C 1 11, 2 8, 5 7" stroke="#7e57c2" strokeWidth="0.3" fill="none" opacity="0.5" />
        <path d="M4 14 C 2 12, 3 9, 6 8" stroke="#5d3fd3" strokeWidth="0.3" fill="none" opacity="0.3" />
        
        {/* Spear Handle (Polished Ancient Wood) */}
        <rect x="1" y="14" width="1" height="1" fill="#1a0f0d" />
        <rect x="2" y="13" width="1" height="1" fill="#2d1b18" />
        <rect x="3" y="12" width="1" height="1" fill="#3e2723" />
        <rect x="4" y="11" width="1" height="1" fill="#4e342e" />
        <rect x="5" y="10" width="1" height="1" fill="#5d4037" />
        <rect x="6" y="9" width="1" height="1" fill="#6d4c41" />
        
        {/* The Crossguard (Netherite & Gold) */}
        <rect x="6" y="8" width="2" height="2" fill="#1a1a1a" />
        <rect x="5" y="9" width="1" height="1" fill="#1a1a1a" />
        <rect x="8" y="7" width="1" height="1" fill="#1a1a1a" />
        <rect x="7" y="8" width="1" height="1" fill="#ffca28" /> {/* Gold Core */}
        <rect x="6" y="7" width="1" height="1" fill="#ffca28" opacity="0.6" />
        
        {/* Spear Head - Sharp, Faceted, Legendary */}
        {/* Dark Base */}
        <rect x="7" y="7" width="1" height="1" fill="#1a1a1a" />
        <rect x="8" y="6" width="1" height="1" fill="#1a1a1a" />
        
        {/* Main Blade (Netherite) */}
        <rect x="8" y="8" width="1" height="1" fill="#263238" />
        <rect x="9" y="7" width="1" height="1" fill="#263238" />
        <rect x="10" y="6" width="1" height="1" fill="#263238" />
        <rect x="11" y="5" width="1" height="1" fill="#263238" />
        <rect x="12" y="4" width="1" height="1" fill="#263238" />
        <rect x="13" y="3" width="1" height="1" fill="#263238" />
        
        {/* Blade Edge (Silver/Diamond Highlight) */}
        <rect x="9" y="6" width="1" height="1" fill="#cfd8dc" />
        <rect x="10" y="5" width="1" height="1" fill="#cfd8dc" />
        <rect x="11" y="4" width="1" height="1" fill="#cfd8dc" />
        <rect x="12" y="3" width="1" height="1" fill="#cfd8dc" />
        <rect x="13" y="2" width="1" height="1" fill="#eceff1" />
        
        {/* The Tip (Gleaming Sparkle) */}
        <rect x="14" y="1" width="1" height="1" fill="#ffffff" />
        <rect x="14" y="0" width="1" height="1" fill="#ffffff" opacity="0.4" />
        <rect x="15" y="1" width="1" height="1" fill="#ffffff" opacity="0.4" />
        <rect x="13" y="1" width="1" height="1" fill="#b0bec5" />
        <rect x="14" y="2" width="1" height="1" fill="#b0bec5" />

        {/* Barbs / Wings (Sharp & Aggressive) */}
        <rect x="9" y="8" width="1" height="1" fill="#1a1a1a" />
        <rect x="10" y="9" width="1" height="1" fill="#1a1a1a" />
        <rect x="7" y="5" width="1" height="1" fill="#1a1a1a" />
        <rect x="6" y="4" width="1" height="1" fill="#1a1a1a" />
        
        {/* Enchantment Pulse (Glowing Purple) */}
        <rect x="11" y="6" width="1" height="1" fill="#d500f9" opacity="0.5" />
        <rect x="12" y="5" width="1" height="1" fill="#d500f9" opacity="0.3" />
        <rect x="8" y="9" width="1" height="1" fill="#d500f9" opacity="0.4" />
      </svg>
    </div>
    <span className="text-xl md:text-2xl font-black tracking-tighter text-black uppercase drop-shadow-sm">
      Craft<span className="text-[#5d3fd3]">Skins</span>
    </span>
  </div>
);

export default function App() {
  const [view, setView] = useState<'home' | 'upload' | 'detail' | 'profile' | 'publicProfile' | 'mySkins' | 'editSkin' | 'favorites'>('home');
  const [allSkins, setAllSkins] = useState<Skin[]>([]);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<UserData | null>(null);
  const [authorSkins, setAuthorSkins] = useState<Skin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  const [avatarBase64, setAvatarBase64] = useState<string>('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [showProfile, setShowProfile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const t = translations[lang];
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: firebaseUser.uid, ...userDoc.data() } as UserData);
          } else {
            // Create user profile
            const newUser = {
              name: (firebaseUser.displayName || 'Player').substring(0, 50),
              picture: firebaseUser.photoURL || '',
              bio: '',
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser({ id: firebaseUser.uid, ...newUser } as unknown as UserData);
          }
        } catch (error: any) {
          console.error("Auth State Error:", error);
          setAuthError(error.message || "Failed to load user profile");
          setShowAuthModal(true);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    const q = query(collection(db, 'skins'), orderBy('createdAt', 'desc'));
    const unsubscribeSkins = onSnapshot(q, (snapshot) => {
      const loadedSkins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Skin));
      setAllSkins(loadedSkins);
      setSkins(loadedSkins);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'skins');
    });

    audioRef.current = new Audio(CLICK_SOUND);
    return () => {
      unsubscribeAuth();
      unsubscribeSkins();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });
    return () => unsubscribe();
  }, [user?.id]);

  const playClick = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const toggleLang = () => {
    playClick();
    setLang(prev => prev === 'en' ? 'ru' : 'en');
  };

  useEffect(() => {
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      setSkins(allSkins.filter(s => 
        s.name.toLowerCase().includes(lowerSearch) || 
        (s.description && s.description.toLowerCase().includes(lowerSearch))
      ));
    } else {
      setSkins(allSkins);
    }
  }, [allSkins, searchQuery]);

  const handleGoogleLogin = async () => {
    playClick();
    setAuthError('');
    setAuthMessage('');
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (e: any) {
      setAuthError(e.message || t.authFailed);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setAuthError('');
    setAuthMessage('');
    
    if (!email || !password) {
      setAuthError('Please enter email and password');
      return;
    }
    
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setAuthMessage(t.verificationSent);
        await signOut(auth);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          setAuthError(t.verifyEmailFirst);
          await signOut(auth);
          return;
        }
        setShowAuthModal(false);
      }
    } catch (error: any) {
      setAuthError(error.message || t.authFailed);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        if (croppedImage) {
          setAvatarBase64(croppedImage);
          setImageToCrop(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    playClick();
    try {
      await signOut(auth);
      setUser(null);
      setShowProfile(false);
      setView('home');
      showToast('Logged out successfully');
    } catch (e: any) {
      showToast(e.message || 'Logout failed', 'error');
    }
  };

  const updateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    playClick();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: name || "",
        bio: bio || "",
        picture: avatarBase64 || user.picture || ""
      });
      showToast(t.profileUpdated);
      // Update local state
      setUser({ ...user, name, bio, picture: avatarBase64 || user.picture });
      setView('home');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`);
      showToast('Failed to update profile', 'error');
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    playClick();
    
    if (!user) {
      showToast(t.noAccountError, 'error');
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const file = formData.get('skinFile') as File;

    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const newSkinRef = doc(collection(db, 'skins'));
        await setDoc(newSkinRef, {
          authorId: user.id,
          authorName: user.name,
          name,
          description,
          imageData: base64,
          downloads: 0,
          createdAt: serverTimestamp()
        });
        showToast(t.uploadSuccess);
        setView('home');
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'skins');
        showToast(t.uploadError, 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const viewSkin = async (id: string) => {
    playClick();
    setLoading(true);
    try {
      const skinDoc = await getDoc(doc(db, 'skins', id));
      if (skinDoc.exists()) {
        const skinData = { id: skinDoc.id, ...skinDoc.data() } as Skin;
        
        // Fetch author data
        const authorDoc = await getDoc(doc(db, 'users', skinData.authorId));
        const authorData = authorDoc.exists() ? authorDoc.data() as UserData : null;
        
        // Fetch similar skins
        const q = query(collection(db, 'skins'), limit(5));
        const simSnapshot = await getDocs(q);
        const similar = simSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Skin))
          .filter(s => s.id !== id)
          .slice(0, 4);
          
        setSelectedSkin({ ...skinData, similar, authorAvatar: authorData?.picture } as any);
        setView('detail');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `skins/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const viewAuthorProfile = async (authorId: string) => {
    playClick();
    setLoading(true);
    try {
      const authorDoc = await getDoc(doc(db, 'users', authorId));
      if (authorDoc.exists()) {
        setSelectedAuthor({ id: authorDoc.id, ...authorDoc.data() } as UserData);
        
        // Fetch author's skins
        const q = query(collection(db, 'skins'), where('authorId', '==', authorId), orderBy('createdAt', 'desc'));
        const skinsSnapshot = await getDocs(q);
        setAuthorSkins(skinsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Skin)));
        
        setView('publicProfile');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${authorId}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadSkin = async (skin: Skin) => {
    playClick();
    try {
      await updateDoc(doc(db, 'skins', skin.id), {
        downloads: increment(1)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `skins/${skin.id}`);
    }
    
    const link = document.createElement('a');
    link.href = skin.imageData || (skin as any).image_data;
    link.download = `${skin.name}.png`;
    link.click();
  };

  const toggleFavorite = async (skinId: string, event?: React.MouseEvent) => {
    playClick();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.id);
      const isFavorited = user.favorites?.includes(skinId);
      
      let newFavorites = user.favorites || [];
      if (isFavorited) {
        newFavorites = newFavorites.filter(id => id !== skinId);
      } else {
        newFavorites = [...newFavorites, skinId];
        // Trigger confetti
        if (event) {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          const x = (rect.left + rect.width / 2) / window.innerWidth;
          const y = (rect.top + rect.height / 2) / window.innerHeight;
          
          const defaults = {
            spread: 360,
            ticks: 100,
            gravity: 0.8,
            decay: 0.94,
            startVelocity: 30,
            shapes: ['square'] as confetti.Shape[],
            colors: ['#FF0000', '#CC0000', '#990000', '#000000'],
            zIndex: 1000,
            disableForReducedMotion: true
          };

          confetti({ ...defaults, particleCount: 50, origin: { x, y } });
          setTimeout(() => confetti({ ...defaults, particleCount: 40, startVelocity: 20, origin: { x, y } }), 100);
          setTimeout(() => confetti({ ...defaults, particleCount: 60, startVelocity: 45, origin: { x, y } }), 200);
        } else {
          confetti({
            particleCount: 100,
            spread: 360,
            shapes: ['square'] as confetti.Shape[],
            colors: ['#FF0000', '#CC0000', '#990000', '#000000'],
            disableForReducedMotion: true,
            zIndex: 1000,
          });
        }
      }

      await updateDoc(userRef, {
        favorites: newFavorites
      });

      setUser({ ...user, favorites: newFavorites });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const deleteSkin = async (id: string, skinName: string, authorId: string) => {
    setConfirmModal({
      show: true,
      title: t.confirmDeleteTitle,
      message: t.confirmDelete.replace('{name}', skinName),
      onConfirm: async () => {
        playClick();
        try {
          await deleteDoc(doc(db, 'skins', id));
          
          // If admin is deleting someone else's skin, send notification
          if (auth.currentUser?.email === 'redskas5119@gmail.com' && authorId !== user?.id) {
            await setDoc(doc(collection(db, 'notifications')), {
              userId: authorId,
              message: lang === 'ru' ? `Модерация не одобрила ваш скин: ${skinName}` : `Moderation did not approve your skin: ${skinName}`,
              createdAt: serverTimestamp()
            });
          }

          setAllSkins(prev => prev.filter(s => s.id !== id));
          if (selectedSkin?.id === id) {
            setSelectedSkin(null);
            setView('home');
          }
          showToast('Skin deleted successfully');
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `skins/${id}`);
          showToast('Failed to delete skin', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleEditSkin = (skin: Skin) => {
    playClick();
    setSelectedSkin(skin);
    setView('editSkin');
  };

  const updateSkin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    playClick();
    if (!selectedSkin) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      await updateDoc(doc(db, 'skins', selectedSkin.id), {
        name,
        description
      });
      showToast('Skin updated successfully');
      setView('mySkins');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `skins/${selectedSkin.id}`);
      showToast('Failed to update skin', 'error');
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#1e1e1e]">
        {/* Header */}
        <header className="mc-panel border-t-0 border-x-0 rounded-none z-30 sticky top-0 flex items-center justify-between px-4 md:px-8 py-3 bg-[#c6c6c6]">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { playClick(); setView('home'); }}>
          <Logo />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={toggleLang}
            className="mc-button px-2 py-1 flex items-center gap-1 text-sm h-10"
          >
            <Globe size={16} />
            {lang.toUpperCase()}
          </button>

          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <button 
                  onClick={() => { playClick(); setShowNotifications(!showNotifications); }}
                  className="mc-button p-2 min-w-[40px] h-10 shrink-0 relative"
                >
                  <Bell size={18} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full pixel-border">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 mc-panel z-50 p-2 max-h-96 overflow-y-auto">
                    <h3 className="text-lg font-bold uppercase mb-2 border-b border-black/20 pb-2">
                      {lang === 'ru' ? 'Уведомления' : 'Notifications'}
                    </h3>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-mc-dark-gray text-center py-4">
                        {lang === 'ru' ? 'Нет новых уведомлений' : 'No new notifications'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map(notif => (
                          <div key={notif.id} className="bg-white/50 p-2 pixel-border text-sm relative group">
                            <p className="text-black pr-6">{notif.message}</p>
                            <p className="text-xs text-mc-dark-gray mt-1">
                              {notif.createdAt?.toDate?.() ? notif.createdAt.toDate().toLocaleString() : ''}
                            </p>
                            <button 
                              onClick={async () => {
                                playClick();
                                try {
                                  await deleteDoc(doc(db, 'notifications', notif.id));
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="absolute top-1 right-1 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => { playClick(); setShowProfile(true); }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <span className="hidden sm:block text-black font-bold text-sm md:text-base max-w-[100px] truncate">{user.name}</span>
                <div className="w-8 h-8 md:w-10 md:h-10 pixel-border bg-mc-gray flex items-center justify-center overflow-hidden shrink-0">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-white" />
                  )}
                </div>
              </button>
              <button onClick={handleLogout} className="mc-button p-2 min-w-[40px] h-10 shrink-0">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => { playClick(); setShowAuthModal(true); }} className="mc-button-green mc-button text-sm md:text-base px-3 py-2 h-10 shrink-0">
              <LogIn size={18} />
              <span className="ml-1 uppercase hidden sm:inline">{t.login}</span>
            </button>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mc-panel w-full max-w-md relative p-4 md:p-8"
            >
              <button 
                onClick={() => { playClick(); setShowProfile(false); }}
                className="absolute -top-4 -right-4 mc-button w-10 h-10 flex items-center justify-center text-2xl"
              >
                X
              </button>
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 pixel-border bg-mc-gray flex items-center justify-center overflow-hidden">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-white" />
                  )}
                </div>
                <h2 className="text-3xl font-bold text-black uppercase">{user.name}</h2>
                
                {user.bio && (
                  <div className="w-full bg-white/50 p-4 pixel-border">
                    <p className="text-black text-center italic">"{user.bio}"</p>
                  </div>
                )}
                
                <div className="w-full border-t border-black/10 pt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-mc-dark-gray text-sm uppercase font-bold">
                    <span>{t.createdAt}:</span>
                    <span>{new Date(user.createdAt?.toDate?.() || user.createdAt || '').toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-3 mt-4">
                  <button 
                    onClick={() => { playClick(); setShowProfile(false); setView('mySkins'); }}
                    className="mc-button w-full uppercase bg-blue-600"
                  >
                    <FileText size={18} />
                    {t.mySkins}
                  </button>

                  <button 
                    onClick={() => { playClick(); setShowProfile(false); setView('favorites'); }}
                    className="mc-button w-full uppercase bg-red-500"
                  >
                    <PixelHeart size={18} filled={true} />
                    {t.favoritesTab}
                  </button>
                  
                  <button 
                    onClick={() => { playClick(); setShowProfile(false); setView('profile'); }}
                    className="mc-button w-full uppercase"
                  >
                    <User size={18} />
                    {t.editProfile}
                  </button>
                  
                  <button 
                    onClick={handleLogout}
                    className="mc-button w-full bg-red-600 uppercase"
                  >
                    <LogOut size={18} />
                    {t.logout}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AnimatePresence>
        {imageToCrop && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mc-panel w-full max-w-lg relative flex flex-col gap-4"
            >
              <h2 className="text-2xl font-bold text-black uppercase text-center">{t.cropAvatar}</h2>
              
              <div className="relative w-full aspect-square bg-black pixel-border overflow-hidden">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="flex flex-col gap-4">
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex gap-4">
                  <button 
                    onClick={() => { playClick(); setImageToCrop(null); }}
                    className="mc-button flex-1 py-3 uppercase"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => { playClick(); showCroppedImage(); }}
                    className="mc-button-green mc-button flex-1 py-3 uppercase"
                  >
                    {t.saveCrop}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mc-panel w-full max-w-sm relative"
            >
              <button 
                onClick={() => { playClick(); setShowAuthModal(false); }}
                className="absolute -top-4 -right-4 mc-button w-10 h-10 flex items-center justify-center text-2xl"
              >
                X
              </button>
              
              <h2 className="text-3xl font-bold text-black mb-8 text-center uppercase tracking-widest">
                {isRegistering ? t.register : t.login}
              </h2>
              
              <div className="space-y-4">
                {authError && (
                  <p className="text-red-600 font-bold text-center bg-red-100 p-2 pixel-border text-sm">
                    {authError}
                  </p>
                )}
                
                <button 
                  onClick={handleGoogleLogin}
                  className="mc-button-green mc-button w-full py-4 text-xl uppercase flex items-center justify-center gap-3"
                >
                  <div className="bg-white p-1 rounded-full flex items-center justify-center w-8 h-8 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  {t.loginWithGoogle}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-xl">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    className="mc-input w-full pr-12 h-12 pl-4"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-mc-gray" size={20} />
                </div>
                
                <button 
                  onClick={() => { playClick(); setView('upload'); }}
                  className="mc-button-green mc-button h-12 whitespace-nowrap uppercase"
                >
                  <Upload size={20} />
                  {t.uploadSkin}
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-mc-green" size={48} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {skins.length > 0 ? skins.map((skin) => (
                    <motion.div
                      key={skin.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mc-panel cursor-pointer group flex flex-col h-full"
                      onClick={() => viewSkin(skin.id)}
                    >
                      <div className="aspect-[3/4] bg-[#222] pixel-border mb-3 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 z-10 pointer-events-none" />
                        <SkinViewer 
                          skinUrl={skin.imageData || (skin as any).image_data} 
                          className="w-full h-full" 
                          minHeight="100%" 
                          autoRotate={true} 
                          walking={true} 
                          controls={false} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-black truncate uppercase">{skin.name}</h3>
                        <div className="flex justify-between items-center mt-1 text-xs md:text-sm text-mc-dark-gray">
                          <span className="truncate mr-2">{t.uploadedBy} {skin.authorName || (skin as any).author_name}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1">
                              <Download size={14} />
                              {skin.downloads}
                            </div>
                            {user?.favorites?.includes(skin.id) && (
                              <PixelHeart size={14} className="text-red-500" filled={true} />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-full text-center py-20">
                      {searchQuery.toLowerCase() === 'null' ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center gap-6"
                        >
                          <div className="relative w-32 h-32">
                            <div className="absolute inset-0 bg-purple-600 blur-2xl opacity-50 animate-pulse" />
                            <img 
                              src="https://minecraft.wiki/images/Herobrine_Skin.png" 
                              alt="Herobrine" 
                              className="w-full h-full object-contain relative z-10 brightness-50 grayscale contrast-150"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-4xl font-black text-purple-400 uppercase tracking-tighter glitch-text">
                              {t.nullSearchTitle}
                            </h3>
                            <p className="text-mc-dark-gray font-bold italic">
                              {t.nullSearchDesc}
                            </p>
                          </div>
                          <button 
                            onClick={() => { playClick(); setSearchQuery(''); }}
                            className="mc-button px-8 py-2 mt-4"
                          >
                            {t.cancel}
                          </button>
                        </motion.div>
                      ) : (
                        <div className="mc-panel p-10">
                          <p className="text-2xl text-mc-dark-gray uppercase">{t.noSkins}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : null}

          {view === 'profile' && user && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto"
            >
              <button 
                onClick={() => { playClick(); setView('home'); }}
                className="mc-button mb-6 uppercase"
              >
                <ChevronLeft size={20} />
                {t.backToHub}
              </button>

              <div className="mc-panel p-8">
                <h2 className="text-3xl font-bold text-black uppercase mb-8 flex items-center gap-3">
                  <User size={32} />
                  {t.editProfile}
                </h2>

                <form onSubmit={updateProfile} className="space-y-6">
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                      <div className="w-32 h-32 pixel-border bg-mc-gray flex items-center justify-center overflow-hidden">
                        {(avatarBase64 || user.picture) ? (
                          <img src={avatarBase64 || user.picture} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={64} className="text-white" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera size={32} className="text-white" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImageToCrop(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-mc-dark-gray text-sm uppercase font-bold">{t.selectAvatar}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-mc-dark-gray font-bold uppercase">{t.username}</label>
                    <input 
                      name="name"
                      defaultValue={user.name}
                      className="mc-input w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-mc-dark-gray font-bold uppercase">{t.bio}</label>
                    <textarea 
                      name="bio"
                      defaultValue={user.bio}
                      className="mc-input w-full h-32 resize-none"
                      placeholder="..."
                    />
                  </div>

                  <button type="submit" className="mc-button-green mc-button w-full h-14 text-xl uppercase mt-4">
                    {t.saveChanges}
                  </button>
                </form>
              </div>

              <div className="mt-8 space-y-6">
                <div className="flex justify-between items-center border-b-4 border-black/10 pb-2">
                  <h3 className="text-2xl font-bold text-black uppercase tracking-widest">
                    {lang === 'ru' ? 'МОИ РАБОТЫ' : 'MY WORKS'}
                  </h3>
                  <button 
                    onClick={() => { playClick(); setView('mySkins'); }}
                    className="mc-button py-1 px-3 text-xs uppercase bg-blue-600"
                  >
                    {lang === 'ru' ? 'УПРАВЛЕНИЕ' : 'MANAGE'}
                  </button>
                </div>
                
                {allSkins.filter(s => s.authorId === user.id).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {allSkins.filter(s => s.authorId === user.id).map(skin => (
                      <motion.div 
                        key={skin.id} 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mc-panel p-2 cursor-pointer group"
                        onClick={() => viewSkin(skin.id)}
                      >
                        <div className="aspect-square bg-[#222] pixel-border mb-2 overflow-hidden relative">
                          <SkinViewer 
                            skinUrl={skin.imageData} 
                            className="w-full h-full" 
                            autoRotate={true} 
                            controls={false} 
                          />
                        </div>
                        <p className="text-sm text-black truncate text-center font-bold uppercase group-hover:text-mc-green transition-colors">
                          {skin.name}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="mc-panel bg-white/30 p-8 text-center">
                    <p className="text-mc-dark-gray uppercase font-bold">
                      {lang === 'ru' ? 'У вас пока нет опубликованных скинов' : 'You haven\'t published any skins yet'}
                    </p>
                    <button 
                      onClick={() => setView('upload')}
                      className="mc-button-green mc-button mt-4 uppercase text-sm"
                    >
                      {t.uploadSkin}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <button onClick={() => { playClick(); setView('home'); }} className="mc-button mb-6 uppercase">
                <ChevronLeft size={20} /> {t.backToHub}
              </button>
              
              <div className="mc-panel">
                <h2 className="text-3xl font-bold text-black mb-8 text-center uppercase tracking-widest">{t.uploadSkin}</h2>
                
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xl font-bold text-black uppercase">{t.skinName}</label>
                    <input name="name" required className="mc-input w-full" placeholder="Epic Steve" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xl font-bold text-black uppercase">{t.description}</label>
                    <textarea name="description" className="mc-input w-full h-24" placeholder="A cool skin I made..." />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xl font-bold text-black uppercase">{t.selectFile}</label>
                    <div className="mc-panel bg-white/50 border-dashed">
                      <input type="file" name="skinFile" accept="image/png" required className="w-full" />
                      <p className="text-sm text-mc-dark-gray mt-2">Standard 64x64 or 64x32 Minecraft skin file</p>
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="mc-button-green mc-button w-full py-4 text-2xl uppercase"
                  >
                    {uploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                    {uploading ? t.uploading : t.uploadSkin}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedSkin && (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 md:space-y-8"
            >
              <button onClick={() => { playClick(); setView('home'); }} className="mc-button uppercase">
                <ChevronLeft size={20} /> {t.backToHub}
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* 3D Viewer */}
                <div className="flex flex-col items-center w-full">
                  <div className="w-full max-w-[400px] aspect-[4/5.5] relative">
                    <SkinViewer skinUrl={selectedSkin.imageData || (selectedSkin as any).image_data} className="w-full h-full" />
                  </div>
                  <p className="text-mc-gray mt-4 italic text-lg text-center uppercase">{t.dragRotate}</p>
                </div>

                {/* Info */}
                <div className="space-y-6">
                  <div className="mc-panel">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <h2 className="text-3xl md:text-4xl font-bold text-black break-words w-full uppercase">{selectedSkin.name}</h2>
                      <div className="flex items-center gap-2 bg-black/10 px-3 py-1 pixel-border shrink-0">
                        <Download size={20} className="text-mc-dark-gray" />
                        <span className="text-xl md:text-2xl font-bold text-black">{selectedSkin.downloads}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <button 
                        onClick={() => viewAuthorProfile(selectedSkin.authorId)}
                        className="flex items-center gap-3 group hover:opacity-80 transition-opacity text-left"
                      >
                        <div className="w-10 h-10 bg-mc-gray pixel-border flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedSkin.authorAvatar ? (
                            <img src={selectedSkin.authorAvatar} alt={selectedSkin.authorName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-mc-dark-gray uppercase">{t.uploadedBy}</p>
                          <p className="text-xl md:text-2xl font-bold text-black truncate group-hover:text-mc-green transition-colors">
                            {selectedSkin.authorName || (selectedSkin as any).author_name}
                          </p>
                        </div>
                      </button>
                    </div>

                    <p className="text-xl md:text-2xl text-mc-dark-gray leading-relaxed mb-8">
                      {selectedSkin.description || "No description provided."}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => downloadSkin(selectedSkin)}
                        className="mc-button-green mc-button flex-1 py-3 md:py-4 text-xl md:text-2xl uppercase"
                      >
                        <Download size={24} /> {t.download}
                      </button>
                      <button 
                        onClick={(e) => toggleFavorite(selectedSkin.id, e)}
                        className={`mc-button flex-1 py-3 md:py-4 text-xl md:text-2xl uppercase ${user?.favorites?.includes(selectedSkin.id) ? 'text-red-500' : ''}`}
                      >
                        <PixelHeart size={24} filled={user?.favorites?.includes(selectedSkin.id)} /> 
                        {user?.favorites?.includes(selectedSkin.id) ? t.favorited : t.favorite}
                      </button>
                    </div>
                    
                    {auth.currentUser?.email === 'redskas5119@gmail.com' && (
                      <div className="mt-4">
                        <button 
                          onClick={() => deleteSkin(selectedSkin.id, selectedSkin.name, selectedSkin.authorId)}
                          className="mc-button w-full py-3 md:py-4 text-xl md:text-2xl uppercase bg-red-600"
                        >
                          {lang === 'ru' ? 'УДАЛИТЬ (АДМИН)' : 'DELETE (ADMIN)'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Similar Skins */}
                  <div className="space-y-4">
                    <h3 className="text-xl md:text-2xl font-bold text-mc-green tracking-widest uppercase">{t.similarSkins}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                      {selectedSkin.similar?.map(s => (
                        <div 
                          key={s.id} 
                          className="mc-panel p-2 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => viewSkin(s.id)}
                        >
                          <div className="aspect-square bg-[#333] pixel-border mb-2 overflow-hidden relative">
                            <div className="absolute inset-0 z-10 pointer-events-none" />
                            <SkinViewer 
                              skinUrl={s.imageData || (s as any).image_data} 
                              className="w-full h-full" 
                              minHeight="100%" 
                              autoRotate={true} 
                              walking={true} 
                              controls={false} 
                            />
                          </div>
                          <p className="text-sm md:text-base text-black truncate text-center font-bold uppercase">{s.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'publicProfile' && selectedAuthor && (
            <motion.div
              key="publicProfile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <button onClick={() => { playClick(); setView('home'); }} className="mc-button uppercase">
                <ChevronLeft size={20} /> {t.backToHub}
              </button>

              <div className="mc-panel p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 md:w-48 md:h-48 pixel-border bg-mc-gray flex items-center justify-center overflow-hidden shrink-0">
                  {selectedAuthor.picture ? (
                    <img src={selectedAuthor.picture} alt={selectedAuthor.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-white" />
                  )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter">{selectedAuthor.name}</h2>
                  {selectedAuthor.bio && (
                    <p className="text-xl text-mc-dark-gray italic">"{selectedAuthor.bio}"</p>
                  )}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold uppercase text-mc-dark-gray">
                    <div className="bg-black/5 px-3 py-1 pixel-border">
                      {lang === 'ru' ? 'СКИНОВ' : 'SKINS'}: {authorSkins.length}
                    </div>
                    <div className="bg-black/5 px-3 py-1 pixel-border">
                      {t.createdAt}: {new Date(selectedAuthor.createdAt?.toDate?.() || selectedAuthor.createdAt || '').toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black uppercase tracking-widest border-b-4 border-black/10 pb-2">
                  {lang === 'ru' ? 'РАБОТЫ АВТОРА' : 'AUTHOR WORKS'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {authorSkins.map((skin) => (
                    <motion.div
                      key={skin.id}
                      whileHover={{ scale: 1.02 }}
                      className="mc-panel cursor-pointer flex flex-col h-full"
                      onClick={() => viewSkin(skin.id)}
                    >
                      <div className="aspect-[3/4] bg-[#222] pixel-border mb-3 overflow-hidden relative flex-shrink-0">
                        <SkinViewer 
                          skinUrl={skin.imageData} 
                          className="w-full h-full" 
                          autoRotate={true} 
                          walking={true} 
                          controls={false} 
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black truncate uppercase">{skin.name}</h3>
                        <div className="flex justify-between items-center mt-1 text-xs text-mc-dark-gray">
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1">
                              <Download size={12} />
                              {skin.downloads}
                            </div>
                            {user?.favorites?.includes(skin.id) && (
                              <PixelHeart size={12} className="text-red-500" filled={true} />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'mySkins' && user && (
            <motion.div
              key="mySkins"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <button onClick={() => { playClick(); setView('home'); }} className="mc-button uppercase">
                <ChevronLeft size={20} /> {t.backToHub}
              </button>

              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-black uppercase tracking-widest">{t.mySkins}</h2>
                <button 
                  onClick={() => { playClick(); setView('upload'); }}
                  className="mc-button-green mc-button uppercase"
                >
                  <Upload size={20} /> {t.uploadSkin}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allSkins.filter(s => s.authorId === user.id).length > 0 ? (
                  allSkins.filter(s => s.authorId === user.id).map((skin) => (
                    <div key={skin.id} className="mc-panel flex flex-col h-full">
                      <div className="aspect-[3/4] bg-[#222] pixel-border mb-3 overflow-hidden relative flex-shrink-0">
                        <SkinViewer 
                          skinUrl={skin.imageData} 
                          className="w-full h-full" 
                          autoRotate={true} 
                          walking={true} 
                          controls={false} 
                        />
                      </div>
                      <div className="flex-1 min-w-0 mb-4">
                        <h3 className="text-lg font-bold text-black truncate uppercase">{skin.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditSkin(skin)}
                          className="mc-button flex-1 py-2 text-sm uppercase bg-blue-600"
                        >
                          {t.edit}
                        </button>
                        <button 
                          onClick={() => deleteSkin(skin.id, skin.name, skin.authorId)}
                          className="mc-button flex-1 py-2 text-sm uppercase bg-red-600"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full mc-panel p-12 text-center">
                    <p className="text-xl text-mc-dark-gray uppercase">{t.noMySkins}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'favorites' && user && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <button onClick={() => { playClick(); setView('home'); }} className="mc-button uppercase">
                <ChevronLeft size={20} /> {t.backToHub}
              </button>

              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-black uppercase tracking-widest">{t.favoritesTab}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allSkins.filter(s => user.favorites?.includes(s.id)).length > 0 ? (
                  allSkins.filter(s => user.favorites?.includes(s.id)).map((skin) => (
                    <motion.div
                      key={skin.id}
                      whileHover={{ scale: 1.02 }}
                      className="mc-panel cursor-pointer flex flex-col h-full"
                      onClick={() => viewSkin(skin.id)}
                    >
                      <div className="aspect-[3/4] bg-[#222] pixel-border mb-3 overflow-hidden relative flex-shrink-0">
                        <SkinViewer 
                          skinUrl={skin.imageData} 
                          className="w-full h-full" 
                          autoRotate={true} 
                          walking={true} 
                          controls={false} 
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black truncate uppercase">{skin.name}</h3>
                        <div className="flex justify-between items-center mt-1 text-xs text-mc-dark-gray">
                          <span className="truncate mr-2">{t.uploadedBy} {skin.authorName}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1">
                              <Download size={12} />
                              {skin.downloads}
                            </div>
                            {user?.favorites?.includes(skin.id) && (
                              <PixelHeart size={12} className="text-red-500" filled={true} />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full mc-panel p-12 text-center">
                    <p className="text-xl text-mc-dark-gray uppercase">{t.noFavorites}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'editSkin' && selectedSkin && (
            <motion.div
              key="editSkin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <button onClick={() => { playClick(); setView('mySkins'); }} className="mc-button mb-6 uppercase">
                <ChevronLeft size={20} /> {lang === 'ru' ? 'НАЗАД К МОИМ РАБОТАМ' : 'BACK TO MY SKINS'}
              </button>
              
              <div className="mc-panel">
                <h2 className="text-3xl font-bold text-black mb-8 text-center uppercase tracking-widest">{t.editSkin}</h2>
                
                <form onSubmit={updateSkin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xl font-bold text-black uppercase">{t.skinName}</label>
                    <input 
                      name="name" 
                      required 
                      className="mc-input w-full" 
                      defaultValue={selectedSkin.name} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xl font-bold text-black uppercase">{t.description}</label>
                    <textarea 
                      name="description" 
                      className="mc-input w-full h-32" 
                      defaultValue={selectedSkin.description} 
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="mc-button-green mc-button w-full py-4 text-2xl uppercase"
                  >
                    {t.updateSkin}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mc-panel border-b-0 border-x-0 rounded-none py-6 text-center bg-[#c6c6c6]">
        <p className="text-mc-dark-gray font-bold uppercase tracking-widest text-sm md:text-base">
          © 2026 CRAFTSKINS • NOT AN OFFICIAL MINECRAFT PRODUCT
        </p>
      </footer>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mc-panel w-full max-w-md p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-red-600 uppercase mb-4">{confirmModal.title}</h2>
              <p className="text-xl text-black mb-8">{confirmModal.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={confirmModal.onConfirm}
                  className="mc-button-green mc-button flex-1 py-3 uppercase"
                >
                  {t.yes}
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="mc-button flex-1 py-3 uppercase bg-red-600"
                >
                  {t.no}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 pixel-border font-bold uppercase shadow-2xl ${
              toast.type === 'success' ? 'bg-mc-green text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
