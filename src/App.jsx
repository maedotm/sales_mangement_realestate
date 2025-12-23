import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    getFirestore,
    initializeFirestore,
    collection, 
    doc, 
    setDoc, 
    onSnapshot, 
    query, 
    writeBatch, 
    updateDoc, 
    deleteDoc,
    where,
    getDocs,
    Timestamp,
    setLogLevel
} from 'firebase/firestore';

// --- GLOBAL CONSTANTS ---
const APP_ID = 'realestatedash-88e32'; // Updated with the Firebase Project ID

let FIREBASE_CONFIG = {};
try {
    // --- START: PASTE YOUR FIREBASE CONFIG HERE ---
    FIREBASE_CONFIG = {
        apiKey: "AIzaSyDwILENUzfSYnZxCPmcEpWNB1gjap6VkOs",
        authDomain: "realestatedash-88e32.firebaseapp.com",
        projectId: "realestatedash-88e32", 
        storageBucket: "realestatedash-88e32.firebasestorage.app",
        messagingSenderId: "831420404746",
        appId: "1:831420404746:web:9423470fcf9c8ffd497bf3",
        measurementId: "G-LQT2WFM0Z2"
    };
    // --- END: PASTE YOUR FIREBASE CONFIG HERE ---

    // The rest of the original parsing logic remains the same, but the initial object is populated.
    // ...
} catch (e) {
    console.error("Error parsing firebase config", e);
}
// Set to null locally. The app will use signInAnonymously().
const INITIAL_AUTH_TOKEN = null; 

const DEFAULT_UNIT_TYPES = ['A', 'B', 'C'];
const DEFAULT_INITIAL_FLOORS = 17;

// --- ROLES & PERMISSIONS ---
const ROLES = {
    ADMIN: 'System Admin',
    OWNER: 'Owner',
    ACCOUNTANT: 'Accountant',
    SALES: 'Sales Agent'
};

const PERMISSIONS = {
    [ROLES.ADMIN]: { canEdit: true, canManageUsers: true, canManageBuilding: true, viewFinancials: true, canConfig: true },
    [ROLES.OWNER]: { canEdit: true, canManageUsers: false, canManageBuilding: true, viewFinancials: true, canConfig: true },
    [ROLES.ACCOUNTANT]: { canEdit: false, canManageUsers: false, canManageBuilding: false, viewFinancials: true, canConfig: false },
    [ROLES.SALES]: { canEdit: false, canManageUsers: false, canManageBuilding: false, viewFinancials: false, canConfig: false }, 
};

// --- ICONS (Inline SVGs) ---
const Icons = {
    Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    Building: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    Config: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Bell: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    Logout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Profile: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
};

// --- DATA HELPERS ---
const createUnitData = (floor, unitId, customArea = 100, customPrice = 2000) => {
    let beds = (unitId === 'C' || unitId.length > 1) ? 3 : 2; 
    const floorIdStr = String(floor).padStart(2, '0');

    return {
        id: `F${floorIdStr}-${unitId}`,
        floor: floor,
        floorName: `${getOrdinal(floor)} Floor`,
        unitId: unitId,
        beds: beds,
        areaSqm: Number(customArea),
        pricePerSqm: Number(customPrice),
        status: 'Available',
        clientName: '',
        totalPrice: Number(customArea) * Number(customPrice),
        amountPaid: 0,
        nextPaymentDate: null,
        paymentSchedule: [],
        updatedBy: '',
        updatedAt: Timestamp.now(),
     };
};

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const getNextUnitId = (unitsOnFloor) => {
    const currentUnitIds = unitsOnFloor.map(u => u.unitId).sort();
    if (currentUnitIds.length === 0) return 'A';
    const lastId = currentUnitIds[currentUnitIds.length - 1];
    if (lastId.length === 1 && lastId.charCodeAt(0) < 'Z'.charCodeAt(0)) {
        return String.fromCharCode(lastId.charCodeAt(0) + 1);
    }
    const nextNumber = unitsOnFloor.length + 1;
    return `U${nextNumber}`; 
};

const calculateFinancialsFromSchedule = (schedule) => {
    let paid = 0;
    let nextDate = null;
    let totalScheduled = 0;
    const sortedSchedule = [...schedule]
        .map(item => ({
            ...item,
            dueDate: item.dueDate instanceof Timestamp ? item.dueDate.toDate() : new Date(item.dueDate),
        }))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    for (const item of sortedSchedule) {
        totalScheduled += item.amount;
        if (item.status === 'Paid') paid += item.amount;
        else if (item.status === 'Pending' && nextDate === null) nextDate = item.dueDate;
    }
    return { 
        amountPaid: paid, 
        nextPaymentDate: nextDate ? Timestamp.fromDate(nextDate) : null, 
        totalScheduled: totalScheduled 
    };
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Available': return 'bg-green-50 text-green-700 border-green-200';
        case 'Held': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'Sold': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
};

const formatCurrencyRaw = (val) => {
    return val ? val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '';
}

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0);
};

