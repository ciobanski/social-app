// src/components/Header.jsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthContext from '../AuthContext';
import { api } from '../api';
import {
  FiSearch,
  FiCompass,
  FiLogOut,
  FiSun,
  FiMoon,
  FiUser,
  FiX,
} from 'react-icons/fi';
import NotificationBell from './NotificationBell';
import FriendsSidebar from './FriendsSidebar';
import logo from '../assets/logo.svg';
import logoblack from '../assets/logoblack.svg';
import defaultAvatar from '../assets/default-avatar.png';

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // ── Theme toggle ───────────────────────────────────────────────────────
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // ── Search + autosuggest ───────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef();

  // fetch suggestions (debounced)
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const { data } = await api.get('/search/suggestions', { params: { q: searchTerm } });
        setSuggestions(data.users || []);
        setShowSuggestions((data.users || []).length > 0);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // hide on outside click
  useEffect(() => {
    const onClick = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearchSubmit = e => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchTerm('');
      setShowSuggestions(false);
    }
  };

  // ── Profile dropdown ─────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  useEffect(() => {
    const onClick = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // ── Friends drawer ───────────────────────────────────────────────────
  const [showFriends, setShowFriends] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-16 bg-base-100 shadow flex items-center px-4 z-50">
        {/* Logo */}
        <RouterLink to="/" className="flex-shrink-0">
          <img src={logo} alt="Socialite" className="logo--white h-8 w-36" />
        </RouterLink>
        <RouterLink to="/" className="flex-shrink-0">
          <img src={logoblack} alt="Socialite" className="logo--black h-8 w-36" />
        </RouterLink>
        {/* ── Desktop search (≥440px) ─────────────────────────────── */}
        <form
          ref={searchRef}
          onSubmit={handleSearchSubmit}
          className="hidden [@media(min-width:440px)]:flex flex-1 justify-center px-4"
        >
          <div className="relative w-full max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search…"
              className="w-full input input-bordered pl-10 pr-4 rounded-full"
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-content/20 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {suggestions.map(u => (
                  <li
                    key={u._id}
                    onClick={() => {
                      navigate(`/profile/${u._id}`);
                      setSearchTerm('');
                      setShowSuggestions(false);
                    }}
                    className="flex items-center px-4 py-2 hover:bg-base-content/10 cursor-pointer"
                  >
                    <img
                      src={u.avatarUrl || defaultAvatar}
                      alt={`${u.firstName} ${u.lastName}`}
                      className="w-6 h-6 rounded-full mr-3 object-cover"
                    />
                    <span>{u.firstName} {u.lastName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        {/* ── Mobile search (<440px) ─────────────────────────────── */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex [@media(min-width:440px)]:hidden items-center ml-4"
        >
          <div className="relative">
            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="
                w-14
                transition-[width]
                duration-200
                ease-in-out
                focus-within:w-[calc(75vw-5rem)]
                input input-bordered
                pl-8 pr-2
                rounded-full
              "
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-content/20 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {suggestions.map(u => (
                  <li
                    key={u._id}
                    onClick={() => {
                      navigate(`/profile/${u._id}`);
                      setSearchTerm('');
                      setShowSuggestions(false);
                    }}
                    className="flex items-center px-4 py-2 hover:bg-base-content/10 cursor-pointer"
                  >
                    <img
                      src={u.avatarUrl || defaultAvatar}
                      alt={`${u.firstName} ${u.lastName}`}
                      className="w-6 h-6 rounded-full mr-3 object-cover"
                    />
                    <span>{u.firstName} {u.lastName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        {/* ── Icons ──────────────────────────────────────────────────────── */}
        <nav className="flex items-center space-x-2.5 ml-2">
          {/* explore (only on ≤lg) */}
          <RouterLink
            to={'/explore'}
            onClick={() => { }}
            className="icon-button text-lg hover:text-primary transition lg:hidden"
            aria-label="Explore"
          >
            <FiCompass />
          </RouterLink>

          {/* notifications */}
          <NotificationBell />

          {/* theme toggle */}
          <button
            onClick={toggleTheme}
            className="icon-button text-lg hover:text-primary transition"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>

          {/* profile dropdown */}
          <div ref={menuRef} className="relative inline-block">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="icon-button text-lg hover:text-primary transition flex items-center justify-center h-10"
              aria-label="Account"
            >
              <FiUser />
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-base-100 border border-base-content/20 rounded-lg shadow-lg z-50">

                <ul className="py-1">
                  <li>
                    <RouterLink
                      to={`/profile/${user?.id}`}
                      className="block px-4 py-2 hover:bg-base-content/10"
                    >
                      Profile
                    </RouterLink>
                  </li>
                  <li>
                    <RouterLink
                      to="/saved"
                      className="block px-4 py-2 hover:bg-base-content/10"
                    >
                      Saved Posts
                    </RouterLink>
                  </li>
                  <li>
                    <RouterLink
                      onClick={() => {
                        setShowFriends(true);
                        setMenuOpen(false);
                      }}
                      className="block px-4 py-2 hover:bg-base-content/10"
                    >
                      Friends
                    </RouterLink>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* logout */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="icon-button text-lg hover:text-primary transition mr-4"
            aria-label="Log out"
          >
            <FiLogOut />
          </button>
        </nav>
      </header>

      {/* ── Friends drawer overlay ────────────────────────────────────────── */}
      {showFriends && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowFriends(false)}>
          <div
            className="absolute top-16 right-0 w-72 h-full bg-base-300 border-l border-base-content/20 overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFriends(false)}
              className="absolute top-2 right-2 text-lg"
              aria-label="Close"
            >
              <FiX />
            </button>
            <FriendsSidebar />
          </div>
        </div>
      )}
    </>
  );
}
