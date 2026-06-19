import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserFavoriteTeam {
  id: number;
  name: string;
  crest_url: string | null;
  short_name: string | null;
}

export interface AuthUser {
  id: number;
  email: string;
  fullname: string | null;
  role: string;
  favorite_team: UserFavoriteTeam | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, fullname: string, favoriteTeamId: number | null) => Promise<{ status: string; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('epl_token'));
  const [loading, setLoading] = useState(true);

  // Khôi phục phiên làm việc khi F5 tải lại trang
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('epl_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // Tải thông tin cá nhân của token hiện tại từ Backend
        const res = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const body = await res.json();
          setUser(body.data);
          setToken(storedToken);
        } else {
          // Token hỏng hoặc hết hạn -> Xóa bỏ
          localStorage.removeItem('epl_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Lỗi tự động khôi phục phiên đăng nhập:', err);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.detail || 'Đăng nhập thất bại.');
    }

    const { access_token, user: loggedUser } = body;
    localStorage.setItem('epl_token', access_token);
    setToken(access_token);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (
    email: string, 
    password: string, 
    fullname: string, 
    favoriteTeamId: number | null
  ): Promise<{ status: string; message: string }> => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        fullname,
        favorite_team_id: favoriteTeamId
      })
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.detail || 'Đăng ký thất bại.');
    }

    return body;
  };

  const logout = () => {
    localStorage.removeItem('epl_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được sử dụng bên trong một AuthProvider');
  }
  return context;
}
