import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    onSnapshot, 
    query, 
    writeBatch, 
    updateDoc,
    where,
    getDocs,
    Timestamp,
    orderBy,
    getDoc,
    deleteDoc,
    setLogLevel
} from 'firebase/firestore';

// --- GLOBAL VARIABLES (Provided by Canvas Environment) ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCoNemAruEfSEl65Z08a2TfQhfUHvF1Zvw",
  authDomain: "realestate-a7e4b.firebaseapp.com",
  projectId: "realestate-a7e4b",
  storageBucket: "realestate-a7e4b.firebasestorage.app",
  messagingSenderId: "442990002816",
  appId: "1:442990002816:web:5c80a309c5995fd2561c65",
  measurementId: "G-8C3Q3FVDPB"
};

// 2. We use the projectId as a unique identifier for the artifact path
const appId = FIREBASE_CONFIG.projectId;

// 3. Set the config variables using your actual values
const firebaseConfig = FIREBASE_CONFIG;
const initialAuthToken = null;

// The default set of units per floor for initial creation
const DEFAULT_UNIT_TYPES = ['A', 'B', 'C'];
const DEFAULT_INITIAL_FLOORS = 17; 

// --- ICON Definitions (using inline SVG for single-file compliance) ---
const ICON_SVGS = {
    Building: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4"/><path d="M15 22v-4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 6h4"/></svg>`,
    House: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 9h3v12h12V9h3L12 2z"/><path d="M9 21v-8h6v8"/></svg>`,
    BarChart4: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17v-4"/><path d="M8 17v-8"/></svg>`,
    DollarSign: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    Target: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    MapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-7-7.6-7-10.5C5 6.4 8.5 3 12 3s7 3.4 7 8C19 13.9 12 21.5 12 21.5z"/><circle cx="12" cy="11" r="3"/></svg>`,
    Key: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18L10 10l5 5L17 13M12.5 17.5L14 16m3-3l-2.5 2.5m-8.5-4a3.5 3.5 0 017 0V22a1 1 0 01-2 0v-5.5m-3 0a3.5 3.5 0 00-7 0v5.5a1 1 0 002 0v-5.5z"/></svg>`,
    Bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
};

// Component to render the logo, supporting both SVG icons and image URLs
const LogoDisplay = ({ logoType, logoSource, size = 32, className = 'text-white' }) => {
    const wrapperClasses = `flex-shrink-0 flex items-center justify-center transition-colors duration-200 ${className}`;
    const style = { width: size, height: size };

    if (logoType === 'url' && logoSource) {
        // Render external image URL
        // Using placeholder in case of image load failure
        const fallbackSrc = `https://placehold.co/${size}x${size}/818CF5/ffffff?text=Logo`;
        
        return (
            <div className={wrapperClasses} style={style}>
                <img
                    src={logoSource}
                    alt="Custom App Logo"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                        e.target.onerror = null; // Prevents infinite loop
                        e.target.src = fallbackSrc;
                    }}
                />
            </div>
        );
    }
    
    // Render internal SVG icon (default)
    const svgString = ICON_SVGS[logoSource] || ICON_SVGS['Building']; 
    
    return (
        <div 
            className={wrapperClasses}
            style={style}
            dangerouslySetInnerHTML={{ __html: svgString }}
        />
    );
};
// --- END Logo Definitions ---


