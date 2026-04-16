// src/components/Header.js
'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-opacity-90 backdrop-blur-md border-b border-blue-500/20 bg-[#050816]">
      <div className="container mx-auto flex justify-between items-center h-20 px-4">
        <div className="text-3xl font-bold mr-4">
          <Link href="/" className="bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            Rawaj
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          <Link href="#home" className="text-xl text-gray-400 hover:text-white transition-colors">الرئيسية</Link>
          <Link href="#services" className="text-xl text-gray-400 hover:text-white transition-colors">الخدمات</Link>
          <Link href="#analytics" className="text-xl text-gray-400 hover:text-white transition-colors">المميزات</Link>
          <Link href="#contact" className="text-xl text-gray-400 hover:text-white transition-colors">تواصل</Link>
        </nav>

        <div className="flex items-center gap-4 ml-4">
          {isAuthenticated && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-full py-1 px-3 transition-colors"
              >
                <UserCircleIcon className="w-8 h-8 text-blue-400" />
                <span className="text-white font-medium hidden sm:inline-block">
                  {user.name?.split(' ')[0] || 'حسابي'}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-[#1e2335] rounded-xl shadow-xl border border-[#2a2f3f] overflow-hidden z-50">
                  <Link
                    href="/user_profile"
                    className="block px-4 py-3 text-white hover:bg-[#2a2f3f] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    الملف الشخصي
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-right px-4 py-3 text-red-400 hover:bg-[#2a2f3f] transition-colors"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;