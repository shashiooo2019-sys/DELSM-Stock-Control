'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Calendar,
  Menu,
  Volume2,
  VolumeX,
  User,
  Lock,
  Shield,
  LogIn,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import PublicSearch from '@/components/PublicSearch';
import { useInventoryStore } from '@/lib/inventory-store';

const DashboardTab = dynamic(() => import('@/components/tabs/DashboardTab'), { ssr: false });
const MasterTab = dynamic(() => import('@/components/tabs/MasterTab'), { ssr: false });
const ScannerTab = dynamic(() => import('@/components/tabs/ScannerTab'), { ssr: false });
const OrdersTab = dynamic(() => import('@/components/tabs/OrdersTab'), { ssr: false });
const AnalyticsTab = dynamic(() => import('@/components/tabs/AnalyticsTab'), { ssr: false });
const SharedModals = dynamic(() => import('@/components/tabs/SharedModals'), { ssr: false });

export default function DelhiStationInventoryApp() {
  const store = useInventoryStore();
  const {
    isMounted,
    currentUser,
    db,
    activeTab,
    setActiveTab,
    isSidebarVisible,
    setIsSidebarVisible,
    isLoginModalOpen,
    setIsLoginModalOpen,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    simulatedDate,
    soundEnabled,
    setSoundEnabled,
    kpis,
    stockFilter,
    setStockFilter,
    advanceTime,
    resetToToday,
    handleLogin,
    handleLogout,
  } = store;

  if (!isMounted) return null;

  if (!currentUser) {
    return (
      <>
        <PublicSearch
          stockMaster={db.stockMaster}
          stockTakingLog={db.stockTakingLog}
          purchaseOrders={db.purchaseOrders}
          onLoginClick={() => setIsLoginModalOpen(true)}
        />
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-base text-slate-900">
                    Sign In to DELSM
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setLoginError('');
                    setLoginUsername('');
                    setLoginPassword('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
                >
                  &times;
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold leading-normal flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-xs"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginModalOpen(false);
                      setLoginError('');
                      setLoginUsername('');
                      setLoginPassword('');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition shadow-sm hover:shadow"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div id="delhi-station-app" className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans border-8 border-slate-900 selection:bg-orange-100 selection:text-orange-900">

      <header id="top-header" className="h-16 flex items-center justify-between px-6 bg-slate-900 text-white shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-bold text-slate-200 transition cursor-pointer focus:outline-none"
            title={isSidebarVisible ? "Hide Navigation Menu" : "Unhide Navigation Menu"}
          >
            <Menu className="w-4 h-4 text-orange-500" />
            <span className="hidden xs:inline">{isSidebarVisible ? "Hide Menu" : "Show Menu"}</span>
          </button>
          <div id="delsm-logo-badge" className="bg-blue-800 border border-blue-700 px-3 py-1.5 rounded font-black text-sm tracking-widest text-white uppercase select-none shrink-0 shadow-inner">
            DELSM
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Delhi Station <span className="text-slate-400 font-normal text-sm hidden sm:inline">| Smart Inventory</span>
          </h1>
        </div>

        <div className="flex gap-4 sm:gap-6 items-center text-sm font-medium">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md font-mono text-xs">
            <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="text-slate-200 shrink-0">
              {new Date(simulatedDate).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </span>
            <button
              onClick={() => advanceTime(1)}
              className="ml-2 px-1.5 py-0.5 bg-slate-700 hover:bg-orange-500 text-white rounded text-[10px] font-sans font-bold transition-all shrink-0"
              title="Add 1 day"
            >
              +1d
            </button>
            <button
              onClick={() => advanceTime(7)}
              className="px-1.5 py-0.5 bg-slate-700 hover:bg-orange-500 text-white rounded text-[10px] font-sans font-bold transition-all shrink-0"
              title="Add 1 week"
            >
              +7d
            </button>
            {simulatedDate !== '2026-07-20' && (
              <button
                onClick={resetToToday}
                className="px-1.5 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-sans font-bold transition-all shrink-0"
              >
                Reset
              </button>
            )}
            <div className="w-[1px] h-3.5 bg-slate-700 mx-1 shrink-0"></div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hover:text-orange-500 transition-colors shrink-0"
              title={soundEnabled ? "Mute alert beep" : "Unmute alert beep"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-orange-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md text-xs">
                <div className="flex items-center gap-1.5">
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-slate-200 uppercase">{currentUser.username}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                    currentUser.role === 'admin'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-[1px] h-3.5 bg-slate-700 mx-1"></div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 font-sans font-bold cursor-pointer focus:outline-none"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginError('');
                  setIsLoginModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-md transition shadow-sm hover:shadow cursor-pointer focus:outline-none"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          <div className="hidden lg:flex flex-col items-end leading-none shrink-0">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Global Status</span>
            <span className="text-green-400 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              System Operational
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">

        {isSidebarVisible && (
          <nav id="sidebar-nav" className="w-full md:w-60 bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-4 gap-2 shrink-0">
            <div className="hidden md:block mb-1 px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Module Control</span>
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 justify-between ${
                activeTab === 'dashboard'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${activeTab === 'dashboard' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
                <span>Dashboard</span>
              </div>
              {kpis.actionNeeded > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">
                  {kpis.actionNeeded}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('master')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'master'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'master' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Stock Management</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'scanner'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'scanner' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Barcode Stocktaking</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'orders'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'orders' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Purchase Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'analytics'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'analytics' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Analytics</span>
            </button>
          </nav>
        )}

        <main className="flex-1 flex flex-col p-6 gap-6 bg-[#EDF2F7] overflow-y-auto min-h-0">

          {activeTab !== 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">

              <button
                onClick={() => {
                  const targetFilter = 'Action Needed';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-red-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none ${
                  stockFilter === 'Action Needed' ? 'ring-2 ring-red-500 shadow-inner bg-red-50/10' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Action Needed {stockFilter === 'Action Needed' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stockFilter === 'Action Needed' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>
                    {stockFilter === 'Action Needed' ? 'FILTER ACTIVE' : 'CRITICAL'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-display">{kpis.actionNeeded}</span>
                  <span className="text-xs text-slate-500">Items below reorder level</span>
                </div>
              </button>

              <button
                onClick={() => {
                  const targetFilter = 'Suppressed';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-amber-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none ${
                  stockFilter === 'Suppressed' ? 'ring-2 ring-amber-500 shadow-inner bg-amber-50/10' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Approved / Suppressed {stockFilter === 'Suppressed' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stockFilter === 'Suppressed' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {stockFilter === 'Suppressed' ? 'FILTER ACTIVE' : 'PENDING RECEIPT'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-display">{kpis.suppressed}</span>
                  <span className="text-xs text-slate-500">Active POs suppressing alerts</span>
                </div>
              </button>

              <button
                onClick={() => {
                  const targetFilter = 'Healthy';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-green-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none ${
                  stockFilter === 'Healthy' ? 'ring-2 ring-green-500 shadow-inner bg-green-50/10' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Healthy Stock {stockFilter === 'Healthy' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stockFilter === 'Healthy' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                    {stockFilter === 'Healthy' ? 'FILTER ACTIVE' : 'STABLE'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-display">{kpis.healthy}</span>
                  <span className="text-xs text-slate-500">Items optimally stocked</span>
                </div>
              </button>

            </div>
          )}


          <div className="flex-1 min-h-0">
            {activeTab === 'dashboard' && <DashboardTab store={store} />}
            {activeTab === 'master' && <MasterTab store={store} />}
            {activeTab === 'scanner' && <ScannerTab store={store} />}
            {activeTab === 'orders' && <OrdersTab store={store} />}
            {activeTab === 'analytics' && <AnalyticsTab store={store} />}
          </div>
        </main>
      </div>

      <SharedModals store={store} />
    </div>
  );
}
