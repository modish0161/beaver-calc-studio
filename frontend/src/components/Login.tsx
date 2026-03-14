import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { FiLock, FiLogIn, FiLogOut, FiMail, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthProvider';

const Login: React.FC = () => {
  const { user, isAuthenticated, login, logout, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    return (
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-950/80 border border-gray-700 rounded-2xl p-8 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FiUser className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full uppercase">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => { logout(); toast('Signed out'); }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
          >
            <FiLogOut className="w-4 h-4" /> Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-950/80 border border-gray-700 rounded-2xl p-8 backdrop-blur-xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FiLock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign In</h1>
          <p className="text-gray-400 text-sm mt-1">BeaverCalc Studio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@beaverbridges.co.uk"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FiLogIn className="w-4 h-4" /> Sign In</>
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Contact your administrator for access credentials
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
