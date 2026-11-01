import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { useDatabase } from './hooks/useDatabase';

// Pages
import Home from './pages/Home';
import Medicines from './pages/Medicines';
import AddMedicine from './pages/AddMedicine';
import ScanPrescription from './pages/ScanPrescription';
import Family from './pages/Family';
import History from './pages/History';
import Settings from './pages/Settings';

// Components
import BottomNav from './components/BottomNav';
import AlarmScreen from './components/AlarmScreen';

// ── Inner app that has access to router context ──────────────
function AppInner() {
  const location = useLocation();
  const { activeAlarm, settings, initialized, setInitialized } = useAppStore();
  const { error: dbError } = useDatabase();

  const showAlarm = location.pathname === '/alarm' || activeAlarm !== null;
  const hideNav = location.pathname === '/alarm' || activeAlarm !== null;

  // Seed a default "Self" family member on first launch
  useEffect(() => {
    if (!initialized) {
      const { familyMembers, addFamilyMember } = useAppStore.getState();
      if (familyMembers.length === 0) {
        addFamilyMember({
          id: 'self',
          name: 'Me',
          relation: 'self',
          color: '#0d9488',
          createdAt: new Date().toISOString(),
        });
        useAppStore.getState().setCurrentFamilyMember('self');
      }
      setInitialized(true);
    }
  }, [initialized, setInitialized]);

  // Apply dark mode
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Listen for web alarm events (dev mode fallback)
  useEffect(() => {
    const handleWebAlarm = (e: CustomEvent) => {
      const { setActiveAlarm } = useAppStore.getState();
      const d = e.detail;
      setActiveAlarm({
        alarmId: d.alarmId,
        medicineId: d.medicineId,
        medicineName: d.medicineName,
        familyMemberId: d.familyMemberId ?? 'self',
        familyMemberName: d.familyMemberName,
        scheduledTime: new Date().toISOString(),
        dose: d.dose,
        doseUnit: '',
        instruction: d.instructions,
        snoozeDuration: d.snoozeDuration ?? 10,
        vibrationEnabled: true,
      });
    };

    // Listen for native lock-screen alarm actions
    const handleNativeAction = (e: CustomEvent) => {
      const { action, medicineId } = e.detail;
      const { medicines, updateMedicine, addDoseRecord } = useAppStore.getState();
      const med = medicines.find((m) => m.id === medicineId);
      if (med) {
        const now = new Date().toISOString();
        if (action === 'taken') {
          addDoseRecord({
            id: 'dose_' + Date.now(),
            medicineId: med.id,
            medicineName: med.name,
            familyMemberId: med.familyMemberId,
            scheduledTime: now,
            actualTime: now,
            status: 'taken',
            dose: med.dose,
            doseUnit: med.doseUnit,
            createdAt: now,
          });
          if (med.currentStock != null) {
            updateMedicine(med.id, {
              currentStock: Math.max(0, med.currentStock - med.dose),
            });
          }
        } else if (action === 'skipped') {
          addDoseRecord({
            id: 'dose_' + Date.now(),
            medicineId: med.id,
            medicineName: med.name,
            familyMemberId: med.familyMemberId,
            scheduledTime: now,
            actualTime: now,
            status: 'skipped',
            dose: med.dose,
            doseUnit: med.doseUnit,
            createdAt: now,
          });
        }
      }
    };

    window.addEventListener('meditime:alarm', handleWebAlarm as EventListener);
    window.addEventListener('meditime:native_action', handleNativeAction as EventListener);
    return () => {
      window.removeEventListener('meditime:alarm', handleWebAlarm as EventListener);
      window.removeEventListener('meditime:native_action', handleNativeAction as EventListener);
    };
  }, []);

  return (
    <div className={`relative flex flex-col h-full bg-primary-50 dark:bg-primary-950 ${settings.darkMode ? 'dark' : ''}`}>
      {/* Full-screen alarm overlay */}
      {activeAlarm && <AlarmScreen />}

      {/* Normal page routes */}
      {!activeAlarm && (
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/"               element={<Home />} />
            <Route path="/medicines"      element={<Medicines />} />
            <Route path="/add-medicine"   element={<AddMedicine />} />
            <Route path="/add-medicine/:id" element={<AddMedicine />} />
            <Route path="/scan"           element={<ScanPrescription />} />
            <Route path="/family"         element={<Family />} />
            <Route path="/history"        element={<History />} />
            <Route path="/settings"       element={<Settings />} />
          </Routes>
        </main>
      )}

      {/* Bottom navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