// --- HELPER COMPONENTS ---
const MoneyInput = ({ value, onChange, disabled, className, placeholder }) => {
    const [displayVal, setDisplayVal] = useState('');

    useEffect(() => {
        setDisplayVal(formatCurrencyRaw(value));
    }, [value]);

    const handleChange = (e) => {
        const rawInput = e.target.value.replace(/,/g, '');
        if (rawInput === '' || /^\d+$/.test(rawInput)) {
            setDisplayVal(e.target.value); // Temporarily show what user typed
            onChange(rawInput); // Pass pure number to parent
        }
    };

    const handleBlur = () => {
        setDisplayVal(formatCurrencyRaw(value));
    };

    return (
        <input 
            type="text" 
            value={displayVal} 
            onChange={handleChange} 
            onBlur={handleBlur}
            disabled={disabled} 
            className={className} 
            placeholder={placeholder}
        />
    );
};


// --- COMPONENTS ---

// 1. Login Screen
const LoginScreen = ({ onLogin, loading, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [demoRole, setDemoRole] = useState(null);

    const handleLogin = (e) => {
        e.preventDefault();
        onLogin(email, password, null);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-indigo-800">Mad<span className="text-indigo-500">Tracking</span></h1>
                    <p className="text-gray-500 mt-2">Secure Real Estate Management</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition disabled:bg-indigo-300"
                    >
                        {loading ? 'Verifying...' : 'Sign In'}
                    </button>
                    
                    <div className="pt-6 border-t border-gray-100 mt-6">
                         <p className="text-xs text-center text-gray-400 mb-3 uppercase tracking-wide">Quick Demo Access (Simulation)</p>
                         <div className="grid grid-cols-3 gap-2">
                             {[ROLES.OWNER, ROLES.ACCOUNTANT, ROLES.SALES].map(role => (
                                 <button
                                     key={role}
                                     type="button"
                                     onClick={() => onLogin(null, null, role)}
                                     className="px-2 py-2 text-xs font-semibold rounded border bg-gray-50 hover:bg-gray-100 text-gray-600 truncate"
                                 >
                                     {role}
                                 </button>
                             ))}
                         </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 2. Sidebar
const Sidebar = ({ currentView, setView, role, onLogout }) => {
    const permissions = PERMISSIONS[role] || {};

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: Icons.Dashboard, visible: true },
        { id: 'building', label: 'Building & Units', icon: Icons.Building, visible: true },
        { id: 'config', label: 'Configuration', icon: Icons.Config, visible: permissions.canConfig }, // Merged Settings
        { id: 'users', label: 'User Mgmt', icon: Icons.Users, visible: permissions.canManageUsers },
    ];

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col z-20">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-black text-indigo-800 tracking-tight">Mad<span className="text-indigo-500">Tracking</span></h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">{role}</p>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
                {menuItems.filter(item => item.visible).map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            currentView === item.id 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition"
                >
                    <Icons.Logout />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

// 3. Header
const Header = ({ role, notifications = [], userProfile, onOpenProfile }) => {
    const [showNotifs, setShowNotifs] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifs(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-10 flex justify-between items-center px-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">Dashboard</h2>
            
            <div className="flex items-center space-x-6">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={() => setShowNotifs(!showNotifs)}
                        className="relative text-gray-400 hover:text-indigo-600 transition"
                    >
                        <Icons.Bell />
                        {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center border border-white">
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {showNotifs && (
                        <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-black ring-opacity-5">
                            <div className="p-3 bg-gray-50 border-b border-gray-100 font-semibold text-sm text-gray-700">
                                Notifications ({notifications.length})
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-sm text-gray-500 text-center">No pending reminders.</div>
                                ) : (
                                    notifications.map((n, i) => (
                                        <div key={i} className="p-3 border-b border-gray-50 hover:bg-gray-50 transition">
                                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                                            <p className="text-xs text-gray-500">{n.msg}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <button 
                    onClick={onOpenProfile}
                    className="flex items-center space-x-3 border-l pl-6 border-gray-200 hover:opacity-80 transition"
                >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {userProfile?.fName?.[0] || role[0]}
                    </div>
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-medium text-gray-800">{userProfile?.fName || 'User'}</p>
                        <p className="text-xs text-gray-500">{role}</p>
                    </div>
                </button>
            </div>
        </header>
    );
};

// --- VIEWS ---

const OverviewView = ({ stats, role }) => {
    // Sales role: Read-only access to unit availability (financial totals are hidden).
    const showFinancials = PERMISSIONS[role]?.viewFinancials && role !== ROLES.SALES;

    return (
        <div className="p-8 pt-24 min-h-screen bg-gray-50 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Total Units</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalUnits}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Available</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.unitsAvailable}</p>
                </div>
                {showFinancials && (
                    <>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-sm text-gray-500 font-medium">Total Sales Value</p>
                            <p className="text-3xl font-bold text-indigo-600 mt-2">{formatCurrency(stats.totalSalesValue)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-sm text-gray-500 font-medium">Total Collected</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.totalCollected)}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Sales Performance</h3>
                    <div className="flex items-end space-x-4 h-48 px-4">
                        {['Avail', 'Held', 'Sold'].map((label, i) => {
                            const val = i===0 ? stats.unitsAvailable : i===1 ? stats.unitsHeld : stats.unitsSold;
                            const color = i===0 ? 'bg-green-500' : i===1 ? 'bg-yellow-500' : 'bg-red-500';
                            const bg = i===0 ? 'bg-green-100' : i===1 ? 'bg-yellow-100' : 'bg-red-100';
                            return (
                                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                                    <div className={`w-full ${bg} rounded-t-lg relative h-full`}>
                                        <div style={{ height: `${stats.totalUnits ? (val/stats.totalUnits)*100 : 0}%` }} className={`absolute bottom-0 w-full ${color} rounded-t-lg transition-all duration-500`}></div>
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
const BuildingView = ({ units, onUnitClick }) => {
    // Group units by floor
    const floors = useMemo(() => {
        const grouped = {};
        units.forEach(unit => {
            if (!grouped[unit.floor]) grouped[unit.floor] = [];
            grouped[unit.floor].push(unit);
        });
        return grouped;
    }, [units]);

    // Sort floor numbers descending (High floor at top)
    const sortedFloorNums = useMemo(() => {
        return Object.keys(floors).map(Number).sort((a, b) => a - b);
    }, [floors]);

    // INITIAL COLLAPSED STATE: Initially set all floor IDs as true (collapsed)
    const [collapsed, setCollapsed] = useState(() => {
        const initial = {};
        Object.keys(floors).forEach(f => initial[f] = true);
        return initial;
    });

    const toggleFloor = (floor) => {
        setCollapsed(prev => ({ ...prev, [floor]: !prev[floor] }));
    };


    return (
        <div className="p-8 pt-24 min-h-screen bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Building Structure</h2>
            
            <div className="flex flex-col gap-4 max-w-6xl mx-auto">
                {sortedFloorNums.map(floorNum => {
                    const isCollapsed = collapsed[floorNum];
                    return (
                        <div key={floorNum} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                            {/* Collapsible Header */}
                            <button 
                                onClick={() => toggleFloor(floorNum)}
                                className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                                        {floorNum}
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-lg font-bold text-gray-800 leading-tight">
                                            {getOrdinal(floorNum)} Floor
                                        </span>
                                        <span className="text-xs font-medium text-indigo-500">
                                            {floors[floorNum].length} Units
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2 mr-4">
                                        {/* Mini preview of status dots */}
                                        {floors[floorNum].slice(0, 5).map(u => (
                                            <div key={u.id} className={`w-3 h-3 rounded-full ring-2 ring-white ${
                                                u.status === 'Available' ? 'bg-green-400' : u.status === 'Sold' ? 'bg-red-400' : 'bg-yellow-400'
                                            }`} />
                                        ))}
                                    </div>
                                    <svg 
                                        className={`w-6 h-6 text-indigo-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>
                            
                            {/* Units Container (Collapsible) */}
                            {!isCollapsed && (
                                <div className="p-4 bg-white border-t border-indigo-100 animate-fadeIn">
                                    <div className="flex flex-wrap gap-4 justify-start">
                                        {floors[floorNum]
                                            .sort((a, b) => a.unitId.localeCompare(b.unitId))
                                            .map(unit => (
                                                <button
                                                    key={unit.id}
                                                    onClick={() => onUnitClick(unit)}
                                                    className={`
                                                        relative w-28 h-24 rounded-lg border-2 transition-all duration-200 
                                                        hover:shadow-md hover:-translate-y-1 flex flex-col justify-center items-center group
                                                        ${getStatusColor(unit.status)}
                                                    `}
                                                >
                                                    <span className="text-lg font-black">{unit.unitId}</span>
                                                    <span className="text-[10px] uppercase font-bold opacity-80 mt-1">{unit.status}</span>
                                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current opacity-50"></div>
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- CONFIGURATION VIEW (Admin/Owner Only) ---
const ConfigurationView = ({ totalFloors, setTotalFloors, db, userId, units }) => {
    const [backupStatus, setBackupStatus] = useState('idle');
    const [activeFloor, setActiveFloor] = useState(null);
    
    // New Defaults State
    const [defaultFloor, setDefaultFloor] = useState(1);
    const [defaultUnitType, setDefaultUnitType] = useState('A');
    const [defaultArea, setDefaultArea] = useState(100);
    const [defaultPrice, setDefaultPrice] = useState(2000);
    const [applyStatus, setApplyStatus] = useState('');

    const floors = useMemo(() => {
        const grouped = units.reduce((acc, unit) => {
            const f = unit.floor;
            if (!acc[f]) acc[f] = [];
            acc[f].push(unit);
            return acc;
        }, {});
        return grouped;
    }, [units]);

    const handleBackup = () => {
        setBackupStatus('loading');
        setTimeout(() => {
            setBackupStatus('success');
            setTimeout(() => setBackupStatus('idle'), 3000);
        }, 2000);
    };

    const handleFloorUpdate = async (delta) => {
        if (!db) return;
        const newTotal = totalFloors + delta;
        if (newTotal < 1) return;

        const batch = writeBatch(db);
        const settingsRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
        const unitsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'units');

        if (delta > 0) {
            DEFAULT_UNIT_TYPES.forEach(uid => {
                const u = createUnitData(newTotal, uid);
                batch.set(doc(unitsRef, u.id), u);
            });
        } else {
            const q = query(unitsRef, where('floor', '==', totalFloors));
            const snap = await getDocs(q);
            snap.forEach(d => batch.delete(d.ref));
        }

        batch.update(settingsRef, { totalFloors: newTotal, updatedBy: userId });
        await batch.commit();
        setTotalFloors(newTotal); 
    };

    const handleApplyDefaults = async () => {
        setApplyStatus('Applying...');
        try {
            // Find units matching floor AND unit type (e.g. F01-A)
            const unitsToUpdate = units.filter(u => u.floor === Number(defaultFloor) && u.unitId === defaultUnitType);
            const batch = writeBatch(db);
            
            unitsToUpdate.forEach(u => {
                const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'units', u.id);
                batch.update(ref, {
                    areaSqm: Number(defaultArea),
                    pricePerSqm: Number(defaultPrice),
                    totalPrice: Number(defaultArea) * Number(defaultPrice),
                    updatedBy: userId
                });
            });

            await batch.commit();
            setApplyStatus('Defaults Applied!');
            setTimeout(() => setApplyStatus(''), 3000);
        } catch (e) {
            setApplyStatus('Error applying');
        }
    };

    return (
        <div className="p-8 pt-24 min-h-screen bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">System Configuration</h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Column: Defaults & Backup */}
                <div className="space-y-6">
                    {/* Unit Default Pricing */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Unit Default Pricing & Area</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Floor</label>
                                <select value={defaultFloor} onChange={e => setDefaultFloor(e.target.value)} className="w-full p-2 border rounded">
                                    {Array.from({length: totalFloors}, (_, i) => i+1).map(f => <option key={f} value={f}>{f} Floor</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Unit Type</label>
                                <select value={defaultUnitType} onChange={e => setDefaultUnitType(e.target.value)} className="w-full p-2 border rounded">
                                    {DEFAULT_UNIT_TYPES.map(t => <option key={t} value={t}>Unit {t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Default Area (sqm)</label>
                                <input type="number" value={defaultArea} onChange={e => setDefaultArea(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Default Price/sqm ($)</label>
                                <MoneyInput value={defaultPrice} onChange={setDefaultPrice} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                        <button onClick={handleApplyDefaults} className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition">
                            {applyStatus || 'Apply Default Values to Units'}
                        </button>
                    </div>

                    {/* Database Actions */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Database Operations</h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={handleBackup}
                                disabled={backupStatus !== 'idle'}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex justify-center items-center space-x-2 ${
                                    backupStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-800 text-white hover:bg-gray-900'
                                }`}
                            >
                                <span>{backupStatus === 'loading' ? 'Backing up...' : backupStatus === 'success' ? 'Backup Successful' : 'Simulate Backup'}</span>
                            </button>
                            <button className="flex-1 px-4 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Export Logs</button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Structure Management */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="text-lg font-bold text-gray-800 mb-4">Building Height</h3>
                         <div className="flex justify-between items-center">
                             <p className="text-2xl font-bold text-indigo-600">{totalFloors} Floors</p>
                             <div className="space-x-2">
                                 <button onClick={() => handleFloorUpdate(1)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">+ Add Floor</button>
                                 <button onClick={() => handleFloorUpdate(-1)} className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">- Remove</button>
                             </div>
                         </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Floor Detail Mgmt</h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {Array.from({ length: totalFloors }, (_, i) => i + 1).map(floorNum => (
                                <div key={floorNum} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button 
                                        onClick={() => setActiveFloor(activeFloor === floorNum ? null : floorNum)}
                                        className={`w-full flex justify-between items-center p-3 text-sm font-medium transition ${activeFloor === floorNum ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                                    >
                                        <span>{getOrdinal(floorNum)} Floor</span>
                                        <span>{(floors[floorNum] || []).length} Units</span>
                                    </button>
                                    
                                    {activeFloor === floorNum && (
                                        <div className="p-3 bg-white border-t border-gray-100">
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {(floors[floorNum] || []).sort((a,b) => a.unitId.localeCompare(b.unitId)).map(u => (
                                                    <div key={u.id} className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs">
                                                        <span className="font-semibold mr-2">{u.unitId}</span>
                                                        <button onClick={async () => {
                                                            if(window.confirm('Delete unit?')) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'units', u.id));
                                                        }} className="text-red-400 hover:text-red-600">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    const nextId = getNextUnitId(floors[floorNum] || []);
                                                    const u = createUnitData(floorNum, nextId);
                                                    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'units', u.id), u);
                                                }}
                                                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition font-medium"
                                            >
                                                + Add Next Unit
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- USER MANAGEMENT VIEW (System Admin Only) ---
const UserManagementView = ({ db }) => {
    const [users, setUsers] = useState([]);
    
    // Form State
    const [newUser, setNewUser] = useState({
        email: '', password: '', role: ROLES.SALES, fName: '', lName: '', sex: 'M', age: '', phone: ''
    });
    const [formError, setFormError] = useState('');
    const [resetUser, setResetUser] = useState(null); // ID of user being reset

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'));
        const unsub = onSnapshot(q, snap => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [db]);

    const validatePassword = (pwd) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(pwd);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormError('');
        
        if (!validatePassword(newUser.password)) {
            setFormError('Password must be >8 chars, with uppercase, number, & special char.');
            return;
        }

        try {
            const userId = Math.random().toString(36).substring(2, 15); // Simulated UID
            const userData = { ...newUser, id: userId, createdAt: Timestamp.now() };
            if (newUser.role === ROLES.OWNER) {
                delete userData.sex;
                delete userData.age;
                delete userData.phone;
            }

            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), userData);
            setNewUser({ email: '', password: '', role: ROLES.SALES, fName: '', lName: '', sex: 'M', age: '', phone: '' });
            alert('User created successfully (Simulated)');
        } catch (err) {
            setFormError(err.message);
        }
    };

    const deleteUser = async (id) => {
        if(window.confirm('Delete this user?')) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', id));
        }
    };

    // Admin Reset Password Modal
    const ResetPasswordModal = ({ userId, onClose }) => {
        const [newPwd, setNewPwd] = useState('');
        const [confirmPwd, setConfirmPwd] = useState('');
        const [error, setError] = useState('');
        const [success, setSuccess] = useState(false);

        const handleReset = async () => {
            if (newPwd !== confirmPwd) { setError("Passwords do not match"); return; }
            if (!validatePassword(newPwd)) { setError("Password too weak."); return; }
            
            try {
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { password: newPwd });
                setSuccess(true);
                setTimeout(() => onClose(), 1500); // Close after showing success
            } catch (e) {
                setError("Error updating password.");
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl transform transition-all scale-100">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-6 text-green-600 animate-pulse">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <h3 className="font-bold text-xl">Changed Successfully!</h3>
                        </div>
                    ) : (
                        <>
                            <h3 className="font-bold text-xl text-gray-800 mb-1">Reset Password</h3>
                            <p className="text-gray-500 text-sm mb-4">Set a new password for this user.</p>
                            
                            {error && <p className="text-red-600 text-xs bg-red-50 p-2 rounded mb-3 border border-red-100">{error}</p>}
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">New Password</label>
                                    <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
                                    <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleReset} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm">Reset Password</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 pt-24 min-h-screen bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">User Management</h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* User List */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Role</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-gray-800">{u.fName} {u.lName}</div>
                                        <div className="text-xs text-gray-500">{u.email}</div>
                                    </td>
                                    <td className="p-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">{u.role}</span></td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {u.role !== ROLES.OWNER && u.phone && <div>{u.phone}</div>}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => setResetUser(u.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Reset Pwd</button>
                                        <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Create User Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Add New User</h3>
                    {formError && <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">{formError}</div>}
                    <form onSubmit={handleCreateUser} className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Role</label>
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full p-2 border rounded text-sm">
                                {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="First Name" required value={newUser.fName} onChange={e => setNewUser({...newUser, fName: e.target.value})} className="p-2 border rounded text-sm" />
                            <input type="text" placeholder="Last Name" required value={newUser.lName} onChange={e => setNewUser({...newUser, lName: e.target.value})} className="p-2 border rounded text-sm" />
                        </div>

                        <input type="email" placeholder="Email Address" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-2 border rounded text-sm" />
                        <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full p-2 border rounded text-sm" />

                        {/* Extended Info: Hidden for Owner Role */}
                        {newUser.role !== ROLES.OWNER && (
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={newUser.sex} onChange={e => setNewUser({...newUser, sex: e.target.value})} className="p-2 border rounded text-sm">
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                    </select>
                                    <input type="number" placeholder="Age" required value={newUser.age} onChange={e => setNewUser({...newUser, age: e.target.value})} className="p-2 border rounded text-sm" />
                                </div>
                                <input type="tel" placeholder="Phone Number" required value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full p-2 border rounded text-sm" />
                            </div>
                        )}

                        <button type="submit" className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition mt-4">Create User</button>
                    </form>
                </div>
            </div>
            {resetUser && <ResetPasswordModal userId={resetUser} onClose={() => setResetUser(null)} />}
        </div>
    );
};

// --- MODALS ---

const ProfileModal = ({ userProfile, onClose, onSave }) => {
    const [data, setData] = useState({ fName: '', lName: '', phone: '' });
    const [mode, setMode] = useState('profile'); // 'profile' or 'password'
    
    // Password change state
    const [pwData, setPwData] = useState({ old: '', new: '', confirm: '' });
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);

    useEffect(() => {
        if(userProfile) setData({ fName: userProfile.fName || '', lName: userProfile.lName || '', phone: userProfile.phone || '' });
    }, [userProfile]);

    const handleChangePassword = () => {
        setPwError('');
        if (pwData.old !== userProfile.password) {
            setPwError("Old password incorrect.");
            return;
        }
        if (pwData.new !== pwData.confirm) {
            setPwError("New passwords do not match.");
            return;
        }
        // Save new password
        onSave({ ...userProfile, password: pwData.new });
        
        // Show success state
        setPwSuccess(true);
        setTimeout(() => {
            setPwSuccess(false);
            setMode('profile');
            setPwData({ old: '', new: '', confirm: '' });
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden">
                {pwSuccess ? (
                    <div className="flex flex-col items-center justify-center py-10 text-green-600 animate-fadeIn">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="font-bold text-xl">Password Changed Successfully!</h3>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{mode === 'profile' ? 'My Profile' : 'Change Password'}</h3>
                        
                        {mode === 'profile' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">First Name</label>
                                        <input type="text" value={data.fName} onChange={e => setData({...data, fName: e.target.value})} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Last Name</label>
                                        <input type="text" value={data.lName} onChange={e => setData({...data, lName: e.target.value})} className="w-full p-2 border rounded" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Phone</label>
                                    <input type="text" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <button onClick={() => setMode('password')} className="text-indigo-600 text-sm font-semibold hover:underline">Change Password</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pwError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{pwError}</p>}
                                <input type="password" placeholder="Old Password" value={pwData.old} onChange={e => setPwData({...pwData, old: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <input type="password" placeholder="New Password" value={pwData.new} onChange={e => setPwData({...pwData, new: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <input type="password" placeholder="Confirm New Password" value={pwData.confirm} onChange={e => setPwData({...pwData, confirm: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        )}

                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => mode === 'password' ? setMode('profile') : onClose()} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded">
                                {mode === 'password' ? 'Back' : 'Cancel'}
                            </button>
                            <button onClick={() => mode === 'password' ? handleChangePassword() : onSave(data)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700">
                                {mode === 'password' ? 'Change Password' : 'Save'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const EditModal = ({ unit, closeModal, db, role, userId }) => {
    const canEdit = PERMISSIONS[role].canEdit;
    
    // State
    const [status, setStatus] = useState(unit.status);
    const [clientName, setClientName] = useState(unit.clientName);
    const [areaSqm, setAreaSqm] = useState(unit.areaSqm);
    const [pricePerSqm, setPricePerSqm] = useState(unit.pricePerSqm);
    
    // SALES LOGIC STATE
    const [schedule, setSchedule] = useState(unit.paymentSchedule.map(p => ({
        ...p,
        dueDate: p.dueDate instanceof Timestamp ? p.dueDate.toDate().toISOString().substring(0, 10) : p.dueDate,
        id: p.id || Math.random().toString(36).substring(2, 9)
    })));
    const [newInstallment, setNewInstallment] = useState({ amount: '', date: '' });
    
    // Calculated
    const totalPrice = areaSqm * pricePerSqm;
    const financials = useMemo(() => calculateFinancialsFromSchedule(schedule.map(s => ({ ...s, dueDate: new Date(s.dueDate) }))), [schedule]);

    // Sales Agent Permission Check for SOLD units
    const isSalesAgent = role === ROLES.SALES;
    const isSold = unit.status === 'Sold';
    // If it's a sales agent and the unit is SOLD, they cannot see financial details
    const hideFinancials = isSalesAgent && isSold;

    const handleAddInstallment = () => {
        if (!newInstallment.amount || !newInstallment.date) return;
        setSchedule([...schedule, {
            id: Math.random().toString(36).substring(2,9),
            amount: Number(newInstallment.amount),
            dueDate: newInstallment.date,
            status: 'Pending'
        }]);
        setNewInstallment({ amount: '', date: '' });
    };

    const handleRemoveInstallment = (id) => setSchedule(schedule.filter(s => s.id !== id));

    const handleUpdateInstallment = (id, field, val) => {
        setSchedule(schedule.map(s => s.id === id ? { ...s, [field]: field === 'amount' ? Number(val) : val } : s));
    };

    const handleSave = async () => {
        if (!db) return;
        if ((status === 'Held' || status === 'Sold') && financials.totalScheduled !== totalPrice) {
            if(!window.confirm(`Warning: Scheduled total ($${financials.totalScheduled}) does not match Total Price ($${totalPrice}). Save anyway?`)) return;
        }

        const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'units', unit.id);
        const scheduleToSave = schedule.map(s => ({
            id: s.id, amount: s.amount, status: s.status, dueDate: Timestamp.fromDate(new Date(s.dueDate))
        }));

        await updateDoc(ref, {
            status,
            clientName: (status === 'Available') ? '' : clientName,
            areaSqm: Number(areaSqm),
            pricePerSqm: Number(pricePerSqm),
            totalPrice,
            paymentSchedule: (status === 'Available') ? [] : scheduleToSave,
            amountPaid: (status === 'Available') ? 0 : financials.amountPaid,
            nextPaymentDate: (status === 'Available') ? null : financials.nextPaymentDate,
            updatedBy: userId,
            updatedAt: Timestamp.now()
        });
        closeModal();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Unit {unit.unitId} - {unit.floorName}</h3>
                        <p className="text-xs text-gray-500 mt-1">{canEdit ? 'Edit Mode' : 'Read-Only Mode'}</p>
                    </div>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Unit Status</label>
                        <select disabled={!canEdit} value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60">
                            <option value="Available">Available</option>
                            <option value="Held">Held (Deposit)</option>
                            <option value="Sold">Sold (Contract)</option>
                        </select>
                    </div>

                    {hideFinancials ? (
                        <div className="p-8 bg-gray-50 rounded-xl text-center border border-gray-100">
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Unit Sold</h4>
                            <p className="text-gray-500 text-sm">This unit has been sold. Financial details and client information are restricted to Admin and Owner roles.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Area (sqm)</label>
                                    <input type="number" disabled={!canEdit} value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Price/sqm ($)</label>
                                    <MoneyInput disabled={!canEdit} value={pricePerSqm} onChange={setPricePerSqm} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60" />
                                </div>
                                <div className="col-span-2 bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
                                    <span className="text-indigo-800 font-medium">Total Price</span>
                                    <span className="text-xl font-black text-indigo-700">{formatCurrency(totalPrice)}</span>
                                </div>
                            </div>

                            {(status === 'Held' || status === 'Sold') && (
                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Client Name</label>
                                        <input type="text" disabled={!canEdit} value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-60" placeholder="Enter client name..." />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-center"><p className="text-xs font-bold text-green-600 uppercase">Paid</p><p className="text-lg font-black text-green-800">{formatCurrency(financials.amountPaid)}</p></div>
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center"><p className="text-xs font-bold text-red-600 uppercase">Remaining</p><p className="text-lg font-black text-red-800">{formatCurrency(totalPrice - financials.amountPaid)}</p></div>
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center"><p className="text-xs font-bold text-blue-600 uppercase">Scheduled</p><p className="text-lg font-black text-blue-800">{formatCurrency(financials.totalScheduled)}</p></div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2">Payment Schedule</h4>
                                        <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                                            {schedule.length === 0 && <p className="text-sm text-gray-400 italic">No installments added.</p>}
                                            {schedule.map((item, idx) => (
                                                <div key={item.id} className="flex gap-2 items-center p-2 border rounded-lg bg-gray-50">
                                                    <span className="text-xs font-bold text-gray-400 w-6">#{idx+1}</span>
                                                    <MoneyInput disabled={!canEdit} value={item.amount} onChange={(val) => handleUpdateInstallment(item.id, 'amount', val)} className="w-24 p-1 text-sm border rounded" />
                                                    <input type="date" disabled={!canEdit} value={item.dueDate} onChange={(e) => handleUpdateInstallment(item.id, 'dueDate', e.target.value)} className="flex-1 p-1 text-sm border rounded" />
                                                    <select disabled={!canEdit} value={item.status} onChange={(e) => handleUpdateInstallment(item.id, 'status', e.target.value)} className={`text-xs font-bold p-1 rounded ${item.status === 'Paid' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'}`}>
                                                        <option value="Pending">Pending</option>
                                                        <option value="Paid">Paid</option>
                                                    </select>
                                                    {canEdit && <button onClick={() => handleRemoveInstallment(item.id)} className="text-red-400 hover:text-red-600 px-1">×</button>}
                                                </div>
                                            ))}
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-2">
                                                <MoneyInput placeholder="Amount" value={newInstallment.amount} onChange={(val) => setNewInstallment({...newInstallment, amount: val})} className="w-1/3 p-2 text-sm border rounded-lg" />
                                                <input type="date" value={newInstallment.date} onChange={(e) => setNewInstallment({...newInstallment, date: e.target.value})} className="flex-1 p-2 text-sm border rounded-lg" />
                                                <button onClick={handleAddInstallment} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200">Add</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                    <button onClick={closeModal} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Close</button>
                    {canEdit && !hideFinancials && <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition">Save Changes</button>}
                    {/* For sales agents who can change status but not edit financials */}
                    {canEdit && hideFinancials && false /* Placeholder if we wanted to allow Status Change only */}
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP ---
export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginError, setLoginError] = useState(null);
    
    // UI State
    const [view, setView] = useState('overview');
    const [units, setUnits] = useState([]);
    const [totalFloors, setTotalFloors] = useState(DEFAULT_INITIAL_FLOORS);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Firebase
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                const app = initializeApp(FIREBASE_CONFIG);
                const _auth = getAuth(app);
                const _db = initializeFirestore(app, { experimentalForceLongPolling: true });
                setLogLevel('silent');
                setAuth(_auth);
                setDb(_db);
                onAuthStateChanged(_auth, (u) => {
                    setUser(u);
                    if(!u) setRole(null);
                    setLoading(false);
                });
            } catch (e) { setLoading(false); }
        };
        init();
    }, []);

    useEffect(() => {
        if (!user || !db) return;

        // Settings Listener
        const unsubSettings = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global'), (snap) => {
            if (snap.exists()) setTotalFloors(snap.data().totalFloors || DEFAULT_INITIAL_FLOORS);
            else setDoc(snap.ref, { totalFloors: DEFAULT_INITIAL_FLOORS, createdAt: Timestamp.now() });
        });

        // Units Listener
        const unsubUnits = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'units'), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (data.length === 0 && role === ROLES.ADMIN) {
                const batch = writeBatch(db);
                for(let f=1; f<=DEFAULT_INITIAL_FLOORS; f++) {
                    DEFAULT_UNIT_TYPES.forEach(uid => {
                        const u = createUnitData(f, uid);
                        batch.set(doc(db, 'artifacts', APP_ID, 'public', 'data', 'units', u.id), u);
                    });
                }
                batch.commit();
            } else {
                setUnits(data);
            }
        });
        
        // Profile Listener
        const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setUserProfile(data);
                // If not strictly the hardcoded admin, trust the DB role (unless simulated)
                if (user.uid !== 'hardcoded-admin-uid') setRole(data.role || ROLES.SALES);
            }
        });

        return () => { unsubSettings(); unsubUnits(); unsubProfile(); };
    }, [user, db, role]);

    const handleLogin = async (email, password, demoRole) => {
        setLoading(true);
        setLoginError(null);
        try {
            let targetRole = ROLES.SALES;
            let targetProfile = {};
            let isHardcodedAdmin = false;

            // 1. Check Hardcoded Admin
            if (email === 'maedotmetsihet0@gmail.com' && password === 'M@ed0t2090') {
                targetRole = ROLES.ADMIN;
                isHardcodedAdmin = true;
                targetProfile = { fName: 'Maedot', lName: 'Admin', role: ROLES.ADMIN };
            } 
            // 2. Check Database for Simulated Users (if not hardcoded)
            else if (email && password && db) {
                 const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'), where('email', '==', email), where('password', '==', password));
                 const snap = await getDocs(q);
                 if (snap.empty) throw new Error("Invalid email or password.");
                 const userData = snap.docs[0].data();
                 targetRole = userData.role;
                 targetProfile = userData;
            }
            // 3. Demo Role Fallback
            else if (demoRole) {
                targetRole = demoRole;
                targetProfile = { fName: 'Demo', lName: demoRole, role: demoRole };
            } 
            else {
                throw new Error("Please enter credentials.");
            }
            
            // Perform Auth
            if (!user) {
                if (INITIAL_AUTH_TOKEN) await signInWithCustomToken(auth, INITIAL_AUTH_TOKEN);
                else await signInAnonymously(auth);
            }

            // Set State
            setRole(targetRole);
            setUserProfile(targetProfile);
            
            // Sync current profile to DB if it's the hardcoded admin (to allow editing)
            if (isHardcodedAdmin && auth.currentUser) {
                 const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', auth.currentUser.uid);
                 await setDoc(ref, { ...targetProfile, id: auth.currentUser.uid }, { merge: true });
            }

        } catch (e) {
            console.error(e);
            setLoginError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (newData) => {
        if (!user || !db) return;
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid), newData, { merge: true });
        setShowProfileModal(false);
    };

    const stats = useMemo(() => {
        const s = { totalUnits: units.length, unitsAvailable: 0, unitsHeld: 0, unitsSold: 0, totalSalesValue: 0, totalCollected: 0 };
        units.forEach(u => {
            if (u.status === 'Available') s.unitsAvailable++;
            if (u.status === 'Held') s.unitsHeld++;
            if (u.status === 'Sold') s.unitsSold++;
            if (u.status !== 'Available') {
                s.totalSalesValue += (u.totalPrice || 0);
                s.totalCollected += (u.amountPaid || 0);
            }
        });
        return s;
    }, [units]);

    const notifications = useMemo(() => {
        return units.filter(u => u.status === 'Sold').slice(0, 3).map(u => ({
            title: `Payment Reminder: Unit ${u.unitId}`,
            msg: `Scheduled payment pending for ${u.clientName || 'Client'}.`
        }));
    }, [units]);

    if (!role) return <LoginScreen onLogin={handleLogin} loading={loading} error={loginError} />;

    return (
        <div className="font-inter bg-gray-50 min-h-screen text-gray-900">
            <Sidebar currentView={view} setView={setView} role={role} onLogout={() => { signOut(auth); setRole(null); setView('overview'); }} />
            <Header role={role} notifications={notifications} userProfile={userProfile} onOpenProfile={() => setShowProfileModal(true)} />

            <main className="pl-64 transition-all duration-300">
                {view === 'overview' && <OverviewView stats={stats} role={role} />}
                {view === 'building' && <BuildingView units={units} onUnitClick={setSelectedUnit} />}
                {view === 'config' && <ConfigurationView totalFloors={totalFloors} setTotalFloors={setTotalFloors} db={db} userId={user.uid} units={units} />}
                {view === 'users' && <UserManagementView db={db} />}
            </main>

            {selectedUnit && (
                <EditModal 
                    unit={selectedUnit} 
                    closeModal={() => setSelectedUnit(null)} 
                    db={db} 
                    role={role}
                    userId={user.uid}
                />
            )}
            
            {showProfileModal && (
                <ProfileModal 
                    userProfile={userProfile} 
                    onClose={() => setShowProfileModal(false)} 
                    onSave={handleUpdateProfile} 
                />
            )}
        </div>
    );
}