// Helper to calculate days remaining until a timestamp
const calculateDaysRemaining = (timestamp) => {
    if (!timestamp) return null;
    const now = new Date();
    const future = timestamp.toDate();
    const diffMs = future.getTime() - now.getTime();
    
    if (diffMs < 0) return 'OVERDUE';
    
    // Calculate days remaining (ceiling to include today)
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Initial data structure for a single unit
const createUnitData = (floor, unitId) => {
    // Default bed logic: 'C' is 3 beds, otherwise 2 beds
    let beds = (unitId === 'C' || unitId.length > 1) ? 3 : 2; 
    
    // Default values for area and price/sqm (NEW ADDITIONS)
    const area = 100; // default 100 sqm
    const priceSqM = 2000; // default $2000 per sqm

    // Simple ID generation for Firestore
    const floorIdStr = String(floor).padStart(2, '0');

    return {
        id: `F${floorIdStr}-${unitId}`,
        floor: floor, // Storing floor number for sorting ease
        floorName: `${getOrdinal(floor)} Floor`,
        unitId: unitId,
        beds: beds,
        areaSqm: area, // NEW
        pricePerSqm: priceSqM, // NEW
        status: 'Available', // Available, Held, Sold
        clientName: '',
        totalPrice: area * priceSqM, // CALCULATED from Area * PricePerSqm
        amountPaid: 0, // Derived from paymentSchedule
        nextPaymentDate: null, // Derived from paymentSchedule
        paymentSchedule: [], // Array of { id, amount, dueDate, status, reminderEnabled } // REMINDER FLAG ADDED
        updatedBy: '',
        updatedAt: Timestamp.now(),
     };
};

// Helper for ordinal numbers (1st, 2nd, 3rd, 4th, etc.)
const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Helper function to generate the next unit letter (A -> B, B -> C, etc.)
const getNextUnitId = (unitsOnFloor) => {
    const currentUnitIds = unitsOnFloor.map(u => u.unitId).sort();
    if (currentUnitIds.length === 0) return 'A';

    const lastId = currentUnitIds[currentUnitIds.length - 1];
    
    // Simple increment for single letters (A-Z)
    if (lastId.length === 1 && lastId.charCodeAt(0) < 'Z'.charCodeAt(0)) {
        return String.fromCharCode(lastId.charCodeAt(0) + 1);
    }

    // Fallback for complex IDs or reaching 'Z'
    const nextNumber = unitsOnFloor.length + 1;
    return `U${nextNumber}`; 
};

// Helper to calculate financials from schedule
const calculateFinancialsFromSchedule = (schedule) => {
    let paid = 0;
    let nextDate = null;
    let totalScheduled = 0;

    // Convert timestamps and sort by date
    const sortedSchedule = [...schedule]
        .map(item => ({
            ...item,
            // Convert to Date object if it's a Firestore Timestamp instance or a date string
            dueDate: item.dueDate instanceof Timestamp ? item.dueDate.toDate() : new Date(item.dueDate),
        }))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    for (const item of sortedSchedule) {
        totalScheduled += item.amount;
        if (item.status === 'Paid') {
            paid += item.amount;
        } else if (item.status === 'Pending' && nextDate === null) {
            // Find the earliest pending date
            nextDate = item.dueDate;
        }
    }

    return { 
        amountPaid: paid, 
        // Convert back to Timestamp before saving or using in derived state
        nextPaymentDate: nextDate ? Timestamp.fromDate(nextDate) : null, 
        totalScheduled: totalScheduled 
    };
};

// --- HELPER: Find ALL active reminders across all units ---
const findAllActiveReminders = (units) => {
    let activeReminders = [];

    for (const unit of units) {
        if (!unit.paymentSchedule || unit.status === 'Available') continue;

        // Ensure paymentSchedule is an array
        const unitReminders = (unit.paymentSchedule || [])
            .filter(item => item.status === 'Pending' && item.reminderEnabled)
            .map(item => {
                // Convert to Date object if it's a Firestore Timestamp instance
                const dueDate = item.dueDate instanceof Timestamp ? item.dueDate.toDate() : new Date(item.dueDate);
                return {
                    ...item,
                    unitId: unit.unitId,
                    floorName: unit.floorName,
                    unitDocId: unit.id, // Include Firestore document ID
                    dueDate: dueDate,
                };
            })
            .filter(item => {
                // Only consider dates in the future or today (daysRemaining >= 0)
                // Use a temporary Timestamp for calculateDaysRemaining
                const daysRemaining = calculateDaysRemaining(Timestamp.fromDate(item.dueDate));
                return daysRemaining !== 'OVERDUE' && daysRemaining >= 0;
            });

        activeReminders = [...activeReminders, ...unitReminders];
    }
    
    // Sort all reminders by due date
    activeReminders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Calculate days remaining for display purposes now
    return activeReminders.map(r => ({
        ...r,
        daysRemaining: calculateDaysRemaining(Timestamp.fromDate(r.dueDate))
    }));
};
// --- END NEW HELPER ---


// --- Logo Edit Modal Component (UPDATED) ---
const LogoEditModal = ({ closeModal, db, userId, currentLogoType, currentLogoSource }) => {
    const [logoType, setLogoType] = useState(currentLogoType || 'icon');
    const [selectedIcon, setSelectedIcon] = useState(logoType === 'icon' ? currentLogoSource : 'Building');
    const [customUrl, setCustomUrl] = useState(logoType === 'url' ? currentLogoSource : '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const iconKeys = useMemo(() => Object.keys(ICON_SVGS), []);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setError(null);

        let sourceToSave;
        
        if (logoType === 'icon') {
            sourceToSave = selectedIcon;
        } else {
            sourceToSave = customUrl.trim();
            if (!sourceToSave.startsWith('http')) {
                 setError('Custom URL must be a valid web address starting with http/https.');
                 setIsSaving(false);
                 return;
            }
        }

        try {
            const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
            await updateDoc(settingsRef, {
                appLogoType: logoType,
                appLogoSource: sourceToSave,
                lastUpdated: Timestamp.now(),
                updatedBy: userId
            });
            closeModal();
        } catch (e) {
            console.error('Error updating app logo:', e);
            setError('Failed to save logo. Check the console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transition-all duration-300">
                <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <h2 className="text-2xl font-extrabold text-indigo-700">Select Application Logo</h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
                )}
                
                {/* Type Selection Tabs */}
                <div className="flex mb-6 border-b">
                    <button 
                        onClick={() => setLogoType('icon')} 
                        className={`py-2 px-4 text-sm font-semibold transition-colors ${logoType === 'icon' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                        disabled={isSaving}
                    >
                        Icon Gallery
                    </button>
                    <button 
                        onClick={() => setLogoType('url')} 
                        className={`py-2 px-4 text-sm font-semibold transition-colors ${logoType === 'url' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                        disabled={isSaving}
                    >
                        Custom Image URL
                    </button>
                </div>
                
                {logoType === 'icon' ? (
                    <div className="my-4">
                        <p className="text-gray-600 mb-4">Choose an icon from the gallery below:</p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 max-h-80 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                            {iconKeys.map(key => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedIcon(key)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 
                                        ${selectedIcon === key 
                                            ? 'bg-indigo-100 border-indigo-600 shadow-md scale-105' 
                                            : 'bg-white border-gray-200 hover:bg-gray-100'}`
                                    }
                                    disabled={isSaving}
                                >
                                    <LogoDisplay logoType="icon" logoSource={key} size={30} className="text-indigo-600" />
                                    <span className="mt-1 text-xs text-gray-700">{key}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="my-4 space-y-4">
                        <p className="text-gray-600">Paste the URL of your logo image (e.g., JPEG, PNG):</p>
                        <input
                            type="url"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        
                        {customUrl.trim() && (
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium mb-2">Preview:</p>
                                <div className="p-3 bg-gray-100 rounded-lg flex justify-center">
                                    <LogoDisplay logoType="url" logoSource={customUrl} size={64} className="rounded-full shadow-lg" />
                                </div>
                            </div>
                        )}
                    </div>
                )}


                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={closeModal}
                        disabled={isSaving}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400"
                    >
                        {isSaving ? 'Saving...' : 'Save Logo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Floor and Unit Manager Modal Component ---
const FloorAndUnitManagerModal = ({ closeModal, db, totalFloors, setTotalFloors, floors, userId }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [activeFloor, setActiveFloor] = useState(getOrdinal(1) + ' Floor');
    
    const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
    
    // List of floors for display
    const floorList = useMemo(() => {
        return Array.from({ length: totalFloors }, (_, i) => ({
            num: i + 1,
            name: getOrdinal(i + 1) + ' Floor'
        }));
    }, [totalFloors]);

    // Handle Floor Count Change (Add/Remove Top Floor)
    const handleFloorCountChange = async (delta) => {
        if (!db || isSaving) return;
        setError(null);
        setIsSaving(true);
        
        const newMaxFloor = totalFloors + delta;

        if (newMaxFloor < 1) {
            setError("Cannot reduce the building below 1 floor.");
            setIsSaving(false);
            return;
        }

        try {
            const batch = writeBatch(db);

            if (delta > 0) {
                // ADD FLOOR
                const floorToAdd = newMaxFloor;
                console.log(`Adding floor ${floorToAdd}...`);
                DEFAULT_UNIT_TYPES.forEach(unitId => {
                    const unitData = createUnitData(floorToAdd, unitId);
                    const unitDocRef = doc(unitsRef, unitData.id);
                    batch.set(unitDocRef, unitData);
                });
            } else if (delta < 0) {
                // REMOVE TOP FLOOR
                const floorToRemove = totalFloors;
                const floorNameToRemove = getOrdinal(floorToRemove) + ' Floor';

                console.log(`Removing floor ${floorToRemove} (${floorNameToRemove})...`);

                const q = query(unitsRef, where('floorName', '==', floorNameToRemove));
                const snapshot = await getDocs(q);

                if (snapshot.docs.length > 0) {
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                } else {
                    console.warn(`No units found for ${floorNameToRemove} to delete.`);
                }
            }

            // Update the global totalFloors setting
            batch.update(settingsRef, {
                totalFloors: newMaxFloor,
                lastUpdated: Timestamp.now(),
                updatedBy: userId
            });

            await batch.commit();
            setTotalFloors(newMaxFloor); // This will be updated by the listener, but set it locally for responsiveness
        } catch (e) {
            console.error('Error updating floor count:', e);
            setError('Failed to update floors. Check the console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Unit Addition to a Specific Floor
    const handleAddUnitToFloor = async (floorNum, floorName) => {
        if (!db || isSaving) return;
        setIsSaving(true);
        setError(null);

        try {
            // Get current units on that floor to find the next ID
            const unitsOnFloor = floors[floorName] || [];
            const nextUnitId = getNextUnitId(unitsOnFloor);
            
            const newUnitData = createUnitData(floorNum, nextUnitId);
            const unitDocRef = doc(unitsRef, newUnitData.id);

            // Adding a new unit is a simple set
            await setDoc(unitDocRef, newUnitData);

        } catch (e) {
            console.error('Error adding unit:', e);
            setError(`Failed to add new unit. Error: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Unit Removal from a Specific Floor
    const handleRemoveUnitFromFloor = async (unit) => {
        if (!db || isSaving) return;
        
        // Custom confirmation dialog
        const confirmed = window.confirm(`Are you sure you want to PERMANENTLY delete Unit ${unit.unitId} on the ${unit.floorName}? This action cannot be undone and will delete all sales data.`);
        
        if (!confirmed) return;

        setIsSaving(true);
        setError(null);

        try {
            const unitDocRef = doc(unitsRef, unit.id);
            await deleteDoc(unitDocRef);

        } catch (e) {
            console.error('Error deleting unit:', e);
            setError(`Failed to delete unit ${unit.unitId}. Error: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 transition-all duration-300">
                <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <h2 className="text-2xl font-extrabold text-indigo-700">Manage Building Structure & Units</h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <div className="space-y-6">
                    {/* Floor Count Management */}
                    <div className="p-4 border rounded-xl bg-gray-50 shadow-inner">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Floors: {totalFloors}</h3>
                        <p className="text-sm text-gray-600 mb-4">Add or remove the current top floor. This adds/deletes the default unit set (A, B, C).</p>
                        
                        <div className="flex space-x-4">
                            <button
                                onClick={() => handleFloorCountChange(1)}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400"
                            >
                                {isSaving ? 'Saving...' : 'Add Top Floor (+1)'}
                            </button>
                            <button
                                onClick={() => handleFloorCountChange(-1)}
                                disabled={isSaving || totalFloors <= 1}
                                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-red-400"
                            >
                                {isSaving ? 'Saving...' : 'Remove Top Floor (-1)'}
                            </button>
                        </div>
                    </div>

                    {/* Floor-by-Floor Unit Management */}
                    <div className="p-4 border rounded-xl bg-white shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Unit Management (Floor-by-Floor)</h3>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {floorList.map(floor => (
                                <div key={floor.num} className="border border-gray-200 rounded-lg">
                                    <button 
                                        onClick={() => setActiveFloor(floor.name === activeFloor ? null : floor.name)}
                                        className={`w-full text-left p-3 flex justify-between items-center transition duration-200 ${activeFloor === floor.name ? 'bg-indigo-50 font-bold text-indigo-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                                    >
                                        <span>{floor.name}</span>
                                        <svg className={`w-4 h-4 transform ${activeFloor === floor.name ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>

                                    {activeFloor === floor.name && (
                                        <div className="p-4 bg-white border-t space-y-3">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <p className="font-semibold text-sm text-gray-600 mr-2">Units on Floor:</p>
                                                
                                                {/* Units List - MUST SORT UNITS ON FLOOR IN JS */}
                                                {(floors[floor.name] || []).sort((a, b) => a.unitId.localeCompare(b.unitId)).map(unit => (
                                                    <div key={unit.id} className="flex items-center space-x-1 p-1 px-2 border rounded-full text-xs bg-indigo-50">
                                                        <span>{unit.unitId} ({unit.beds}B)</span>
                                                        <button 
                                                            onClick={() => handleRemoveUnitFromFloor(unit)}
                                                            disabled={isSaving}
                                                            className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                                                            title={`Remove Unit ${unit.unitId}`}
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Add Unit Button */}
                                                <button
                                                    onClick={() => handleAddUnitToFloor(floor.num, floor.name)}
                                                    disabled={isSaving}
                                                    className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 transition disabled:bg-green-300 ml-4"
                                                >
                                                    {isSaving ? 'Adding...' : 'Add Unit'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-red-500 italic">
                                                Warning: Removing a unit will delete its ID and any sales data associated with it.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={closeModal}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Edit Modal Component ---
const EditModal = ({ unit, closeModal, db, userId }) => {
    const [status, setStatus] = useState(unit.status);
    const [clientName, setClientName] = useState(unit.clientName);
    
    // NEW STATE: Area and Price per Sqm replace manual totalPrice input
    const [areaSqm, setAreaSqm] = useState(unit.areaSqm || 0);
    const [pricePerSqm, setPricePerSqm] = useState(unit.pricePerSqm || 0);
    
    // Payment Schedule state
    const [schedule, setSchedule] = useState(unit.paymentSchedule.map(p => ({
        ...p,
        // Ensure reminderEnabled defaults to false if not present
        reminderEnabled: p.reminderEnabled || false, 
        // Convert Firestore Timestamp to string for input type="date" and ID for list keying
        dueDate: p.dueDate instanceof Timestamp ? p.dueDate.toDate().toISOString().substring(0, 10) : p.dueDate,
        id: p.id || Math.random().toString(36).substring(2, 9)
    })));
    
    const [newInstallment, setNewInstallment] = useState({ amount: '', date: '' });
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // DERIVED: Calculate Total Price based on Area and PricePerSqm inputs
    const totalPrice = useMemo(() => {
        const area = Number(areaSqm);
        const price = Number(pricePerSqm);
        if (isNaN(area) || isNaN(price) || area < 0 || price < 0) return 0;
        return area * price;
    }, [areaSqm, pricePerSqm]);

    // Derived Financials from Schedule
    const derivedFinancials = useMemo(() => {
        // Calculate the current financial stats based on the transient 'schedule' state
        return calculateFinancialsFromSchedule(schedule.map(item => ({
            ...item,
            // Convert back to Date/Timestamp for accurate calculation
            dueDate: new Date(item.dueDate)
        })));
    }, [schedule]);

    const amountPaid = derivedFinancials.amountPaid;
    const totalScheduled = derivedFinancials.totalScheduled;
    const remainingAmount = totalPrice - amountPaid;
    const isEngaged = status === 'Held' || status === 'Sold';
    
    // Sort schedule for display
    const sortedSchedule = useMemo(() => {
        return [...schedule].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [schedule]);

    // Handle Schedule Updates
    const handleAddInstallment = () => {
        if (Number(newInstallment.amount) <= 0 || !newInstallment.date) {
            setError('Please enter a valid amount and date for the new installment.');
            return;
        }
        
        const newPayment = {
            id: Math.random().toString(36).substring(2, 9), // Unique ID for keying/editing
            amount: Number(newInstallment.amount),
            dueDate: newInstallment.date,
            status: 'Pending',
            reminderEnabled: false, // Default new installment reminder to false
        };

        setSchedule([...schedule, newPayment]);
        setNewInstallment({ amount: '', date: '' });
        setError(null);
    };

    const handleUpdateInstallment = (id, field, value) => {
        setSchedule(schedule.map(item => {
            if (item.id === id) {
                let updatedValue = value;
                if (field === 'amount') {
                    updatedValue = Number(value);
                } else if (field === 'reminderEnabled') {
                    // Toggle boolean state
                    updatedValue = !item.reminderEnabled;
                }
                return { ...item, [field]: updatedValue };
            }
            return item;
        }));
    };

    const handleRemoveInstallment = (id) => {
        setSchedule(schedule.filter(item => item.id !== id));
    };


    const handleSave = async () => {
        if (isEngaged && (!clientName || totalPrice <= 0)) {
            setError('Client Name and the calculated Total Price must be greater than zero for Held or Sold units.');
            return;
        }
        
        const numericTotalPrice = totalPrice; // Use the calculated price
        const financials = calculateFinancialsFromSchedule(schedule.map(item => ({
            ...item,
            dueDate: new Date(item.dueDate)
        })));

        if (isEngaged && financials.totalScheduled !== numericTotalPrice) {
            // Note: Using window.confirm() as a substitute for a custom modal confirmation dialog
            const confirmed = window.confirm(`The sum of all installments ($${financials.totalScheduled.toLocaleString()}) does not equal the calculated Total Price ($${numericTotalPrice.toLocaleString()}). Continue and save anyway?`);
            if (!confirmed) return;
        }

        setError(null);
        setIsSaving(true);

        try {
            const unitRef = doc(db, 'artifacts', appId, 'public', 'data', 'units', unit.id);
            
            // Prepare the schedule for Firestore (convert string dates back to Timestamps)
            const scheduleForFirestore = schedule.map(item => ({
                id: item.id,
                amount: item.amount,
                status: item.status,
                reminderEnabled: item.reminderEnabled || false, // Ensure this flag is saved
                dueDate: Timestamp.fromDate(new Date(item.dueDate))
            }));

            const updateData = {
                // Always save base unit data (area and price per sqm)
                areaSqm: Number(areaSqm),
                pricePerSqm: Number(pricePerSqm),
                totalPrice: numericTotalPrice, // Save the calculated price
                
                status: status,
                updatedBy: userId,
                updatedAt: Timestamp.now(),
            };

            if (isEngaged) {
                updateData.clientName = clientName;
                updateData.paymentSchedule = scheduleForFirestore;
                // Update derived fields
                updateData.amountPaid = financials.amountPaid;
                updateData.nextPaymentDate = financials.nextPaymentDate;
            } else {
                // Clear all financial/client data if status goes back to Available
                updateData.clientName = '';
                updateData.amountPaid = 0;
                updateData.nextPaymentDate = null;
                updateData.paymentSchedule = [];
            }

            await updateDoc(unitRef, updateData);
            closeModal();

        } catch (e) {
            console.error('Error updating document: ', e);
            setError('Failed to save changes. Please check console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'Available': return 'text-green-600 bg-green-100 border-green-300';
            case 'Held': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
            case 'Sold': return 'text-red-600 bg-red-100 border-red-300';
            default: return 'text-gray-600 bg-gray-100 border-gray-300';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 p-6 transition-all duration-300 transform scale-100`}>
                <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <h2 className="text-2xl font-extrabold text-gray-800">
                        Update Unit {unit.floorName} - {unit.unitId}
                    </h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 ${getStatusColor(status)} appearance-none transition-colors duration-200`}
                        >
                            <option value="Available">Available</option>
                            <option value="Held">Held (Deposit Received)</option>
                            <option value="Sold">Sold (Contract Signed)</option>
                        </select>
                    </div>

                    {/* NEW: Area and Price Per Sqm Inputs */}
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-gray-50">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqm)</label>
                            <input
                                type="number"
                                value={areaSqm}
                                onChange={(e) => setAreaSqm(e.target.value)}
                                placeholder="100"
                                min="0"
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price per sqm ($)</label>
                            <input
                                type="number"
                                value={pricePerSqm}
                                onChange={(e) => setPricePerSqm(e.target.value)}
                                placeholder="2000"
                                min="0"
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        
                        {/* READ-ONLY: Total Price based on inputs */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Calculated Total Price ($)</label>
                            <input
                                type="text"
                                value={totalPrice.toLocaleString()}
                                readOnly
                                className="w-full p-3 border border-indigo-400 bg-indigo-50 font-bold rounded-lg shadow-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                This is automatically calculated: {Number(areaSqm).toLocaleString()} sqm &times; ${Number(pricePerSqm).toLocaleString()}/sqm.
                            </p>
                        </div>
                    </div>
                
                    {isEngaged && (
                        <div className="space-y-4 border p-4 rounded-xl bg-gray-50">
                            <h3 className="text-lg font-bold text-indigo-700">Client & Payment Details</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Enter Client Name"
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            {/* --- Financial Summary --- */}
                            <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium border-t pt-3 mt-4">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <span className="text-xs text-green-700 block">PAID</span>
                                    <span className="text-lg font-extrabold text-green-800">${amountPaid.toLocaleString()}</span>
                                </div>
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <span className="text-xs text-red-700 block">REMAINING</span>
                                    <span className="text-lg font-extrabold text-red-800">${remainingAmount.toLocaleString()}</span>
                                </div>
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <span className="text-xs text-indigo-700 block">SCHEDULED TOTAL</span>
                                    <span className="text-lg font-extrabold text-indigo-800">${totalScheduled.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* --- Installment Payment Schedule --- */}
                            <h3 className="text-lg font-bold text-indigo-700 pt-4 border-t">Installment Payment Schedule ({sortedSchedule.length})</h3>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {sortedSchedule.length === 0 ? (
                                    <p className="text-gray-500 italic text-center">No installments scheduled yet.</p>
                                ) : (
                                    sortedSchedule.map((item, index) => (
                                        <div key={item.id} className={`p-3 border rounded-lg flex flex-col md:flex-row items-start md:items-center gap-3 transition-colors ${item.status === 'Paid' ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                                            
                                            <div className="flex-1 min-w-0 w-full md:w-auto">
                                                <div className="flex gap-2 mb-1">
                                                    <input
                                                        type="number"
                                                        value={item.amount}
                                                        onChange={(e) => handleUpdateInstallment(item.id, 'amount', e.target.value)}
                                                        className="w-2/5 p-1 border rounded text-sm font-semibold"
                                                        min="1"
                                                        disabled={item.status === 'Paid'}
                                                    />
                                                    <input
                                                        type="date"
                                                        value={item.dueDate}
                                                        onChange={(e) => handleUpdateInstallment(item.id, 'dueDate', e.target.value)}
                                                        className="w-3/5 p-1 border rounded text-sm"
                                                        disabled={item.status === 'Paid'}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500">Installment #{index + 1}</p>
                                            </div>

                                            <div className="flex items-center space-x-3 w-full md:w-auto">
                                                {/* NEW: Reminder Toggle */}
                                                <label className={`flex items-center space-x-2 cursor-pointer transition-opacity ${item.status === 'Paid' ? 'opacity-50' : 'hover:opacity-80'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={item.reminderEnabled || false}
                                                        onChange={() => handleUpdateInstallment(item.id, 'reminderEnabled', null)} 
                                                        className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                                                        disabled={item.status === 'Paid'}
                                                    />
                                                    <span className="text-xs text-gray-700 font-medium">Set Reminder</span>
                                                </label>
                                                
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => handleUpdateInstallment(item.id, 'status', e.target.value)}
                                                    className={`p-1 text-xs font-semibold rounded-full border shadow-sm transition-colors w-24 text-center ${item.status === 'Paid' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Paid">Paid</option>
                                                </select>
                                                
                                                <button 
                                                    onClick={() => handleRemoveInstallment(item.id)}
                                                    className="text-red-500 hover:text-red-700 transition p-1 flex-shrink-0"
                                                    title="Remove installment"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* --- Add New Installment Form --- (COMPLETED) */}
                            <div className="mt-4 p-3 border-t pt-3 flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                                    <input
                                        type="number"
                                        value={newInstallment.amount}
                                        onChange={(e) => setNewInstallment({ ...newInstallment, amount: e.target.value })}
                                        placeholder="20000"
                                        min="1"
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={newInstallment.date}
                                        onChange={(e) => setNewInstallment({ ...newInstallment, date: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <button
                                    onClick={handleAddInstallment}
                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Modal Actions --- */}
                <div className="mt-8 pt-4 border-t flex justify-between items-center">
                    <button
                        onClick={closeModal}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:bg-green-400"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Reminder Banner Component ---
const ReminderBanner = ({ reminder }) => {
    if (!reminder) return null;

    const formattedDate = new Date(reminder.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
    
    // Choose color based on days remaining
    let bgClass = 'bg-indigo-600';
    let icon = `<svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    if (reminder.daysRemaining === 'OVERDUE' || reminder.daysRemaining < 0) {
        bgClass = 'bg-red-600';
        icon = `<svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else if (reminder.daysRemaining <= 7) {
        bgClass = 'bg-yellow-600';
        icon = `<svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 3h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    }


    const daysText = reminder.daysRemaining === 'OVERDUE' 
        ? 'OVERDUE!' 
        : reminder.daysRemaining === 0 
        ? 'DUE TODAY!'
        : `in ${reminder.daysRemaining} days`;

    return (
        <div className={`p-3 rounded-xl mb-6 shadow-xl text-white font-semibold flex items-center justify-between ${bgClass}`}>
            <div className="flex items-center">
                <div dangerouslySetInnerHTML={{ __html: icon }} className="flex-shrink-0"></div>
                <span className="text-lg">
                    **Active Reminder:** Payment for **Unit {reminder.unitId}** ({reminder.floorName}) is **${reminder.amount.toLocaleString()}** due on {formattedDate}.
                </span>
            </div>
            <span className="text-2xl font-extrabold px-4 py-1 rounded-full bg-white bg-opacity-20 flex-shrink-0">
                {daysText}
            </span>
        </div>
    );
};

// --- Notification Popover Component (NEW) ---
const NotificationPopover = ({ reminders, onClose, onUnitSelect }) => {
    return (
        <div className="absolute right-0 top-12 mt-2 w-80 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-50 transition-all transform origin-top-right">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-indigo-700">Payment Reminders</h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">
                    {reminders.length} Active
                </span>
            </div>
            <div className="py-2 max-h-96 overflow-y-auto">
                {reminders.length === 0 ? (
                    <p className="text-gray-500 text-sm p-4 text-center">No active reminders.</p>
                ) : (
                    reminders.map((r, index) => (
                        <div 
                            key={index} 
                            className="px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer" 
                            onClick={() => {
                                onClose();
                                onUnitSelect(r.unitDocId); // Pass the full unit Doc ID
                            }}
                        >
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-800">Unit {r.unitId} - {r.floorName}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.daysRemaining <= 7 ? 'bg-yellow-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {r.daysRemaining === 0 ? 'Due Today' : `${r.daysRemaining} days`}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                <span className="font-bold">${r.amount.toLocaleString()}</span> due on {new Date(r.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    ))
                )}
            </div>
            <div className="p-2 border-t text-center">
                <button onClick={onClose} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Close
                </button>
            </div>
        </div>
    );
};

// --- Editable Title Component ---
const EditableTitle = ({ initialTitle, db, userId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draftTitle, setDraftTitle] = useState(initialTitle);
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Update draft title if initialTitle changes from Firestore
    useEffect(() => {
        setDraftTitle(initialTitle);
    }, [initialTitle]);

    const handleSave = async () => {
        const trimmedTitle = draftTitle.trim();
        if (!db || !userId || trimmedTitle === initialTitle || trimmedTitle === '') {
            setIsEditing(false);
            setDraftTitle(initialTitle); // Revert if empty or unchanged
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        
        try {
            const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
            await updateDoc(settingsRef, {
                appName: trimmedTitle,
                lastUpdated: Timestamp.now(),
                updatedBy: userId
            });
            setIsEditing(false);
        } catch (e) {
            console.error('Error updating app name:', e);
            setSaveError('Failed to save name. Check the console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        className="text-3xl font-extrabold text-indigo-800 p-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto min-w-40"
                        disabled={isSaving}
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400"
                        title="Save Name"
                    >
                        {isSaving ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        )}
                    </button>
                    <button
                        onClick={() => { setIsEditing(false); setDraftTitle(initialTitle); setSaveError(null); }}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        disabled={isSaving}
                        title="Cancel Edit"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                {saveError && <p className="text-red-500 text-sm mt-1">{saveError}</p>}
            </div>
        );
    }

    return (
        <h1 
            className="text-3xl font-extrabold text-indigo-800 cursor-pointer hover:underline flex items-center group" 
            onClick={() => setIsEditing(true)}
            title="Click to edit application name"
        >
            {initialTitle}
            <svg className="w-5 h-5 ml-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        </h1>
    );
};

// --- Main Application Component ---
export default function App() {
    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Data state
    const [units, setUnits] = useState([]); // Flat array of all units
    const [totalFloors, setTotalFloors] = useState(DEFAULT_INITIAL_FLOORS); // From settings
    const [appName, setAppName] = useState('Real Estate Sales Tracker');
    const [appLogoType, setAppLogoType] = useState('icon'); 
    const [appLogoSource, setAppLogoSource] = useState('Building'); 
    
    // Reminder state
    const [nextReminder, setNextReminder] = useState(null); // Used for the banner (earliest one)
    const [allReminders, setAllReminders] = useState([]); // NEW: Used for the notification popover
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI state
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showLogoModal, setShowLogoModal] = useState(false); 
    const [showNotifications, setShowNotifications] = useState(false); // NEW: To toggle popover

    // --- 1. Initialize Firebase and Auth ---
    useEffect(() => {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
            setError("Firebase config is missing.");
            setLoading(false);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);

            // Enable debug logging for Firestore
            setLogLevel('debug'); 

            setDb(dbInstance);
            setAuth(authInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    console.log("User is signed in with UID:", user.uid);
                    setUserId(user.uid);
                } else {
                    console.log("No user signed in, attempting auth...");
                    try {
                        if (initialAuthToken) {
                            console.log("Signing in with custom token...");
                            await signInWithCustomToken(authInstance, initialAuthToken);
                        } else {
                            console.log("Signing in anonymously...");
                            await signInAnonymously(authInstance);
                        }
                    } catch (authError) {
                        console.error("Authentication error:", authError);
                        setError(authError.message);
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();

        } catch (e) {
            console.error("Error initializing Firebase:", e);
            setError(e.message);
            setLoading(false);
        }
    }, []);

    // --- 2. Firestore Listeners ---
    useEffect(() => {
        if (!isAuthReady || !db || !userId) {
            // Wait for auth to be ready
            return;
        }

        setLoading(true);
        console.log("Auth ready, setting up Firestore listeners...");

        // --- Listener for Global Settings (like totalFloors and appName/logo) ---
        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
        const settingsUnsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                console.log("Global settings loaded:", data);
                setTotalFloors(data.totalFloors || DEFAULT_INITIAL_FLOORS);
                setAppName(data.appName || 'Real Estate Sales Tracker');
                setAppLogoType(data.appLogoType || 'icon'); 
                setAppLogoSource(data.appLogoSource || 'Building'); 
            } else {
                // First time run! Initialize the building.
                console.log("No global settings found. Initializing building...");
                initializeBuilding(db, userId);
            }
        }, (err) => {
            console.error("Error listening to settings:", err);
            setError(err.message);
        });

        // --- Listener for all Units ---
        const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
        
        // MODIFICATION: Removed orderBy clauses to prevent index error.
        const q = query(unitsRef);

        const unitsUnsubscribe = onSnapshot(q, (snapshot) => {
            let unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // MODIFICATION: Sort the data in JavaScript instead of in the query
            unitsData.sort((a, b) => {
                if (a.floor !== b.floor) {
                    return a.floor - b.floor; // Sort by floor number
                }
                return a.unitId.localeCompare(b.unitId); // Then sort by unitId
            });
            
            console.log(`Units listener updated. Loaded ${unitsData.length} units.`);
            setUnits(unitsData);
            setLoading(false);
        }, (err) => {
            console.error("Error listening to units:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => {
            console.log("Cleaning up listeners...");
            settingsUnsubscribe();
            unitsUnsubscribe();
        };

    }, [isAuthReady, db, auth, userId]); // Re-run when auth is ready

    // --- 3. First-Time Building Initialization Function ---
    const initializeBuilding = async (db, currentUserId) => {
        setLoading(true);
        setError(null);
        console.log(`Starting initial build for ${DEFAULT_INITIAL_FLOORS} floors...`);
        try {
            const batch = writeBatch(db);

            // 1. Create the global settings doc
            const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
            batch.set(settingsRef, {
                totalFloors: DEFAULT_INITIAL_FLOORS,
                appName: 'Real Estate Sales Tracker',
                appLogoType: 'icon', 
                appLogoSource: 'Building', 
                createdAt: Timestamp.now(),
                updatedBy: currentUserId
            });

            // 2. Create units for all floors
            const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
            for (let floor = 1; floor <= DEFAULT_INITIAL_FLOORS; floor++) {
                for (const unitId of DEFAULT_UNIT_TYPES) {
                    const unitData = createUnitData(floor, unitId);
                    const unitDocRef = doc(unitsRef, unitData.id);
                    batch.set(unitDocRef, unitData);
                }
            }
            
            await batch.commit();
            console.log("Initial building created successfully.");
        } catch (e) {
            console.error("Error initializing building:", e);
            setError(`Failed to initialize building: ${e.message}`);
        }
        setLoading(false);
    };


    // --- 4. Memoized Data Transformations & Reminders Update ---

    // Group the flat 'units' array into an object keyed by 'floorName'
    const floors = useMemo(() => {
        console.log("Memo: Grouping units by floor...");
        const grouped = units.reduce((acc, unit) => {
            const floorName = unit.floorName;
            if (!acc[floorName]) {
                acc[floorName] = [];
            }
            acc[floorName].push(unit);
            return acc;
        }, {});
        
        // Ensure floors are sorted numerically, not alphabetically
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            // Extracts the number from the floor name string (e.g., '1st Floor' -> 1)
            const floorA = parseInt(a);
            const floorB = parseInt(b);
            return floorA - floorB;
        });
        
        const sortedGrouped = {};
        for(const key of sortedKeys){
            sortedGrouped[key] = grouped[key];
        }
        return sortedGrouped;

    }, [units]);
    
    // Calculate dashboard stats
    const stats = useMemo(() => {
        console.log("Memo: Calculating stats...");
        const totalUnits = units.length;
        let unitsAvailable = 0;
        let unitsHeld = 0;
        let unitsSold = 0;
        let totalSalesValue = 0;
        let totalCollected = 0;

        for (const unit of units) {
            if (unit.status === 'Available') {
                unitsAvailable++;
            } else if (unit.status === 'Held') {
                unitsHeld++;
            } else if (unit.status === 'Sold') {
                unitsSold++;
            }

            if (unit.status === 'Held' || unit.status === 'Sold') {
                totalSalesValue += unit.totalPrice || 0;
                totalCollected += unit.amountPaid || 0;
            }
        }

        return {
            totalUnits,
            unitsAvailable,
            unitsHeld,
            unitsSold,
            totalSalesValue,
            totalCollected,
        };
    }, [units]);

    // Update reminders whenever units change
    useEffect(() => {
        if (units.length > 0) {
            const reminders = findAllActiveReminders(units);
            setAllReminders(reminders);
            
            // Keep nextReminder for the banner (earliest one)
            setNextReminder(reminders.length > 0 ? reminders[0] : null);
        } else {
             setAllReminders([]);
             setNextReminder(null);
        }
    }, [units]);


    // --- 5. UI Event Handlers ---
    const handleUnitClick = (unit) => {
        setSelectedUnit(unit);
        setShowEditModal(true);
    };
    
    // Handler for clicking a reminder in the popover
    const handleNotificationClick = (unitDocId) => {
        // Find the full unit object from the flat 'units' array using the Firestore Document ID
        const unit = units.find(u => u.id === unitDocId);
        if (unit) {
            setSelectedUnit(unit);
            setShowEditModal(true);
        } else {
            console.error("Unit not found for ID:", unitDocId);
        }
    };

    const handleCloseModal = () => {
        setShowEditModal(false);
        setSelectedUnit(null);
    };
    
    const handleShowManageModal = () => {
        setShowManageModal(true);
    };

    const handleShowLogoModal = () => {
        setShowLogoModal(true);
    };
    
    const handleCloseLogoModal = () => {
        setShowLogoModal(false);
    };

    // --- 6. Helper Functions for Rendering ---
    const getUnitStatusColor = (status) => {
        switch (status) {
            case 'Available':
                return 'bg-green-100 border-green-500 text-green-700';
            case 'Held':
                return 'bg-yellow-100 border-yellow-500 text-yellow-700';
            case 'Sold':
                return 'bg-red-100 border-red-500 text-red-700';
            default:
                return 'bg-gray-100 border-gray-400 text-gray-700';
        }
    };
    
    // --- 7. Main Render ---
    if (loading && units.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading Building Data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="p-6 bg-red-100 border border-red-400 rounded-lg">
                    <h3 className="text-xl font-bold text-red-700">An Error Occurred</h3>
                    <p className="text-red-600 mt-2">{error}</p>
                    <p className="text-sm text-gray-600 mt-4">Please check the console and refresh the page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-inter">
            {/* --- Modals --- */}
            {showEditModal && selectedUnit && (
                <EditModal
                    unit={selectedUnit}
                    closeModal={handleCloseModal}
                    db={db}
                    userId={userId}
                />
            )}
            
            {showManageModal && (
                <FloorAndUnitManagerModal
                    closeModal={() => setShowManageModal(false)}
                    db={db}
                    totalFloors={totalFloors}
                    setTotalFloors={setTotalFloors} // Note: this is for local state, listener will confirm
                    floors={floors}
                    userId={userId}
                />
            )}
            
            {showLogoModal && (
                <LogoEditModal
                    closeModal={handleCloseLogoModal}
                    db={db}
                    userId={userId}
                    currentLogoType={appLogoType}
                    currentLogoSource={appLogoSource}
                />
            )}

            {/* --- Header --- */}
            <header className="mb-6 p-4 bg-white rounded-xl shadow-md border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between md:items-start">
                    
                    {/* Logo and Editable Title Group (Left) */}
                    <div className="flex items-start space-x-4 mb-4 md:mb-0">
                        {/* Logo Area */}
                        <div 
                            className="p-3 bg-indigo-500 rounded-xl text-white cursor-pointer hover:bg-indigo-600 transition shadow-lg flex-shrink-0"
                            onClick={handleShowLogoModal}
                            title="Click to change application logo"
                        >
                            <LogoDisplay 
                                logoType={appLogoType} 
                                logoSource={appLogoSource} 
                                size={30} 
                                className="text-white" 
                            />
                        </div>
                        
                        {/* Title and Info */}
                        <div>
                            <EditableTitle initialTitle={appName} db={db} userId={userId} />
                            <p className="text-sm text-gray-500 mt-1">App ID: {appId}</p>
                            <p className="text-sm text-gray-500">User ID: {userId}</p>
                        </div>
                    </div>
                    
                    {/* Actions and Notifications (Right) */}
                    <div className="flex items-center space-x-4">
                        {/* Notification Bell (NEW) */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition relative"
                                title="View Payment Reminders"
                            >
                                <div dangerouslySetInnerHTML={{ __html: ICON_SVGS.Bell }} className="w-6 h-6 text-gray-700" />
                                {allReminders.length > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                                        {allReminders.length}
                                    </span>
                                )}
                            </button>
                            {showNotifications && (
                                <NotificationPopover 
                                    reminders={allReminders} 
                                    onClose={() => setShowNotifications(false)} 
                                    onUnitSelect={handleNotificationClick} 
                                />
                            )}
                        </div>
                        {/* Manage Button */}
                        <button
                            onClick={handleShowManageModal}
                            className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex-shrink-0"
                        >
                            Manage Building Structure
                        </button>
                    </div>
                </div>
            </header>
            
            {/* --- REMINDER BANNER (Shows the earliest reminder) --- */}
            <ReminderBanner reminder={nextReminder} />

            {/* --- Stats Dashboard --- */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <StatCard title="Total Sales Value" value={`$${stats.totalSalesValue.toLocaleString()}`} color="indigo" />
                <StatCard title="Total Collected" value={`$${stats.totalCollected.toLocaleString()}`} color="green" />
                <StatCard title="Available" value={stats.unitsAvailable} color="green" />
                <StatCard title="Held" value={stats.unitsHeld} color="yellow" />
                <StatCard title="Sold" value={stats.unitsSold} color="red" />
            </div>

            {/* --- Main Building View --- */}
            <div className="space-y-6">
                {Object.keys(floors).length === 0 && !loading && (
                    <div className="p-6 bg-white rounded-lg shadow text-center text-gray-500">
                        No units found for this building. Try the 'Manage Building Structure' button to add floors.
                    </div>
                )}

                {Object.keys(floors).map(floorName => (
                    <div key={floorName} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">{floorName}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {floors[floorName].map(unit => (
                                <UnitCard
                                    key={unit.id}
                                    unit={unit}
                                    onClick={handleUnitClick}
                                    getColor={getUnitStatusColor}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Sub-Components ---

const StatCard = ({ title, value, color }) => {
    const colors = {
        indigo: 'bg-indigo-600',
        green: 'bg-green-600',
        yellow: 'bg-yellow-500',
        red: 'bg-red-600',
    };
    return (
        <div className={`p-4 rounded-xl shadow-lg text-white ${colors[color] || 'bg-gray-600'}`}>
            <div className="text-sm font-medium uppercase opacity-80">{title}</div>
            <div className="text-3xl font-extrabold">{value}</div>
        </div>
    );
};

const UnitCard = ({ unit, onClick, getColor }) => {
    const colorClasses = getColor(unit.status);
    
    return (
        <button
            onClick={() => onClick(unit)}
            className={`p-3 rounded-lg border-2 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 ${colorClasses} text-left`}
        >
            <div className="flex justify-between items-center">
                <span className="text-lg font-extrabold">{unit.unitId}</span>
                <span className="text-xs font-semibold opacity-80">{unit.beds} Beds</span>
            </div>
            <div className="mt-2 text-xs font-semibold uppercase">{unit.status}</div>
            <div className="text-xs truncate opacity-70 mt-1 h-4">
                {unit.clientName || `${unit.areaSqm} sqm @ $${unit.pricePerSqm.toLocaleString()}/sqm`}
            </div>
        </button>
    );
};